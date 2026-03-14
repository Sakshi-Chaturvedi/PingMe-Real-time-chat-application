const express = require("express");
const isAuthenticatedUser = require("../middlewares/Auth");
const upload = require("../middlewares/multer");

const {
  createGroup,
  updateGroup,
  addMember,
  removeMember,
  toggleAdmin,
  leaveGroup,
  sendGroupMessage,
  getGroupMessages,
} = require("../controllers/group.controller");

const groupRouter = express.Router();

// ── All routes require authentication ──
groupRouter.use(isAuthenticatedUser);

// Create a new group
groupRouter.post("/create", upload.single("groupAvatar"), createGroup);

// Update group info
groupRouter.put("/update/:groupId", upload.single("groupAvatar"), updateGroup);

// Member management
groupRouter.post("/addMember/:groupId", addMember);
groupRouter.post("/removeMember/:groupId", removeMember);

// Admin management
groupRouter.put("/toggleAdmin/:groupId", toggleAdmin);

// Leave group
groupRouter.post("/leave/:groupId", leaveGroup);

// Group messages
groupRouter.post(
  "/sendMessage/:groupId",
  upload.single("media"),
  sendGroupMessage
);
groupRouter.get("/messages/:groupId", getGroupMessages);

module.exports = groupRouter;
