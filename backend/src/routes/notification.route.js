const express = require("express");
const isAuthenticatedUser = require("../middlewares/Auth");

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notification.controller");

const notificationRouter = express.Router();

notificationRouter.use(isAuthenticatedUser);

notificationRouter.get("/", getNotifications);
notificationRouter.put("/readAll", markAllAsRead);
notificationRouter.put("/:notificationId/read", markAsRead);

module.exports = notificationRouter;
