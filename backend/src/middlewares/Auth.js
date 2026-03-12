const userModel = require("../models/user.model");
const catchAsyncError = require("./catchAsyncError");
const { ErrorHandler } = require("./errorMiddleware");
const jwt = require("jsonwebtoken");

const isAuthenticatedUser = catchAsyncError(async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return next(new ErrorHandler("User is not Authenticated.", 401));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  const nuser = await userModel.findById(decoded.id);

  if (!nuser) {
    return next(new ErrorHandler("User not Found.", 404));
  }

  req.user = nuser;

  next();
});

module.exports = isAuthenticatedUser;
