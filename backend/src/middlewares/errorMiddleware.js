class ErrorHandler extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;

    Error.captureStackTrace(this, this.constructor);
  }
}

const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  // ❌ Wrong MongoDB ObjectId
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}`;
    err = new ErrorHandler(message, 400);
  }

  // ❌ Mongoose validation errors
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    err = new ErrorHandler(message, 400);
  }

  // ❌ Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    err = new ErrorHandler(message, 400);
  }

  // ❌ JWT invalid
  if (err.name === "JsonWebTokenError") {
    err = new ErrorHandler("Invalid token, please login again.", 401);
  }

  // ❌ JWT expired
  if (err.name === "TokenExpiredError") {
    err = new ErrorHandler("Token expired, please login again.", 401);
  }

  return res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};

module.exports = { errorMiddleware, ErrorHandler };
