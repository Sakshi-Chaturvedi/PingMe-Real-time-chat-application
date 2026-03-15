const express = require("express");
const isAuthenticatedUser = require("../middlewares/Auth");
const upload = require("../middlewares/multer");

const {
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
} = require("../controllers/message.controller");

const messageRouter = express.Router();

// ── All routes below require authentication ──
messageRouter.use(isAuthenticatedUser);

// Get all users for chat sidebar
messageRouter.get("/getAllUsers", getAllUsers);

// Get conversations list
messageRouter.get("/conversations", getConversations);

// Get messages between two users
messageRouter.get("/getMessages/:id", getMessages);

// Get shared media
messageRouter.get("/media/:conversationId", getSharedMedia);

// Send message (text + media + file)
messageRouter.post("/sendMessage", upload.single("media"), sendMessages);

// ── Reactions — Feature 2 ──
messageRouter.post("/react/:messageId", addReaction);
messageRouter.delete("/react/:messageId", removeReaction);

// ── Edit / Delete — Feature 3 ──
messageRouter.put("/edit/:messageId", editMessage);
messageRouter.delete("/delete/:messageId", deleteMessage);

// ── Read receipts — Feature 1 ──
messageRouter.put("/markAsRead/:conversationId", markAsRead);

// ── Search — Feature 9 ──
messageRouter.get("/search", searchMessages);

// ── Pin / Unpin — Feature 9 ──
messageRouter.put("/pin/:messageId", togglePinMessage);
messageRouter.get("/pinned/:conversationId", getPinnedMessages);

// ── Forward Messages ──
messageRouter.post("/forward/:messageId", forwardMessage);

module.exports = messageRouter;
