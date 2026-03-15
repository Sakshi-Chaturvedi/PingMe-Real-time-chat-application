const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chatusers",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "chatusers",
    },
    type: {
      type: String,
      enum: ["new_message", "group_add", "system"],
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model("Notification", notificationSchema);
