import { useState } from "react";
import {
  FiEdit3,
  FiTrash2,
  FiBookmark,
  FiSmile,
  FiFile,
  FiDownload,
  FiCheck,
  FiCheckCircle,
  FiCornerUpRight,
} from "react-icons/fi";

// Quick reaction emojis
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

export default function MessageBubble({
  msg,
  isOwn,
  onEdit,
  onDelete,
  onReaction,
  onTogglePin,
  onForward,
  highlight,
  getFileIcon,
}) {
  const [showActions, setShowActions] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const parts = String(text).split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // System messages: centered, no actions
  if (msg.isSystemMessage) {
    return (
      <div className="system-message">
        <span>{msg.message}</span>
      </div>
    );
  }

  return (
    <div
      id={`msg-${msg._id}`}
      className={`message-bubble ${isOwn ? "own" : "other"} ${
        msg.isDeleted ? "deleted" : ""
      } ${msg.isPinned ? "pinned" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowReactions(false);
      }}
    >
      {/* Sender name (group chats) */}
      {!isOwn && msg.sender?.username && (
        <span className="msg-sender">{msg.sender.username}</span>
      )}

      {/* Pinned indicator */}
      {msg.isPinned && <span className="pin-badge">📌 Pinned</span>}

      {/* Forwarded label */}
      {msg.isForwarded && (
        <span className="forwarded-label">
          ↗ Forwarded {msg.forwardedFrom?.userId?.username && `from ${msg.forwardedFrom.userId.username}`}
        </span>
      )}

      {/* Reply reference */}
      {msg.replyTo && (
        <div className="reply-ref">
          <span>↩ {msg.replyTo.message?.substring(0, 50)}...</span>
        </div>
      )}

      {/* Media content */}
      {msg.media?.url && msg.media?.type !== "file" && (
        <div className="msg-media">
          {msg.media.type === "image" && (
            <img
              src={msg.media.url.startsWith('http') ? msg.media.url : `http://localhost:3000${msg.media.url}`}
              alt="media"
              className="msg-image"
            />
          )}
          {msg.media.type === "video" && (
            <video controls className="msg-video">
              <source src={msg.media.url.startsWith('http') ? msg.media.url : `http://localhost:3000${msg.media.url}`} />
            </video>
          )}
          {msg.media.type === "audio" && (
            <audio controls className="msg-audio">
              <source src={msg.media.url.startsWith('http') ? msg.media.url : `http://localhost:3000${msg.media.url}`} />
            </audio>
          )}
        </div>
      )}

      {/* File attachment — Feature 7 */}
      {msg.file?.url && (
        <div className="msg-file">
          <span className="file-icon">
            {getFileIcon(msg.file.mimeType)}
          </span>
          <div className="file-info">
            <span className="file-name">{highlightText(msg.file.originalName, highlight)}</span>
            <span className="file-size">
              {(msg.file.size / 1024).toFixed(1)} KB
            </span>
          </div>
          <a
            href={msg.file.url.startsWith('http') ? msg.file.url : `http://localhost:3000${msg.file.url}`}
            download={msg.file.originalName}
            className="file-download"
          >
            <FiDownload />
          </a>
        </div>
      )}

      {/* Text content */}
      {msg.message && !msg.isDeleted && (
        <p className="msg-text">{highlightText(msg.message, highlight)}</p>
      )}
      {msg.isDeleted && (
        <p className="msg-text deleted-text">
          <em>🚫 This message was deleted</em>
        </p>
      )}

      {/* Message footer */}
      <div className="msg-footer">
        <span className="msg-time">{formatTime(msg.createdAt)}</span>
        {msg.isEdited && <span className="edited-badge">edited</span>}
        {isOwn && (
          <span className="read-receipt">
            {msg.seenBy?.length > 0 ? (
              <FiCheckCircle className="read" />
            ) : (
              <FiCheck />
            )}
          </span>
        )}
      </div>

      {/* Reactions display */}
      {msg.reactions?.length > 0 && (
        <div className="reactions-display">
          {msg.reactions.map((r, i) => (
            <span key={i} className="reaction-badge" title={r.user?.username}>
              {r.emoji}
            </span>
          ))}
        </div>
      )}

      {/* Hover actions */}
      {showActions && !msg.isDeleted && (
        <div className={`msg-actions ${isOwn ? "left" : "right"}`}>
          <button
            onClick={() => setShowReactions(!showReactions)}
            title="React"
          >
            <FiSmile />
          </button>
          <button onClick={() => onTogglePin(msg._id)} title="Pin">
            <FiBookmark />
          </button>
          <button onClick={() => onForward(msg)} title="Forward">
            <FiCornerUpRight />
          </button>
          {isOwn && (
            <>
              <button onClick={() => onEdit(msg)} title="Edit">
                <FiEdit3 />
              </button>
              <button onClick={() => onDelete(msg._id)} title="Delete">
                <FiTrash2 />
              </button>
            </>
          )}
        </div>
      )}

      {/* Quick reactions picker */}
      {showReactions && (
        <div className="quick-reactions">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onReaction(msg._id, emoji);
                setShowReactions(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
