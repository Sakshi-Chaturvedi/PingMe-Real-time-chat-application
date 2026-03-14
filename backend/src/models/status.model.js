const mongoose = require("mongoose");

// ── Status / Story Feature — Feature 10 ──
const statusSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chatusers",
      required: true,
    },

    // Status content — either text or media
    contentType: {
      type: String,
      enum: ["text", "image", "video"],
      required: true,
    },

    // Text content (for text statuses)
    text: {
      type: String,
      maxlength: [500, "Status text cannot exceed 500 characters"],
    },

    // Background color for text statuses
    backgroundColor: {
      type: String,
      default: "#075e54",
    },

    // Media content
    media: {
      url: { type: String, default: "" },
      public_id: { type: String, default: "" },
    },

    caption: {
      type: String,
      default: "",
      maxlength: [200, "Caption cannot exceed 200 characters"],
    },

    // Who has viewed this status
    viewedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "chatusers" },
        viewedAt: { type: Date, default: Date.now },
      },
    ],

    // Auto-expire after 24 hours
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expires: 0 }, // MongoDB TTL — auto-deletes when expired
    },
  },
  { timestamps: true }
);

statusSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Status", statusSchema);
