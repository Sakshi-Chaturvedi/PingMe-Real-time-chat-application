const express = require("express");
const isAuthenticatedUser = require("../middlewares/Auth");
const upload = require("../middlewares/multer");

const {
  createStatus,
  getMyStatuses,
  getAllStatuses,
  viewStatus,
  deleteStatus,
} = require("../controllers/status.controller");

const statusRouter = express.Router();

// ── All routes require authentication ──
statusRouter.use(isAuthenticatedUser);

// Create a new status (text or media)
statusRouter.post("/create", upload.single("media"), createStatus);

// Get my statuses
statusRouter.get("/my", getMyStatuses);

// Get all contacts' statuses
statusRouter.get("/all", getAllStatuses);

// Mark status as viewed
statusRouter.put("/view/:statusId", viewStatus);

// Delete my status
statusRouter.delete("/delete/:statusId", deleteStatus);

module.exports = statusRouter;
