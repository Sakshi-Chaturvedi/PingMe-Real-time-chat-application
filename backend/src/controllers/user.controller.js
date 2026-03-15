const catchAsyncError = require("../middlewares/catchAsyncError");
const { ErrorHandler } = require("../middlewares/errorMiddleware");
const userModel = require("../models/user.model");
const sendToken = require("../utils/sendToken");
const sendVerificationCode = require("../utils/sendVerificationCode");
const cloudinary = require("../services/uploadMedia.service")

// ! <<<<<<<<<<<<<-------------- Sign-UP-Controller ---------------->>>>>>>>>>>>>>>>>>
const signUpController = catchAsyncError(async (req, res, next) => {
  const { username, email, password, phone, verificationMethod } = req.body;

  if (!username || !email || !password || !phone || !verificationMethod) {
    return next(new ErrorHandler("All Fields Are Required.", 400));
  }

  const isuser = await userModel.findOne({
    $or: [{ email }, { phone }],
    accountVerified: true,
  });

  if (isuser) {
    return next(new ErrorHandler("User Already Exists.", 409));
  }

  const attempts = await userModel.countDocuments({
    $or: [{ email }, { phone }],
    accountVerified: false,
  });

  if (attempts > 3) {
    return next(new ErrorHandler("Too Many Attempts, try again later", 429));
  }

  const userData = {
    username,
    email,
    password,
    phone,
  };

  const newUser = await userModel.create(userData);

  const OTP = await newUser.generateVerificationCode();

  await newUser.save();

  await sendVerificationCode(OTP, verificationMethod, email, phone);

  res.status(201).json({
    success: true,
    message:
      verificationMethod === "email"
        ? `Verification code sent to ${email}`
        : "Verification code sent to your phone",
  });
});

// ! <<<<<<<<<<<<<<<<---------------- Verify-User-Controller --------------->>>>>>>>>>>>>>>>>>>>
const verifyUserController = catchAsyncError(async (req, res, next) => {
  const { email, phone, otp } = req.body;

  if (!email || !otp || !phone) {
    return next(new ErrorHandler("All Fields Are Required.", 400));
  }

  const isUser = await userModel.find({
    $or: [{ email }, { phone }],
    accountVerified: false,
  });

  if (isUser.length === 0) {
    return next(new ErrorHandler("User not Found", 400));
  }

  let user = isUser[0];

  if (isUser.length > 1) {
    await userModel.deleteMany({
      _id: { $ne: user._id },
      $or: [
        { phone, accountVerified: false },
        { email, accountVerified: false },
      ],
    });
  }

  if (String(otp) !== String(user.verificationCode)) {
    return next(new ErrorHandler("Invalid OTP", 400));
  }

  if (Date.now() > new Date(user.verificationCodeExpire).getTime()) {
    return next(new ErrorHandler("OTP has been expired.", 400));
  }

  user.verificationCode = null;
  user.verificationCodeExpire = null;
  user.accountVerified = true;

  await user.save();

  sendToken(user, 200, "User Verified Successfully", res);
});

// ! <<<<<<<<<<<<------------- Sign-In-Controller --------------->>>>>>>>>>>>>>>>>>>>>
const signInController = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("All fields are required.", 400));
  }

  const isUserExist = await userModel
    .findOne({
      email,
      accountVerified: true,
    })
    .select("+password");

  if (!isUserExist) {
    return next(new ErrorHandler("User not found.", 400));
  }

  const isPasswordCorrect = await isUserExist.comparePassword(password);

  if (!isPasswordCorrect) {
    return next(new ErrorHandler("Password is not correct.", 401));
  }

  sendToken(isUserExist, 200, "User LoggedIn Successfully.", res);
});

// ! <<<<<<<<<<<<<-------------- Sign-Out-Controller -------------->>>>>>>>>>>>>>>>>>>
const signOutController = catchAsyncError(async (req, res, next) => {
  res
    .status(200)
    .clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    })
    .json({
      success: true,
      message: "Logged out successfully",
    });
});

// ! <<<<<<<<<<<<<----------------- Get-Profile-Controller --------------->>>>>>>>>>>>>>>>
const getUserController = catchAsyncError(async (req, res, next) => {
  const user = req.user;

  res.status(200).json({
    success: true,
    message: "User Profile Fetched Successfully.",
    user,
  });
});

// ═══════════════════════════════════════════════════════════
//  GET OTHER USER PROFILE BY ID
// ═══════════════════════════════════════════════════════════
const getUserProfileById = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;

  const user = await userModel.findById(userId).select({
    password: 0,
    verificationCode: 0,
    verificationCodeExpire: 0,
    pushSubscription: 0,
  });

  if (!user) {
    return next(new ErrorHandler("User not found.", 404));
  }

  res.status(200).json({
    success: true,
    user,
  });
});

// ! <<<<<<<<<<<<<<--------------- updateProfile ----------------->>>>>>>>>>>>>>>>>>>>>>>
const updateProfileController = catchAsyncError(async (req, res, next) => {
  // console.log(req.user)
  
  const userId = req.user.id;

  const { username, email, phone } = req.body;

  const updateData = {};

  if (username) updateData.username = username;
  if (email) updateData.email = email;
  if (phone) updateData.phone = phone;

  // Avatar update
  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "avatars",
    });

    updateData.avatar = {
      public_id: result.public_id,
      url: result.secure_url,
    };
  }

  const user = await userModel.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  });

  if (!user) {
    return next(new ErrorHandler("User not found.", 404));
  }

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    user,
  });
});

// ═══════════════════════════════════════════════════════════
//  Save Push Subscription — Feature 6
// ═══════════════════════════════════════════════════════════
const savePushSubscription = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;
  const { subscription } = req.body;

  if (!subscription) {
    return next(new ErrorHandler("Push subscription data is required", 400));
  }

  await userModel.findByIdAndUpdate(userId, { pushSubscription: subscription });

  res.status(200).json({
    success: true,
    message: "Push subscription saved successfully",
  });
});

// ═══════════════════════════════════════════════════════════
//  Save E2EE Public Key — Feature 4
// ═══════════════════════════════════════════════════════════
const savePublicKey = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;
  const { publicKey } = req.body;

  if (!publicKey) {
    return next(new ErrorHandler("Public key is required", 400));
  }

  await userModel.findByIdAndUpdate(userId, { publicKey });

  res.status(200).json({
    success: true,
    message: "Public key saved successfully",
  });
});

// ═══════════════════════════════════════════════════════════
//  Get User Public Key — Feature 4
// ═══════════════════════════════════════════════════════════
const getUserPublicKey = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;

  const user = await userModel.findById(userId).select("publicKey username");
  if (!user) return next(new ErrorHandler("User not found", 404));

  res.status(200).json({
    success: true,
    publicKey: user.publicKey,
    username: user.username,
  });
});

// ═══════════════════════════════════════════════════════════
//  Block User — Feature 11
// ═══════════════════════════════════════════════════════════
const blockUser = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;
  const { blockId } = req.params;

  if (userId.toString() === blockId) {
    return next(new ErrorHandler("You cannot block yourself", 400));
  }

  const userToBlock = await userModel.findById(blockId);
  if (!userToBlock) {
    return next(new ErrorHandler("User to block not found", 404));
  }

  await userModel.findByIdAndUpdate(userId, {
    $addToSet: { blockedUsers: blockId },
  });

  res.status(200).json({
    success: true,
    message: "User blocked successfully",
  });
});

// ═══════════════════════════════════════════════════════════
//  Unblock User — Feature 11
// ═══════════════════════════════════════════════════════════
const unblockUser = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;
  const { blockId } = req.params;

  await userModel.findByIdAndUpdate(userId, {
    $pull: { blockedUsers: blockId },
  });

  res.status(200).json({
    success: true,
    message: "User unblocked successfully",
  });
});

// ═══════════════════════════════════════════════════════════
//  Archive Chat — Feature 11
// ═══════════════════════════════════════════════════════════
const archiveChat = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;
  const { conversationId } = req.params;

  await userModel.findByIdAndUpdate(userId, {
    $addToSet: { archivedChats: conversationId },
  });

  res.status(200).json({
    success: true,
    message: "Chat archived successfully",
  });
});

// ═══════════════════════════════════════════════════════════
//  Unarchive Chat — Feature 11
// ═══════════════════════════════════════════════════════════
const unarchiveChat = catchAsyncError(async (req, res, next) => {
  const userId = req.user._id;
  const { conversationId } = req.params;

  await userModel.findByIdAndUpdate(userId, {
    $pull: { archivedChats: conversationId },
  });

  res.status(200).json({
    success: true,
    message: "Chat unarchived successfully",
  });
});

module.exports = {
  signUpController,
  verifyUserController,
  signInController,
  signOutController,
  getUserController,
  getUserProfileById,
  updateProfileController,
  savePushSubscription,
  savePublicKey,
  getUserPublicKey,
  blockUser,
  unblockUser,
  archiveChat,
  unarchiveChat,
};
