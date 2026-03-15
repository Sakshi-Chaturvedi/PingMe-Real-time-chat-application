const catchAsyncError = require("../middlewares/catchAsyncError");
const { ErrorHandler } = require("../middlewares/errorMiddleware");
const conversationModel = require("../models/conversation.model");
const messageModel = require("../models/message.model");
const cloudinary = require("../services/uploadMedia.service");
const notificationModel = require("../models/notification.model");
const { isUserOnline } = require("../utils/socket");

// ═══════════════════════════════════════════════════════════
//  CREATE GROUP — Feature 5
// ═══════════════════════════════════════════════════════════
const createGroup = catchAsyncError(async (req, res, next) => {
  const { groupName, participants, groupDescription } = req.body;
  const adminId = req.user._id;

  if (!groupName) {
    return next(new ErrorHandler("Group name is required", 400));
  }

  // Parse participants — can come as JSON string or array
  let memberIds = typeof participants === "string"
    ? JSON.parse(participants)
    : participants;

  if (!memberIds || memberIds.length < 2) {
    return next(new ErrorHandler("At least 2 other participants required", 400));
  }

  // Ensure admin is included in participants
  if (!memberIds.includes(adminId.toString())) {
    memberIds.push(adminId.toString());
  }

  let groupAvatar = { public_id: "", url: "" };

  // Upload group avatar if provided
  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "group-avatars",
    });
    groupAvatar = {
      public_id: result.public_id,
      url: result.secure_url,
    };
  }

  const group = await conversationModel.create({
    isGroup: true,
    groupName,
    groupDescription: groupDescription || "",
    groupAdmin: adminId,
    groupAdmins: [adminId],
    participants: memberIds,
    groupAvatar,
  });

  // Create system message for group creation
  const sysMsg = await messageModel.create({
    conversationId: group._id,
    sender: adminId,
    message: `${req.user.username} created the group "${groupName}"`,
    isSystemMessage: true,
  });
  group.lastMessage = sysMsg._id;
  await group.save();

  const populatedGroup = await conversationModel
    .findById(group._id)
    .populate("participants", "username avatar isOnline")
    .populate("groupAdmin", "username avatar");

  const populatedSysMsg = await messageModel
    .findById(sysMsg._id)
    .populate("sender", "username avatar");

  // Notify all members about the new group
  if (global.io) {
    memberIds.forEach(async (memberId) => {
      if (memberId.toString() !== adminId.toString()) {
        if (isUserOnline(memberId.toString())) {
          global.io.to(memberId.toString()).emit("newGroup", populatedGroup);
          global.io.to(memberId.toString()).emit("receiveMessage", populatedSysMsg);
          global.io.to(memberId.toString()).emit("newNotification", {
            sender: req.user.username,
            content: `Added you to group ${groupName}`,
            type: "group_add"
          });
        } else {
          await notificationModel.create({
            recipient: memberId,
            sender: adminId,
            type: "group_add",
            content: `Added you to group ${groupName}`,
            conversationId: group._id
          });
        }
      } else {
        global.io.to(memberId.toString()).emit("newGroup", populatedGroup);
        global.io.to(memberId.toString()).emit("receiveMessage", populatedSysMsg);
      }
    });
  }

  res.status(201).json({
    success: true,
    message: "Group created successfully",
    group: populatedGroup,
  });
});

// ═══════════════════════════════════════════════════════════
//  UPDATE GROUP INFO — Feature 5
// ═══════════════════════════════════════════════════════════
const updateGroup = catchAsyncError(async (req, res, next) => {
  const { groupId } = req.params;
  const { groupName, groupDescription } = req.body;
  const userId = req.user._id;

  const group = await conversationModel.findById(groupId);
  if (!group || !group.isGroup) {
    return next(new ErrorHandler("Group not found", 404));
  }

  // Only admins can update group info
  const isAdmin = group.groupAdmins.some(
    (a) => a.toString() === userId.toString()
  );
  if (!isAdmin) {
    return next(new ErrorHandler("Only admins can update group info", 403));
  }

  if (groupName) group.groupName = groupName;
  if (groupDescription !== undefined) group.groupDescription = groupDescription;

  // Update group avatar if provided
  if (req.file) {
    // Delete old avatar from Cloudinary
    if (group.groupAvatar.public_id) {
      await cloudinary.uploader.destroy(group.groupAvatar.public_id);
    }
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "group-avatars",
    });
    group.groupAvatar = {
      public_id: result.public_id,
      url: result.secure_url,
    };
  }

  await group.save();

  const populatedGroup = await conversationModel
    .findById(groupId)
    .populate("participants", "username avatar isOnline")
    .populate("groupAdmin", "username avatar");

  // Notify group members
  if (global.io) {
    group.participants.forEach((memberId) => {
      global.io.to(memberId.toString()).emit("groupUpdated", populatedGroup);
    });
  }

  res.status(200).json({
    success: true,
    message: "Group updated successfully",
    group: populatedGroup,
  });
});

// ═══════════════════════════════════════════════════════════
//  ADD MEMBER TO GROUP — Feature 5
// ═══════════════════════════════════════════════════════════
const addMember = catchAsyncError(async (req, res, next) => {
  const { groupId } = req.params;
  const { userId: newMemberId } = req.body;
  const adminId = req.user._id;

  const group = await conversationModel.findById(groupId);
  if (!group || !group.isGroup) {
    return next(new ErrorHandler("Group not found", 404));
  }

  // Check admin permission
  const isAdmin = group.groupAdmins.some(
    (a) => a.toString() === adminId.toString()
  );
  if (!isAdmin) {
    return next(new ErrorHandler("Only admins can add members", 403));
  }

  // Check if already a member
  if (group.participants.some((p) => p.toString() === newMemberId)) {
    return next(new ErrorHandler("User is already a member", 400));
  }

  group.participants.push(newMemberId);
  await group.save();

  // System message
  const newMemberUser = await require("../models/user.model").findById(newMemberId).select("username");
  const sysMsg = await messageModel.create({
    conversationId: groupId,
    sender: adminId,
    message: `${req.user.username} added ${newMemberUser?.username || "a user"}`,
    isSystemMessage: true,
  });
  group.lastMessage = sysMsg._id;
  await group.save();

  const populatedSysMsg = await messageModel.findById(sysMsg._id).populate("sender", "username avatar");

  const populatedGroup = await conversationModel
    .findById(groupId)
    .populate("participants", "username avatar isOnline");

  if (global.io) {
    global.io.to(newMemberId).emit("addedToGroup", populatedGroup);
    group.participants.forEach((memberId) => {
      global.io.to(memberId.toString()).emit("memberAdded", { groupId, newMember: newMemberId });
      global.io.to(memberId.toString()).emit("receiveMessage", populatedSysMsg);
    });
  }

  res.status(200).json({
    success: true,
    message: "Member added successfully",
    group: populatedGroup,
  });
});

// ═══════════════════════════════════════════════════════════
//  REMOVE MEMBER FROM GROUP — Feature 5
// ═══════════════════════════════════════════════════════════
const removeMember = catchAsyncError(async (req, res, next) => {
  const { groupId } = req.params;
  const { userId: targetId } = req.body;
  const adminId = req.user._id;

  const group = await conversationModel.findById(groupId);
  if (!group || !group.isGroup) {
    return next(new ErrorHandler("Group not found", 404));
  }

  // Cannot remove the main admin
  if (group.groupAdmin.toString() === targetId) {
    return next(new ErrorHandler("Cannot remove the group creator", 400));
  }

  // Check admin permission (or user removing themselves)
  const isAdmin = group.groupAdmins.some(
    (a) => a.toString() === adminId.toString()
  );
  if (!isAdmin && adminId.toString() !== targetId) {
    return next(new ErrorHandler("Only admins can remove members", 403));
  }

  // Get username before removing
  const removedUser = await require("../models/user.model").findById(targetId).select("username");

  group.participants = group.participants.filter(
    (p) => p.toString() !== targetId
  );
  group.groupAdmins = group.groupAdmins.filter(
    (a) => a.toString() !== targetId
  );

  // Track as past participant
  group.pastParticipants.push({ userId: targetId, leftAt: new Date() });
  await group.save();

  // System message
  const sysMsg = await messageModel.create({
    conversationId: groupId,
    sender: adminId,
    message: `${req.user.username} removed ${removedUser?.username || "a user"}`,
    isSystemMessage: true,
  });
  group.lastMessage = sysMsg._id;
  await group.save();
  const populatedSysMsg = await messageModel.findById(sysMsg._id).populate("sender", "username avatar");

  if (global.io) {
    global.io.to(targetId).emit("removedFromGroup", { groupId });
    group.participants.forEach((memberId) => {
      global.io.to(memberId.toString()).emit("memberRemoved", { groupId, removedId: targetId });
      global.io.to(memberId.toString()).emit("receiveMessage", populatedSysMsg);
    });
  }

  res.status(200).json({
    success: true,
    message: "Member removed successfully",
  });
});

// ═══════════════════════════════════════════════════════════
//  MAKE / REMOVE ADMIN — Feature 5
// ═══════════════════════════════════════════════════════════
const toggleAdmin = catchAsyncError(async (req, res, next) => {
  const { groupId } = req.params;
  const { userId: targetId } = req.body;
  const adminId = req.user._id;

  const group = await conversationModel.findById(groupId);
  if (!group || !group.isGroup) {
    return next(new ErrorHandler("Group not found", 404));
  }

  // Only the main admin can promote/demote co-admins
  if (group.groupAdmin.toString() !== adminId.toString()) {
    return next(
      new ErrorHandler("Only the group creator can manage admins", 403)
    );
  }

  const isTargetAdmin = group.groupAdmins.some(
    (a) => a.toString() === targetId
  );

  if (isTargetAdmin) {
    group.groupAdmins = group.groupAdmins.filter(
      (a) => a.toString() !== targetId
    );
  } else {
    group.groupAdmins.push(targetId);
  }

  await group.save();

  // System message
  const targetUser = await require("../models/user.model").findById(targetId).select("username");
  const sysMsg = await messageModel.create({
    conversationId: groupId,
    sender: adminId,
    message: isTargetAdmin
      ? `${req.user.username} removed ${targetUser?.username || "a user"} as admin`
      : `${req.user.username} made ${targetUser?.username || "a user"} an admin`,
    isSystemMessage: true,
  });
  group.lastMessage = sysMsg._id;
  await group.save();
  const populatedSysMsg = await messageModel.findById(sysMsg._id).populate("sender", "username avatar");

  if (global.io) {
    group.participants.forEach((memberId) => {
      global.io.to(memberId.toString()).emit("adminToggled", {
        groupId,
        userId: targetId,
        isAdmin: !isTargetAdmin,
      });
      global.io.to(memberId.toString()).emit("receiveMessage", populatedSysMsg);
    });
  }

  res.status(200).json({
    success: true,
    message: isTargetAdmin ? "Admin role removed" : "Made admin",
  });
});

// ═══════════════════════════════════════════════════════════
//  LEAVE GROUP — Feature 5
// ═══════════════════════════════════════════════════════════
const leaveGroup = catchAsyncError(async (req, res, next) => {
  const { groupId } = req.params;
  const userId = req.user._id;

  const group = await conversationModel.findById(groupId);
  if (!group || !group.isGroup) {
    return next(new ErrorHandler("Group not found", 404));
  }

  // If admin is leaving, transfer ownership to next admin/member
  if (group.groupAdmin.toString() === userId.toString()) {
    const otherAdmins = group.groupAdmins.filter(
      (a) => a.toString() !== userId.toString()
    );
    if (otherAdmins.length > 0) {
      group.groupAdmin = otherAdmins[0];
    } else {
      const otherMembers = group.participants.filter(
        (p) => p.toString() !== userId.toString()
      );
      if (otherMembers.length > 0) {
        group.groupAdmin = otherMembers[0];
        group.groupAdmins.push(otherMembers[0]);
      }
    }
  }

  group.participants = group.participants.filter(
    (p) => p.toString() !== userId.toString()
  );
  group.groupAdmins = group.groupAdmins.filter(
    (a) => a.toString() !== userId.toString()
  );

  // Track this user as a past participant with timestamp
  group.pastParticipants.push({ userId, leftAt: new Date() });

  // Delete group if no members left
  if (group.participants.length === 0) {
    await conversationModel.findByIdAndDelete(groupId);
    return res.status(200).json({
      success: true,
      message: "Group deleted (no members left)",
    });
  }

  await group.save();

  // System message
  const sysMsg = await messageModel.create({
    conversationId: groupId,
    sender: userId,
    message: `${req.user.username} left the group`,
    isSystemMessage: true,
  });
  group.lastMessage = sysMsg._id;
  await group.save();
  const populatedSysMsg = await messageModel.findById(sysMsg._id).populate("sender", "username avatar");

  if (global.io) {
    group.participants.forEach((memberId) => {
      global.io.to(memberId.toString()).emit("memberLeft", {
        groupId,
        userId: userId.toString(),
      });
      global.io.to(memberId.toString()).emit("receiveMessage", populatedSysMsg);
    });
  }

  res.status(200).json({
    success: true,
    message: "Left group successfully",
  });
});

// ═══════════════════════════════════════════════════════════
//  SEND GROUP MESSAGE — Feature 5
// ═══════════════════════════════════════════════════════════
const sendGroupMessage = catchAsyncError(async (req, res, next) => {
  const { groupId } = req.params;
  const { message, isEncrypted, replyTo } = req.body;
  const senderId = req.user._id;

  const group = await conversationModel.findById(groupId);
  if (!group || !group.isGroup) {
    return next(new ErrorHandler("Group not found", 404));
  }

  // Verify sender is still a current member
  if (!group.participants.some((p) => p.toString() === senderId.toString())) {
    return next(new ErrorHandler("You are no longer a member of this group. You cannot send messages.", 403));
  }

  let mediaData = {};
  let fileData = {};

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
      fileData = {
        url: `/uploads/${req.file.filename}`,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: mimetype,
      };
      mediaData = { url: `/uploads/${req.file.filename}`, type: "file" };
    }
  }

  const newMessage = await messageModel.create({
    conversationId: groupId,
    sender: senderId,
    message: message || "",
    media: mediaData,
    file: fileData,
    isEncrypted: isEncrypted === "true" || isEncrypted === true,
    replyTo: replyTo || undefined,
  });

  group.lastMessage = newMessage._id;
  await group.save();

  const populatedMessage = await messageModel
    .findById(newMessage._id)
    .populate("sender", "username avatar")
    .populate("replyTo", "message sender");

  // Emit to all group members
  if (global.io) {
    group.participants.forEach(async (memberId) => {
      if (memberId.toString() !== senderId.toString()) {
        if (isUserOnline(memberId.toString())) {
          global.io
            .to(memberId.toString())
            .emit("receiveMessage", populatedMessage);
          
          global.io.to(memberId.toString()).emit("newNotification", {
            sender: req.user.username,
            content: message ? message.substring(0, 50) : "Sent an attachment",
            type: "new_message",
            groupName: group.groupName
          });
        } else {
          // Offline
          await notificationModel.create({
            recipient: memberId,
            sender: senderId,
            type: "new_message",
            content: message ? message.substring(0, 50) : "Sent an attachment",
            conversationId: group._id
          });
        }
      } else {
        // Sender gets their own message update
        global.io
          .to(memberId.toString())
          .emit("receiveMessage", populatedMessage);
      }
    });
  }

  res.status(201).json({
    success: true,
    message: "Group message sent",
    data: populatedMessage,
  });
});

// ═══════════════════════════════════════════════════════════
//  GET GROUP MESSAGES — Feature 5
// ═══════════════════════════════════════════════════════════
const getGroupMessages = catchAsyncError(async (req, res, next) => {
  const { groupId } = req.params;
  const userId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const group = await conversationModel.findById(groupId);
  if (!group || !group.isGroup) {
    return next(new ErrorHandler("Group not found", 404));
  }

  if (!group.participants.some((p) => p.toString() === userId.toString())) {
    return next(new ErrorHandler("You are not a member of this group", 403));
  }

  // Get total count for pagination info
  const totalMessages = await messageModel.countDocuments({ conversationId: groupId });
  const totalPages = Math.ceil(totalMessages / limit);

  const messages = await messageModel
    .find({ conversationId: groupId })
    .populate("sender", "username avatar")
    .populate("reactions.user", "username avatar")
    .populate("replyTo", "message sender")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    success: true,
    messages: messages.reverse(),
    conversation: group,
    currentPage: page,
    totalPages,
    hasMore: page < totalPages,
  });
});

module.exports = {
  createGroup,
  updateGroup,
  addMember,
  removeMember,
  toggleAdmin,
  leaveGroup,
  sendGroupMessage,
  getGroupMessages,
};
