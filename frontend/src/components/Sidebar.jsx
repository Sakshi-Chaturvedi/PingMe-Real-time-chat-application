import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { getAllUsers, getConversations, archiveChat, unarchiveChat } from "../api";
import { FiSearch, FiPlus, FiUsers, FiArchive, FiArrowLeft } from "react-icons/fi";
import CreateGroupModal from "./CreateGroupModal";
import toast from "react-hot-toast";

export default function Sidebar({ selectedChat, onSelectChat }) {
  const { user, updateUser } = useAuth();
  const { onlineUsers, typingUsers, unreadCounts, setUnreadCounts } = useSocket();
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [archivedConversations, setArchivedConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [loadingConv, setLoadingConv] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchAllConversations();
  }, []);

  useEffect(() => {
    // Re-fetch only the current view when archive state changes
    fetchConversations();
  }, [showArchived]);

  const fetchUsers = async () => {
    try {
      const { data } = await getAllUsers();
      if (data.success) setUsers(data.users);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  };

  const fetchAllConversations = async () => {
    try {
      const [activeRes, archivedRes] = await Promise.all([
        getConversations(false),
        getConversations(true)
      ]);
      if (activeRes.data.success) setConversations(activeRes.data.conversations);
      if (archivedRes.data.success) setArchivedConversations(archivedRes.data.conversations);
    } catch (err) {
      console.error("Failed to fetch all conversations:", err);
    }
  };

  const fetchConversations = async () => {
    setLoadingConv(true);
    try {
      const { data } = await getConversations(showArchived);
      if (data.success) {
        if (showArchived) setArchivedConversations(data.conversations);
        else setConversations(data.conversations);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoadingConv(false);
    }
  };

  const handleArchiveToggle = async (e, convId) => {
    e.stopPropagation();
    try {
      let res;
      if (showArchived) {
        res = await unarchiveChat(convId);
        toast.success("Chat unarchived");
      } else {
        res = await archiveChat(convId);
        toast.success("Chat archived");
      }
      
      if (res.data.success && res.data.user) {
        updateUser(res.data.user);
      }
      
      fetchAllConversations();
    } catch (err) {
      toast.error("Failed to update archive status");
    }
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const getOtherUser = (conv) => {
    if (conv.isGroup) return null;
    return conv.participants?.find((p) => p._id !== user._id);
  };

  const isOnline = (userId) => onlineUsers.includes(userId);

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {showArchived && (
            <button className="icon-btn" onClick={() => setShowArchived(false)}>
              <FiArrowLeft />
            </button>
          )}
          <h2>{showArchived ? "Archived" : "Chats"}</h2>
        </div>
        <div className="sidebar-header-actions">
          {!showArchived && (
            <button
              className="icon-btn"
              onClick={() => setShowArchived(true)}
              title="Archived Chats"
            >
              <FiArchive />
            </button>
          )}
          <button
            id="create-group-btn"
            className="icon-btn"
            onClick={() => setShowGroupModal(true)}
            title="Create Group"
          >
            <FiPlus />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="sidebar-search">
        <FiSearch className="search-icon" />
        <input
          id="sidebar-search"
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Conversations List */}
      <div className="sidebar-list">
        {/* Existing conversations */}
        {(showArchived ? archivedConversations : conversations).map((conv) => {
          const otherUser = conv.isGroup ? null : getOtherUser(conv);
          const displayName = conv.isGroup
            ? conv.groupName
            : otherUser?.username || "Unknown";
          const avatar = conv.isGroup
            ? conv.groupAvatar?.url
            : otherUser?.avatar?.url;
          const userId = conv.isGroup ? conv._id : otherUser?._id;
          const online = conv.isGroup ? false : isOnline(userId);
          const isSelected =
            selectedChat?.conversation?._id === conv._id;

          return (
            <div
              key={conv._id}
              className={`sidebar-item ${isSelected ? "active" : ""}`}
              onClick={() => {
                // Clear unread count locally when opened
                setUnreadCounts(prev => ({ ...prev, [conv._id]: 0 }));
                onSelectChat({
                  user: otherUser,
                  conversation: conv,
                  isGroup: conv.isGroup,
                });
              }}
            >
              <div className="avatar-wrapper">
                {avatar ? (
                  <img src={avatar} alt={displayName} className="avatar" />
                ) : (
                  <div className="avatar-placeholder">
                    {conv.isGroup ? (
                      <FiUsers />
                    ) : (
                      displayName?.charAt(0)?.toUpperCase()
                    )}
                  </div>
                )}
                {online && <span className="online-dot" />}
              </div>
              <div className="sidebar-item-info">
                <div className="sidebar-item-top">
                  <span className="sidebar-item-name">{displayName}</span>
                  <span className="sidebar-item-time">
                    {formatTime(conv.updatedAt)}
                  </span>
                </div>
                <div className="sidebar-item-bottom">
                  {typingUsers[userId] ? (
                    <span className="typing-text">typing...</span>
                  ) : (
                    <span className="last-message">
                      {conv.lastMessage?.message || "No messages yet"}
                    </span>
                  )}
                  {unreadCounts[conv._id] > 0 && (
                    <div className="unread-badge">{unreadCounts[conv._id]}</div>
                  )}
                  <button 
                    className="archive-item-btn" 
                    onClick={(e) => handleArchiveToggle(e, conv._id)}
                    title={showArchived ? "Unarchive chat" : "Archive chat"}
                  >
                    {showArchived ? <FiArrowLeft /> : <FiArchive />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Users without conversations (filtered) - ONLY show in main chats view */}
        {!showArchived && filteredUsers
          .filter(
            (u) =>
              // Filter out users who already have an active conversation
              !conversations.some((c) =>
                !c.isGroup && c.participants?.some((p) => p._id === u._id)
              ) &&
              // Filter out users who have an archived conversation
              !archivedConversations.some((c) =>
                !c.isGroup && c.participants?.some((p) => p._id === u._id)
              )
          )
          .map((u) => (
            <div
              key={u._id}
              className={`sidebar-item ${
                selectedChat?.user?._id === u._id ? "active" : ""
              }`}
              onClick={() =>
                onSelectChat({ user: u, conversation: null, isGroup: false })
              }
            >
              <div className="avatar-wrapper">
                {u.avatar?.url ? (
                  <img src={u.avatar.url} alt={u.username} className="avatar" />
                ) : (
                  <div className="avatar-placeholder">
                    {u.username?.charAt(0)?.toUpperCase()}
                  </div>
                )}
                {isOnline(u._id) && <span className="online-dot" />}
              </div>
              <div className="sidebar-item-info">
                <div className="sidebar-item-top">
                  <span className="sidebar-item-name">{u.username}</span>
                </div>
                <div className="sidebar-item-bottom">
                  <span className="last-message">Start a conversation</span>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Create Group Modal */}
      {showGroupModal && (
        <CreateGroupModal
          users={users}
          onClose={() => setShowGroupModal(false)}
          onCreated={(group) => {
            setConversations((prev) => [group, ...prev]);
            setShowGroupModal(false);
          }}
        />
      )}
    </div>
  );
}
