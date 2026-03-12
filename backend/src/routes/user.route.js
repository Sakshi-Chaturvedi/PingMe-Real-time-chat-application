const express = require("express");
const {
  signUpController,
  signInController,
  signOutController,
  getUserController,
  updateProfileController,
  verifyUserController,
} = require("../controllers/user.controller");
const isAuthenticatedUser = require("../middlewares/Auth");

const authRouter = express.Router();

// ! -------------- Sign-Up-API --------------
authRouter.post("/signUp", signUpController);

// ! --------------- Verify-Account-API ---------------
authRouter.post("/verifyUser", verifyUserController);

// ! ------------- Sign-In-API -----------------
authRouter.post("/signIn", signInController);

// ! ------------- Sign-Out-API ----------------
authRouter.get("/signOut", isAuthenticatedUser, signOutController);

// ! -------------- Get-User-Profile-API ---------------
authRouter.get("/profile", isAuthenticatedUser, getUserController);

// ! ---------------- Update-Profile-API -------------------
authRouter.post("/update-profile", updateProfileController);

module.exports = authRouter;
