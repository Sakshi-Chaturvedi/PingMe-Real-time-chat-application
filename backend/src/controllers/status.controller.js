const catchAsyncError = require("../middlewares/catchAsyncError");
const { ErrorHandler } = require("../middlewares/errorMiddleware");
const statusModel = require("../models/status.model");
const cloudinary = require("../services/uploadMedia.service");

// ═══════════════════════════════════════════════════════════
//  CREATE STATUS — Feature 10
// ═══════════════════════════════════════════════════════════
const createStatus = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;
  const { contentType, text, backgroundColor, caption } = req.body;

  if (!contentType) {
    return next(new ErrorHandler("Content type is required", 400));
  }

  const statusData = {
    user: userId,
    contentType,
  };

  if (contentType === "text") {
    if (!text || text.trim().length === 0) {
      return next(new ErrorHandler("Text is required for text status", 400));
    }
    statusData.text = text;
    statusData.backgroundColor = backgroundColor || "#075e54";
  } else if (contentType === "image" || contentType === "video") {
    if (!req.file) {
      return next(new ErrorHandler("Media file is required", 400));
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "statuses",
      resource_type: contentType === "video" ? "video" : "image",
    });

    statusData.media = {
      url: result.secure_url,
      public_id: result.public_id,
    };
    statusData.caption = caption || "";
  } else {
    return next(new ErrorHandler("Invalid content type", 400));
  }

  const status = await statusModel.create(statusData);

  const populatedStatus = await statusModel
    .findById(status._id)
    .populate("user", "username avatar");

  // Notify contacts about new status
  if (global.io) {
    global.io.emit("newStatus", {
      userId: userId.toString(),
      status: populatedStatus,
    });
  }

  res.status(201).json({
    success: true,
    message: "Status posted successfully",
    status: populatedStatus,
  });
});

// ═══════════════════════════════════════════════════════════
//  GET MY STATUSES — Feature 10
// ═══════════════════════════════════════════════════════════
const getMyStatuses = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;

  const statuses = await statusModel
    .find({ user: userId })
    .populate("viewedBy.user", "username avatar")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: statuses.length,
    statuses,
  });
});

// ═══════════════════════════════════════════════════════════
//  GET ALL CONTACTS' STATUSES — Feature 10
// ═══════════════════════════════════════════════════════════
const getAllStatuses = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;

  // Get all active statuses (not expired), excluding own
  const statuses = await statusModel
    .find({
      user: { $ne: userId },
      expiresAt: { $gt: new Date() },
    })
    .populate("user", "username avatar")
    .sort({ createdAt: -1 });

  // Group statuses by user
  const grouped = {};
  statuses.forEach((status) => {
    const uid = status.user._id.toString();
    if (!grouped[uid]) {
      grouped[uid] = {
        user: status.user,
        statuses: [],
        hasUnviewed: false,
      };
    }
    grouped[uid].statuses.push(status);
    // Check if this status is unviewed by current user
    const viewed = status.viewedBy.some(
      (v) => v.user && v.user.toString() === userId.toString()
    );
    if (!viewed) {
      grouped[uid].hasUnviewed = true;
    }
  });

  res.status(200).json({
    success: true,
    statuses: Object.values(grouped),
  });
});

// ═══════════════════════════════════════════════════════════
//  VIEW STATUS (mark as viewed) — Feature 10
// ═══════════════════════════════════════════════════════════
const viewStatus = catchAsyncError(async (req, res, next) => {
  const { statusId } = req.params;
  const userId = req.user._id;

  const status = await statusModel.findById(statusId);
  if (!status) return next(new ErrorHandler("Status not found", 404));

  // Don't record self-views
  if (status.user.toString() === userId.toString()) {
    return res.status(200).json({ success: true, message: "Own status" });
  }

  // Check if already viewed
  const alreadyViewed = status.viewedBy.some(
    (v) => v.user.toString() === userId.toString()
  );

  if (!alreadyViewed) {
    status.viewedBy.push({ user: userId, viewedAt: new Date() });
    await status.save();

    // Notify status owner about the view
    if (global.io) {
      global.io.to(status.user.toString()).emit("statusViewed", {
        statusId,
        viewedBy: userId,
      });
    }
  }

  res.status(200).json({
    success: true,
    message: "Status viewed",
  });
});

// ═══════════════════════════════════════════════════════════
//  DELETE STATUS — Feature 10
// ═══════════════════════════════════════════════════════════
const deleteStatus = catchAsyncError(async (req, res, next) => {
  const { statusId } = req.params;
  const userId = req.user._id;

  const status = await statusModel.findById(statusId);
  if (!status) return next(new ErrorHandler("Status not found", 404));

  if (status.user.toString() !== userId.toString()) {
    return next(new ErrorHandler("You can only delete your own status", 403));
  }

  // Delete media from Cloudinary if it exists
  if (status.media && status.media.public_id) {
    await cloudinary.uploader.destroy(status.media.public_id);
  }

  await statusModel.findByIdAndDelete(statusId);

  res.status(200).json({
    success: true,
    message: "Status deleted successfully",
  });
});

module.exports = {
  createStatus,
  getMyStatuses,
  getAllStatuses,
  viewStatus,
  deleteStatus,
};
