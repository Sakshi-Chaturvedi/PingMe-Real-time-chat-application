import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import {
  getMessages,
  sendMessage,
  getGroupMessages,
  sendGroupMessage,
  markAsRead,
  editMessage as editMessageApi,
  deleteMessage as deleteMessageApi,
  addReaction,
  togglePinMessage,
  searchMessages,
  getPinnedMessages,
} from "../api";
import toast from "react-hot-toast";
import EmojiPicker from "emoji-picker-react";
import {
  FiSend,
  FiPaperclip,
  FiSmile,
  FiArrowLeft,
  FiSearch,
  FiMoreVertical,
  FiEdit3,
  FiTrash2,
  FiBookmark,
  FiCheck,
  FiCheckCircle,
  FiX,
  FiFile,
  FiDownload,
} from "react-icons/fi";
import MessageBubble from "./MessageBubble";

export default function ChatWindow({ chatData, onBack }) {
  const { user } = useAuth();
  const { socket, typingUsers, emitTyping, emitStopTyping } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [file, setFile] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showPinned, setShowPinned] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const { isGroup, conversation } = chatData;
  const otherUser = chatData.user;
  const chatId = isGroup ? conversation?._id : otherUser?._id;
  const chatName = isGroup ? conversation?.groupName : otherUser?.username;
  const isTyping = typingUsers[chatId];

  // Fetch messages
  useEffect(() => {
    if (!chatId) return;
    const fetchMessages = async () => {
      setLoading(true);
      try {
        let res;
        if (isGroup) {
          res = await getGroupMessages(chatId);
        } else {
          res = await getMessages(chatId);
        }
        if (res.data.success) {
          setMessages(res.data.messages);
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [chatId, isGroup]);

  // Mark as read when conversation opens
  useEffect(() => {
    if (conversation?._id) {
      markAsRead(conversation._id).catch(() => {});
    }
  }, [conversation?._id, messages.length]);

  // Listen for real-time messages
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      // Only add if it belongs to this conversation
      if (
        msg.conversationId === conversation?._id ||
        msg.sender?._id === otherUser?._id ||
        (isGroup && msg.conversationId === chatId)
      ) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
      }
    };

    const handleMessageEdited = (msg) => {
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === messageId
            ? { ...m, message: "This message was deleted", isDeleted: true }
            : m
        )
      );
    };

    const handleReactionUpdated = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
      );
    };

    const handlePinToggled = ({ messageId, isPinned }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isPinned } : m))
      );
    };

    socket.on("receiveMessage", handleNewMessage);
    socket.on("messageEdited", handleMessageEdited);
    socket.on("messageDeleted", handleMessageDeleted);
    socket.on("reactionUpdated", handleReactionUpdated);
    socket.on("messagePinToggled", handlePinToggled);

    return () => {
      socket.off("receiveMessage", handleNewMessage);
      socket.off("messageEdited", handleMessageEdited);
      socket.off("messageDeleted", handleMessageDeleted);
      socket.off("reactionUpdated", handleReactionUpdated);
      socket.off("messagePinToggled", handlePinToggled);
    };
  }, [socket, conversation?._id, otherUser?._id, chatId, isGroup]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Typing ──
  const handleTyping = useCallback(() => {
    if (!isGroup && otherUser?._id) {
      emitTyping(otherUser._id);
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        emitStopTyping(otherUser._id);
      }, 2000);
    }
  }, [otherUser?._id, isGroup, emitTyping, emitStopTyping]);

  // ── Send message ──
  const handleSend = async () => {
    if (!newMessage.trim() && !file) return;

    const formData = new FormData();
    formData.append("message", newMessage);
    if (file) formData.append("media", file);

    try {
      let res;
      if (isGroup) {
        res = await sendGroupMessage(chatId, formData);
      } else {
        formData.append("receiverId", otherUser._id);
        res = await sendMessage(formData);
      }
      
      // Manually append newly sent message so it shows up immediately 
      // even for new chats where conversationId isn't known yet.
      // Duplicates via socket are prevented by the `handleNewMessage` duplicate check.
      if (res && res.data && res.data.success && res.data.data) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === res.data.data._id)) return prev;
          return [...prev, res.data.data];
        });
      }

      setNewMessage("");
      setFile(null);
      setShowEmoji(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingId) {
        handleSaveEdit();
      } else {
        handleSend();
      }
    }
  };

  // ── Edit ──
  const handleStartEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.message);
  };

  const handleSaveEdit = async () => {
    try {
      await editMessageApi(editingId, editText);
      setEditingId(null);
      setEditText("");
    } catch (err) {
      toast.error("Failed to edit message");
    }
  };

  // ── Delete ──
  const handleDelete = async (msgId) => {
    try {
      await deleteMessageApi(msgId);
    } catch (err) {
      toast.error("Failed to delete message");
    }
  };

  // ── Reaction ──
  const handleReaction = async (msgId, emoji) => {
    try {
      await addReaction(msgId, emoji);
    } catch (err) {
      toast.error("Failed to add reaction");
    }
  };

  // ── Pin ──
  const handleTogglePin = async (msgId) => {
    try {
      await togglePinMessage(msgId);
    } catch (err) {
      toast.error("Failed to toggle pin");
    }
  };

  // ── Search ──
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const { data } = await searchMessages(searchQuery, conversation?._id);
      setSearchResults(data.messages || []);
    } catch {
      toast.error("Search failed");
    }
  };

  // ── Pinned ──
  const handleShowPinned = async () => {
    if (!conversation?._id) return;
    try {
      const { data } = await getPinnedMessages(conversation._id);
      setPinnedMessages(data.messages || []);
      setShowPinned(true);
    } catch {
      toast.error("Failed to fetch pinned messages");
    }
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType) return "📄";
    if (mimeType.includes("pdf")) return "📕";
    if (mimeType.includes("word") || mimeType.includes("document")) return "📘";
    if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📗";
    if (mimeType.includes("zip") || mimeType.includes("rar")) return "📦";
    return "📄";
  };

  return (
    <div className="chat-window">
      {/* Chat Header */}
      <div className="chat-header">
        <button className="back-btn mobile-only" onClick={onBack}>
          <FiArrowLeft />
        </button>
        <div className="chat-header-info">
          <h3>{chatName || "Chat"}</h3>
          {isTyping && <span className="typing-indicator">typing...</span>}
          {!isTyping && !isGroup && otherUser && (
            <span className="online-status">
              {typingUsers[otherUser._id] ? "typing..." : ""}
            </span>
          )}
        </div>
        <div className="chat-header-actions">
          <button
            className="icon-btn"
            onClick={() => setShowSearch(!showSearch)}
            title="Search"
          >
            <FiSearch />
          </button>
          <button className="icon-btn" onClick={handleShowPinned} title="Pinned">
            <FiBookmark />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button onClick={handleSearch}>
            <FiSearch />
          </button>
          <button onClick={() => { setShowSearch(false); setSearchResults([]); }}>
            <FiX />
          </button>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="search-results">
          <h4>Search Results ({searchResults.length})</h4>
          {searchResults.map((msg) => (
            <div key={msg._id} className="search-result-item">
              <strong>{msg.sender?.username}:</strong> {msg.message}
            </div>
          ))}
        </div>
      )}

      {/* Pinned Messages Panel */}
      {showPinned && (
        <div className="pinned-panel">
          <div className="pinned-header">
            <h4>📌 Pinned Messages ({pinnedMessages.length})</h4>
            <button onClick={() => setShowPinned(false)}>
              <FiX />
            </button>
          </div>
          {pinnedMessages.map((msg) => (
            <div key={msg._id} className="pinned-item">
              <strong>{msg.sender?.username}:</strong> {msg.message}
            </div>
          ))}
          {pinnedMessages.length === 0 && <p>No pinned messages</p>}
        </div>
      )}

      {/* Messages */}
      <div className="messages-container">
        {loading && <div className="loading-messages">Loading messages...</div>}
        {messages.map((msg) => (
          <MessageBubble
            key={msg._id}
            msg={msg}
            isOwn={msg.sender?._id === user._id || msg.sender === user._id}
            onEdit={handleStartEdit}
            onDelete={handleDelete}
            onReaction={handleReaction}
            onTogglePin={handleTogglePin}
            getFileIcon={getFileIcon}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Edit Bar */}
      {editingId && (
        <div className="edit-bar">
          <FiEdit3 />
          <span>Editing message</span>
          <button onClick={() => { setEditingId(null); setEditText(""); }}>
            <FiX />
          </button>
        </div>
      )}

      {/* File Preview */}
      {file && (
        <div className="file-preview">
          <span>{file.name}</span>
          <button onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
            <FiX />
          </button>
        </div>
      )}

      {/* Compose Area */}
      <div className="compose-area">
        <div className="compose-left">
          <button
            className="icon-btn"
            onClick={() => setShowEmoji(!showEmoji)}
          >
            <FiSmile />
          </button>
          <button
            className="icon-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <FiPaperclip />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>
        <div className="compose-input-wrapper">
          {editingId ? (
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Edit message..."
              autoFocus
            />
          ) : (
            <input
              id="message-input"
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
            />
          )}
        </div>
        <button
          id="send-btn"
          className="send-btn"
          onClick={editingId ? handleSaveEdit : handleSend}
        >
          {editingId ? <FiCheck /> : <FiSend />}
        </button>
      </div>

      {/* Emoji Picker */}
      {showEmoji && (
        <div className="emoji-picker-wrapper">
          <EmojiPicker
            onEmojiClick={(emojiData) => {
              setNewMessage((prev) => prev + emojiData.emoji);
              setShowEmoji(false);
            }}
            theme="auto"
            width="100%"
            height={350}
          />
        </div>
      )}
    </div>
  );
}
