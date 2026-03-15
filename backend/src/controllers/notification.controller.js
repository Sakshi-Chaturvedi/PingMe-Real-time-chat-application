const catchAsyncError = require("../middlewares/catchAsyncError");
const { ErrorHandler } = require("../middlewares/errorMiddleware");
const notificationModel = require("../models/notification.model");

// GET ALL UNREAD NOTIFICATIONS
const getNotifications = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;

  const notifications = await notificationModel
    .find({ recipient: userId, isRead: false })
    .populate("sender", "username avatar")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: notifications.length,
    notifications,
  });
});

// MARK NOTIFICATION AS READ
const markAsRead = catchAsyncError(async (req, res, next) => {
  const { notificationId } = req.params;
  const userId = req.user._id;

  const notification = await notificationModel.findById(notificationId);
  if (!notification) {
    return next(new ErrorHandler("Notification not found", 404));
  }

  if (notification.recipient.toString() !== userId.toString()) {
    return next(new ErrorHandler("Unauthorized", 403));
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({
    success: true,
    message: "Notification marked as read",
  });
});

// MARK ALL NOTIFICATIONS AS READ
const markAllAsRead = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;

  const result = await notificationModel.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} notifications marked as read`,
  });
});

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
