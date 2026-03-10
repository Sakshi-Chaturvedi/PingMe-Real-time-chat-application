const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { errorMiddleware } = require("./middlewares/errorMiddleware");
const authRouter = require("./routes/user.route");

const app = express();

// ? Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:5174",
      "http://localhost:5173",
    ],
    credentials: true,
  }),
);

// ? Routes
app.use("/api/v1/auth", authRouter);

// ? 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found ❌",
  });
});



app.use(errorMiddleware);

module.exports = app;
