const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const helmet = require("helmet");

const { errorMiddleware } = require("./middlewares/errorMiddleware");
const { apiLimiter, authLimiter } = require("./middlewares/rateLimiter");

const authRouter = require("./routes/user.route");
const messageRouter = require("./routes/message.route");
const groupRouter = require("./routes/group.route");
const statusRouter = require("./routes/status.route");
const notificationRouter = require("./routes/notification.route");

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parser
app.use(cookieParser());

// CORS — restricted to known origins
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:5173",
      "http://localhost:5174",
    ],
    credentials: true,
  })
);

// Static files
app.use("/uploads", express.static("uploads"));

// General API rate limiter
app.use("/api", apiLimiter);

// ── Routes ──
app.use("/api/v1/auth", authLimiter, authRouter);
app.use("/api/v1/message", messageRouter);
app.use("/api/v1/group", groupRouter);
app.use("/api/v1/status", statusRouter);
app.use("/api/v1/notifications", notificationRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found ❌",
  });
});

// Global error handler
app.use(errorMiddleware);

module.exports = app;