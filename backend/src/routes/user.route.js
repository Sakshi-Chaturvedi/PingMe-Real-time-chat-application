const express = require("express");
const {
  signUpController,
  signInController,
  signOutController,
  getUserController,
  updateProfileController,
  verifyUserController,
  savePushSubscription,
  savePublicKey,
  getUserPublicKey,
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

module.exports = authRouter;
