const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "chatusers",
      },
    ],

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },

    // ── Group Chat — Feature 5 ──
    isGroup: {
      type: Boolean,
      default: false,
    },

    groupName: {
      type: String,
      trim: true,
      maxlength: [50, "Group name cannot exceed 50 characters"],
    },

    groupAvatar: {
      public_id: { type: String, default: "" },
      url: { type: String, default: "" },
    },

    groupAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chatusers",
    },

    // Co-admins for group management
    groupAdmins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "chatusers",
      },
    ],

    groupDescription: {
      type: String,
      default: "",
      maxlength: [200, "Group description cannot exceed 200 characters"],
    },
  },
  { timestamps: true }
);

// Index for fast participant-based conversation lookups
conversationSchema.index({ participants: 1 });
conversationSchema.index({ isGroup: 1 });

module.exports = mongoose.model("Conversation", conversationSchema);
