const express = require("express");
const {
  signUpController,
  signInController,
  signOutController,
  getUserController,
  getUserProfileById,
  updateProfileController,
  verifyUserController,
  savePushSubscription,
  savePublicKey,
  getUserPublicKey,
  blockUser,
  unblockUser,
  archiveChat,
  unarchiveChat,
} = require("../controllers/user.controller");

const isAuthenticatedUser = require("../middlewares/Auth");
const upload = require("../middlewares/multer");

const authRouter = express.Router();

// Sign-Up
authRouter.post("/signUp", signUpController);

// Verify Account
authRouter.post("/verifyUser", verifyUserController);

// Sign-In
authRouter.post("/signIn", signInController);

// Sign-Out
authRouter.get("/signOut", isAuthenticatedUser, signOutController);

// Get Profile
authRouter.get("/profile", isAuthenticatedUser, getUserController);
authRouter.get("/profile/:userId", isAuthenticatedUser, getUserProfileById);

// Update Profile
authRouter.put(
  "/update-profile",
  isAuthenticatedUser,
  upload.single("avatar"),
  updateProfileController
);

// ── Push Notifications — Feature 6 ──
authRouter.post(
  "/push-subscription",
  isAuthenticatedUser,
  savePushSubscription
);

// ── E2EE Public Key — Feature 4 ──
authRouter.post("/publicKey", isAuthenticatedUser, savePublicKey);
authRouter.get("/publicKey/:userId", isAuthenticatedUser, getUserPublicKey);

// ── Archive and Block Features — Feature 11 ──
authRouter.post("/block/:blockId", isAuthenticatedUser, blockUser);
authRouter.delete("/unblock/:blockId", isAuthenticatedUser, unblockUser);
authRouter.post("/archive/:conversationId", isAuthenticatedUser, archiveChat);
authRouter.delete("/unarchive/:conversationId", isAuthenticatedUser, unarchiveChat);

module.exports = authRouter;
