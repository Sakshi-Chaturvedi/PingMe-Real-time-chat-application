const catchAsyncError = require("../middlewares/catchAsyncError");
const { ErrorHandler } = require("../middlewares/errorMiddleware");
const conversationModel = require("../models/conversation.model");
const messageModel = require("../models/message.model");
const cloudinary = require("../services/uploadMedia.service");

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

  const populatedGroup = await conversationModel
    .findById(group._id)
    .populate("participants", "username avatar isOnline")
    .populate("groupAdmin", "username avatar");

  // Notify all members about the new group
  if (global.io) {
    memberIds.forEach((memberId) => {
      global.io.to(memberId.toString()).emit("newGroup", populatedGroup);
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

  const populatedGroup = await conversationModel
    .findById(groupId)
    .populate("participants", "username avatar isOnline");

  if (global.io) {
    global.io.to(newMemberId).emit("addedToGroup", populatedGroup);
    group.participants.forEach((memberId) => {
      global.io.to(memberId.toString()).emit("memberAdded", {
        groupId,
        newMember: newMemberId,
      });
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

  group.participants = group.participants.filter(
    (p) => p.toString() !== targetId
  );
  group.groupAdmins = group.groupAdmins.filter(
    (a) => a.toString() !== targetId
  );
  await group.save();

  if (global.io) {
    global.io.to(targetId).emit("removedFromGroup", { groupId });
    // Notify remaining members
    group.participants.forEach((memberId) => {
      global.io.to(memberId.toString()).emit("memberRemoved", { groupId, removedId: targetId });
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

  if (global.io) {
    group.participants.forEach((memberId) => {
      global.io.to(memberId.toString()).emit("adminToggled", {
        groupId,
        userId: targetId,
        isAdmin: !isTargetAdmin,
      });
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

  // Delete group if no members left
  if (group.participants.length === 0) {
    await conversationModel.findByIdAndDelete(groupId);
    return res.status(200).json({
      success: true,
      message: "Group deleted (no members left)",
    });
  }

  await group.save();

  if (global.io) {
    group.participants.forEach((memberId) => {
      global.io.to(memberId.toString()).emit("memberLeft", {
        groupId,
        userId: userId.toString(),
      });
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

  // Verify sender is a member
  if (!group.participants.some((p) => p.toString() === senderId.toString())) {
    return next(new ErrorHandler("You are not a member of this group", 403));
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
    group.participants.forEach((memberId) => {
      global.io
        .to(memberId.toString())
        .emit("receiveMessage", populatedMessage);
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

  const group = await conversationModel.findById(groupId);
  if (!group || !group.isGroup) {
    return next(new ErrorHandler("Group not found", 404));
  }

  if (!group.participants.some((p) => p.toString() === userId.toString())) {
    return next(new ErrorHandler("You are not a member of this group", 403));
  }

  const messages = await messageModel
    .find({ conversationId: groupId })
    .populate("sender", "username avatar")
    .populate("reactions.user", "username avatar")
    .populate("replyTo", "message sender")
    .sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    count: messages.length,
    messages,
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
