const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
{
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "chatusers",
    required: true
  },

  // ── Text content ──
  message: {
    type: String,
    default: ""
  },

  // ── Media attachment (image/video/audio) ──
  media: {
    url: {
      type: String,
      default: ""
    },
    type: {
      type: String,
      enum: ["image", "video", "audio", "file"]
    }
  },

  // ── File sharing (PDFs, docs, zips) — Feature 7 ──
  file: {
    url: { type: String, default: "" },
    originalName: { type: String, default: "" },
    size: { type: Number, default: 0 },
    mimeType: { type: String, default: "" }
  },

  // ── Read receipts — Feature 1 ──
  seenBy: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "chatusers" },
      seenAt: { type: Date, default: Date.now }
    }
  ],

  // ── Message reactions — Feature 2 ──
  reactions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "chatusers" },
      emoji: { type: String, required: true }
    }
  ],

  // ── Edit / Delete — Feature 3 ──
  isEdited: { type: Boolean, default: false },
  editedAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },

  // ── End-to-End Encryption — Feature 4 ──
  // When E2EE is enabled, `message` holds the encrypted ciphertext
  isEncrypted: { type: Boolean, default: false },

  // ── Pinning — Feature 9 ──
  isPinned: { type: Boolean, default: false },
  pinnedBy: { type: mongoose.Schema.Types.ObjectId, ref: "chatusers" },
  pinnedAt: { type: Date },

  // ── Forwarding — Feature 10 ──
  isForwarded: { type: Boolean, default: false },
  forwardedFrom: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "chatusers" },
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  },

  // ── Reply/thread support ──
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message"
  },

  // ── System Messages (join/leave/admin actions) ──
  isSystemMessage: { type: Boolean, default: false },
},
{ timestamps: true }
);

// Indexes for fast message fetching
messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ conversationId: 1, isPinned: 1 });
// Text index for message search — Feature 9
messageSchema.index({ conversationId: 1, message: "text", "file.originalName": "text" });

module.exports = mongoose.model("Message", messageSchema);