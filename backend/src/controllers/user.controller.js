const catchAsyncError = require("../middlewares/catchAsyncError");
const { ErrorHandler } = require("../middlewares/errorMiddleware");
const userModel = require("../models/user.model");
const sendVerificationCode = require("../utils/sendVerificationCode");

// ! <<<<<<<<<<<<<-------------- Sign-UP-Controller ---------------->>>>>>>>>>>>>>>>>>
const signUpController = catchAsyncError(async (req, res, next) => {
  const { username, email, password, phone, verificationMethod } = req.body;

  if (!username || !email || !password || !phone || !verificationMethod) {
    return next(new ErrorHandler("All Fields Are Required.", 400));
  }

  const isuser = await userModel.findOne({
    $or: [{ email }, { phone }],
    accountVerified: false,
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
      VerificationMethod === "email"
        ? `Verification code sent to ${email}`
        : "Verification code sent to your phone",
  });
});


// ! <<<<<<<<<<<<<<<<---------------- Verify-User-Controller --------------->>>>>>>>>>>>>>>>>>>>
const verifyUserController = catchAsyncError(async (req, res, next) => {
    
})

// ! <<<<<<<<<<<<------------- Sign-In-Controller --------------->>>>>>>>>>>>>>>>>>>>>
const signInController = catchAsyncError(async (req, res, next) => {});

// ! <<<<<<<<<<<<<-------------- Sign-Out-Controller -------------->>>>>>>>>>>>>>>>>>>
const signOutController = catchAsyncError(async (req, res, next) => {});

// ! <<<<<<<<<<<<<----------------- Get-Profile-Controller --------------->>>>>>>>>>>>>>>>
const getUserController = catchAsyncError(async (req, res, next) => {});

// ! <<<<<<<<<<<<<<--------------- updateProfile ----------------->>>>>>>>>>>>>>>>>>>>>>>
const updateProfileController = catchAsyncError(async (req, res, next) => {});

module.exports = {
  signUpController,
  signInController,
  signOutController,
  getUserController,
  updateProfileController,
};
