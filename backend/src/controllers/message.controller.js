const catchAsyncError = require("../middlewares/catchAsyncError");
const { ErrorHandler } = require("../middlewares/errorMiddleware");
const conversationModel = require("../models/conversation.model");
const messageModel = require("../models/message.model");
const userModel = require("../models/user.model");
const notificationModel = require("../models/notification.model");
const { isUserOnline } = require("../utils/socket");

// ═══════════════════════════════════════════════════════════
//  GET ALL USERS (for chat sidebar)
// ═══════════════════════════════════════════════════════════
const getAllUsers = catchAsyncError(async (req, res, next) => {
  const user = req.user;

  // Exclude current user from the list explicitly
  const allUsers = await userModel
    .find({ _id: { $ne: user._id } })
    .select("-password -verificationCode -verificationCodeExpire -resetPasswordToken -resetPasswordExpire");

  res.status(200).json({
    success: true,
    message: "All Users Fetched Successfully",
    totalUsers: allUsers.length,
    users: allUsers,
  });
});

// ═══════════════════════════════════════════════════════════
//  GET MESSAGES (between two users via conversation)
// ═══════════════════════════════════════════════════════════
const getMessages = catchAsyncError(async (req, res, next) => {
  const receiverId = req.params.id;
  const senderId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  if (!receiverId) {
    return next(new ErrorHandler("Receiver id is invalid.", 400));
  }

  // Find the conversation between these two users
  const conversation = await conversationModel.findOne({
    participants: { $all: [senderId, receiverId] },
    isGroup: false,
  });

  // No conversation yet — return empty array
  if (!conversation) {
    return res.status(200).json({
      success: true,
      messages: [],
      currentPage: page,
      totalPages: 0,
      hasMore: false,
    });
  }

  // Get total count for pagination info
  const totalMessages = await messageModel.countDocuments({ conversationId: conversation._id });
  const totalPages = Math.ceil(totalMessages / limit);

  // Fetch messages by conversationId and populate sender info
  // Sort by -1 to get the most recent messages for the requested page
  const messages = await messageModel
    .find({ conversationId: conversation._id })
    .populate("sender", "username avatar")
    .populate("reactions.user", "username avatar")
    .populate("replyTo", "message sender")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    messages: messages.reverse(), // Reverse to send them in chronological order for the frontend
    currentPage: page,
    totalPages,
    hasMore: page < totalPages,
  });
});

// ═══════════════════════════════════════════════════════════
//  SEND MESSAGE (text + media + file)
// ═══════════════════════════════════════════════════════════
const sendMessages = catchAsyncError(async (req, res, next) => {
  const senderId = req.user._id;
  const { receiverId, message, isEncrypted, replyTo } = req.body;

  if (!receiverId) {
    return next(new ErrorHandler("Receiver id is required", 400));
  }

  // Check for blocks — Feature 11
  const receiver = await userModel.findById(receiverId);
  if (!receiver) return next(new ErrorHandler("Receiver not found", 404));

  const sender = await userModel.findById(senderId);

  if (receiver.blockedUsers && receiver.blockedUsers.includes(senderId)) {
    return next(new ErrorHandler("You are blocked by this user", 403));
  }
  if (sender.blockedUsers && sender.blockedUsers.includes(receiverId)) {
    return next(new ErrorHandler("You have blocked this user. Unblock to send messages.", 403));
  }

  // Atomically find or create the conversation to prevent race condition duplicates
  let conversation = await conversationModel.findOneAndUpdate(
    {
      isGroup: false,
      participants: { $all: [senderId, receiverId], $size: 2 },
    },
    {
      $setOnInsert: { participants: [senderId, receiverId], isGroup: false },
    },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );

  let mediaData = {};
  let fileData = {};

  // If media/file uploaded
  if (req.file) {
    const mimetype = req.file.mimetype;

    if (
      mimetype.startsWith("image") ||
      mimetype.startsWith("video") ||
      mimetype.startsWith("audio")
    ) {
      mediaData = {
        url: `/uploads/${req.file.filename}`,
        type: mimetype.startsWith("image")
          ? "image"
          : mimetype.startsWith("video")
            ? "video"
            : "audio",
      };
    } else {
      // It's a file (PDF, doc, zip, etc.) — Feature 7
      fileData = {
        url: `/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: mimetype,
      };
      mediaData = { url: `/uploads/${req.file.filename}`, type: "file" };
    }
  }

  // Create message
  const newMessage = await messageModel.create({
    conversationId: conversation._id,
    sender: senderId,
    message: message || "",
    media: mediaData,
    file: fileData,
    isEncrypted: isEncrypted === "true" || isEncrypted === true,
    replyTo: replyTo || undefined,
  });

  // Update last message
  conversation.lastMessage = newMessage._id;
  await conversation.save();

  // Populate sender info
  const populatedMessage = await messageModel
    .findById(newMessage._id)
    .populate("sender", "username avatar")
    .populate("replyTo", "message sender");

  // Emit real-time message
  if (global.io) {
    if (isUserOnline(receiverId.toString())) {
      global.io
        .to(receiverId.toString())
        .emit("receiveMessage", populatedMessage);
      
      // Also emit a push/in-app notification event
      global.io
        .to(receiverId.toString())
        .emit("newNotification", {
          sender: req.user.username,
          content: message ? message.substring(0, 50) : "Attachment",
          type: "new_message"
        });
    } else {
      // Offline: store notification
      await notificationModel.create({
        recipient: receiverId,
        sender: senderId,
        type: "new_message",
        content: message ? message.substring(0, 50) : "Sent an attachment",
        conversationId: conversation._id
      });
    }

    // Always emit back to sender for their own UI update
    global.io
      .to(senderId.toString())
      .emit("receiveMessage", populatedMessage);
  }

  res.status(201).json({
    success: true,
    message: "Message sent successfully",
    data: populatedMessage,
  });
});

// ═══════════════════════════════════════════════════════════
//  ADD REACTION — Feature 2
// ═══════════════════════════════════════════════════════════
const addReaction = catchAsyncError(async (req, res, next) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user._id;

  if (!emoji) {
    return next(new ErrorHandler("Emoji is required", 400));
  }

  const msg = await messageModel.findById(messageId);
  if (!msg) return next(new ErrorHandler("Message not found", 404));

  // Remove existing reaction from this user (toggle behavior)
  msg.reactions = msg.reactions.filter(
    (r) => r.user.toString() !== userId.toString()
  );

  // Add new reaction
  msg.reactions.push({ user: userId, emoji });
  await msg.save();

  const populatedMsg = await messageModel
    .findById(messageId)
    .populate("reactions.user", "username avatar");

  // Broadcast reaction update
  if (global.io) {
    const conv = await conversationModel.findById(msg.conversationId);
    if (conv) {
      conv.participants.forEach((pId) => {
        global.io.to(pId.toString()).emit("reactionUpdated", {
          messageId,
          reactions: populatedMsg.reactions,
        });
      });
    }
  }

  res.status(200).json({
    success: true,
    message: "Reaction added",
    reactions: populatedMsg.reactions,
  });
});

// ═══════════════════════════════════════════════════════════
//  REMOVE REACTION — Feature 2
// ═══════════════════════════════════════════════════════════
const removeReaction = catchAsyncError(async (req, res, next) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const msg = await messageModel.findById(messageId);
  if (!msg) return next(new ErrorHandler("Message not found", 404));

  msg.reactions = msg.reactions.filter(
    (r) => r.user.toString() !== userId.toString()
  );
  await msg.save();

  if (global.io) {
    const conv = await conversationModel.findById(msg.conversationId);
    if (conv) {
      conv.participants.forEach((pId) => {
        global.io.to(pId.toString()).emit("reactionUpdated", {
          messageId,
          reactions: msg.reactions,
        });
      });
    }
  }

  res.status(200).json({
    success: true,
    message: "Reaction removed",
    reactions: msg.reactions,
  });
});

// ═══════════════════════════════════════════════════════════
//  EDIT MESSAGE — Feature 3
// ═══════════════════════════════════════════════════════════
const editMessage = catchAsyncError(async (req, res, next) => {
  const { messageId } = req.params;
  const { message } = req.body;
  const userId = req.user._id;

  const msg = await messageModel.findById(messageId);
  if (!msg) return next(new ErrorHandler("Message not found", 404));

  // Only the sender can edit their own message
  if (msg.sender.toString() !== userId.toString()) {
    return next(new ErrorHandler("You can only edit your own messages", 403));
  }

  if (msg.isDeleted) {
    return next(new ErrorHandler("Cannot edit a deleted message", 400));
  }

  msg.message = message;
  msg.isEdited = true;
  msg.editedAt = new Date();
  await msg.save();

  const populatedMsg = await messageModel
    .findById(messageId)
    .populate("sender", "username avatar");

  // Broadcast edit
  if (global.io) {
    const conv = await conversationModel.findById(msg.conversationId);
    if (conv) {
      conv.participants.forEach((pId) => {
        global.io.to(pId.toString()).emit("messageEdited", populatedMsg);
      });
    }
  }

  res.status(200).json({
    success: true,
    message: "Message edited successfully",
    data: populatedMsg,
  });
});

// ═══════════════════════════════════════════════════════════
//  DELETE MESSAGE — Feature 3
// ═══════════════════════════════════════════════════════════
const deleteMessage = catchAsyncError(async (req, res, next) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const msg = await messageModel.findById(messageId);
  if (!msg) return next(new ErrorHandler("Message not found", 404));

  // Only the sender can delete their own message
  if (msg.sender.toString() !== userId.toString()) {
    return next(new ErrorHandler("You can only delete your own messages", 403));
  }

  // Soft delete — keep the record but clear content
  msg.message = "This message was deleted";
  msg.isDeleted = true;
  msg.deletedAt = new Date();
  msg.media = { url: "", type: undefined };
  msg.file = { url: "", originalName: "", size: 0, mimeType: "" };
  msg.reactions = [];
  await msg.save();

  // Broadcast deletion
  if (global.io) {
    const conv = await conversationModel.findById(msg.conversationId);
    if (conv) {
      conv.participants.forEach((pId) => {
        global.io.to(pId.toString()).emit("messageDeleted", {
          messageId,
          conversationId: msg.conversationId,
        });
      });
    }
  }

  res.status(200).json({
    success: true,
    message: "Message deleted successfully",
  });
});

// ═══════════════════════════════════════════════════════════
//  MARK MESSAGES AS READ — Feature 1
// ═══════════════════════════════════════════════════════════
const markAsRead = catchAsyncError(async (req, res, next) => {
  const { conversationId } = req.params;
  const userId = req.user._id;

  // Update all unread messages in this conversation from other users
  const result = await messageModel.updateMany(
    {
      conversationId,
      sender: { $ne: userId },
      "seenBy.user": { $ne: userId },
    },
    {
      $push: { seenBy: { user: userId, seenAt: new Date() } },
    }
  );

  // Notify senders about read receipt
  if (global.io && result.modifiedCount > 0) {
    const conv = await conversationModel.findById(conversationId);
    if (conv) {
      conv.participants.forEach((pId) => {
        global.io.to(pId.toString()).emit("messagesRead", {
          conversationId,
          readBy: userId,
          readAt: new Date(),
        });
      });
    }
  }

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} messages marked as read`,
  });
});

// ═══════════════════════════════════════════════════════════
//  SEARCH MESSAGES — Feature 9
// ═══════════════════════════════════════════════════════════
const searchMessages = catchAsyncError(async (req, res, next) => {
  const { query, conversationId, hasMedia } = req.query;

  if (!conversationId) {
    return next(new ErrorHandler("Conversation ID is required for searching", 400));
  }

  if ((!query || query.trim().length === 0) && hasMedia !== "true") {
    return next(new ErrorHandler("Search query or hasMedia flag is required", 400));
  }

  const searchFilter = {
    conversationId,
    isDeleted: { $ne: true },
  };

  const sortOptions = {};
  const projection = {};

  if (query && query.trim().length > 0) {
    searchFilter.$text = { $search: query };
    sortOptions.score = { $meta: "textScore" };
    projection.score = { $meta: "textScore" };
  } else if (hasMedia === "true") {
    searchFilter["media.url"] = { $ne: "" };
    sortOptions.createdAt = -1;
  }

  const messages = await messageModel
    .find(searchFilter, projection)
    .populate("sender", "username avatar")
    .sort(sortOptions)
    .limit(50);

  // Map results to the requested format
  const results = messages.map(msg => ({
    messageId: msg._id,
    sender: msg.sender,
    message: msg.message,
    media: msg.media,
    createdAt: msg.createdAt,
    file: msg.file // Include file for completeness if it matched via name
  }));

  res.status(200).json({
    success: true,
    results,
  });
});

// ═══════════════════════════════════════════════════════════
//  PIN / UNPIN MESSAGE — Feature 9
// ═══════════════════════════════════════════════════════════
const togglePinMessage = catchAsyncError(async (req, res, next) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const msg = await messageModel.findById(messageId);
  if (!msg) return next(new ErrorHandler("Message not found", 404));

  msg.isPinned = !msg.isPinned;
  msg.pinnedBy = msg.isPinned ? userId : undefined;
  msg.pinnedAt = msg.isPinned ? new Date() : undefined;
  await msg.save();

  // Broadcast pin toggle
  if (global.io) {
    const conv = await conversationModel.findById(msg.conversationId);
    if (conv) {
      conv.participants.forEach((pId) => {
        global.io.to(pId.toString()).emit("messagePinToggled", {
          messageId,
          isPinned: msg.isPinned,
          pinnedBy: userId,
        });
      });
    }
  }

  res.status(200).json({
    success: true,
    message: msg.isPinned ? "Message pinned" : "Message unpinned",
  });
});

// ═══════════════════════════════════════════════════════════
//  GET PINNED MESSAGES — Feature 9
// ═══════════════════════════════════════════════════════════
const getPinnedMessages = catchAsyncError(async (req, res, next) => {
  const { conversationId } = req.params;

  const messages = await messageModel
    .find({ conversationId, isPinned: true })
    .populate("sender", "username avatar")
    .populate("pinnedBy", "username")
    .sort({ pinnedAt: -1 });

  res.status(200).json({
    success: true,
    count: messages.length,
    messages,
  });
});

// ═══════════════════════════════════════════════════════════
//  GET CONVERSATIONS LIST (sidebar)
// ═══════════════════════════════════════════════════════════
const getConversations = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;
  const { archived } = req.query;

  // Re-fetch user to get latest archived list
  const user = await userModel.findById(userId);
  const archivedList = user.archivedChats || [];

  const query = { participants: userId };
  if (archived === "true") {
    query._id = { $in: archivedList };
  } else {
    query._id = { $nin: archivedList };
  }

  const conversations = await conversationModel
    .find(query)
    .populate("participants", "username avatar isOnline lastSeen")
    .populate("lastMessage")
    .populate("groupAdmin", "username")
    .sort({ updatedAt: -1 });

  res.status(200).json({
    success: true,
    count: conversations.length,
    conversations,
  });
});

// ═══════════════════════════════════════════════════════════
//  FORWARD MESSAGE — creates a NEW message in the target conversation
//  Flow: find original → validate target → create copy → broadcast
// ═══════════════════════════════════════════════════════════
const forwardMessage = catchAsyncError(async (req, res, next) => {
  const { messageId } = req.params;
  const { receiverId, groupId } = req.body;
  const senderId = req.user._id;

  if (!receiverId && !groupId) {
    return next(new ErrorHandler("Receiver ID or Group ID is required", 400));
  }

  // 1. Find the original message
  const originalMessage = await messageModel.findById(messageId).populate("sender", "username avatar");
  if (!originalMessage) {
    return next(new ErrorHandler("Original message not found", 404));
  }

  // 2. Determine target conversation & validate membership
  let conversation;
  if (groupId) {
    // Forwarding to a group
    conversation = await conversationModel.findById(groupId);
    if (!conversation || !conversation.isGroup) {
      return next(new ErrorHandler("Group not found", 404));
    }
    // Check if sender is still a member
    if (!conversation.participants.some((p) => p.toString() === senderId.toString())) {
      return next(new ErrorHandler("You are no longer a member of this group. Cannot forward.", 403));
    }
  } else {
    // Forwarding to an individual user — find or create DM conversation
    
    // Check for blocks — Feature 11
    const receiver = await userModel.findById(receiverId);
    if (!receiver) return next(new ErrorHandler("Receiver not found", 404));
    
    const sender = await userModel.findById(senderId);

    if (receiver.blockedUsers && receiver.blockedUsers.includes(senderId)) {
      return next(new ErrorHandler("You are blocked by this user. Cannot forward.", 403));
    }
    if (sender.blockedUsers && sender.blockedUsers.includes(receiverId)) {
      return next(new ErrorHandler("You have blocked this user. Unblock to forward messages.", 403));
    }

    conversation = await conversationModel.findOneAndUpdate(
      {
        isGroup: false,
        participants: { $all: [senderId, receiverId], $size: 2 },
      },
      {
        $setOnInsert: { participants: [senderId, receiverId], isGroup: false },
      },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );
  }

  // 3. Create the forwarded message as a new document
  //    Preserves text, media, and file from the original
  const forwardedMessage = await messageModel.create({
    conversationId: conversation._id,
    sender: senderId,
    message: originalMessage.message,
    media: originalMessage.media,
    file: originalMessage.file,
    isForwarded: true,
    forwardedFrom: {
      userId: originalMessage.sender._id || originalMessage.sender,
      messageId: originalMessage._id,
    },
  });

  // 4. Update conversation's last message pointer
  conversation.lastMessage = forwardedMessage._id;
  await conversation.save();

  // 5. Populate sender and forwardedFrom info for broadcasting
  const populatedMessage = await messageModel
    .findById(forwardedMessage._id)
    .populate("sender", "username avatar")
    .populate("forwardedFrom.userId", "username avatar");

  // 6. Broadcast to all relevant receivers via Socket.IO
  if (global.io) {
    if (groupId) {
      // Emit to every group member
      conversation.participants.forEach((memberId) => {
        global.io.to(memberId.toString()).emit("receiveMessage", populatedMessage);
      });
    } else {
      // Emit to receiver and sender (for instant local update)
      global.io.to(receiverId.toString()).emit("receiveMessage", populatedMessage);
      global.io.to(senderId.toString()).emit("receiveMessage", populatedMessage);
    }
  }

  res.status(201).json({
    success: true,
    message: "Message forwarded successfully",
    data: populatedMessage,
  });
});

// ═══════════════════════════════════════════════════════════
//  GET SHARED MEDIA
// ═══════════════════════════════════════════════════════════
const getSharedMedia = catchAsyncError(async (req, res, next) => {
  const { conversationId } = req.params;

  const mediaMessages = await messageModel
    .find({
      conversationId,
      isDeleted: { $ne: true },
      $or: [
        { "media.url": { $ne: "" } },
        { "file.url": { $ne: "" } }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(100);

  res.status(200).json({
    success: true,
    media: mediaMessages,
  });
});

module.exports = {
  getAllUsers,
  getMessages,
  sendMessages,
  addReaction,
  removeReaction,
  editMessage,
  deleteMessage,
  markAsRead,
  searchMessages,
  togglePinMessage,
  getPinnedMessages,
  getConversations,
  forwardMessage,
  getSharedMedia,
};
