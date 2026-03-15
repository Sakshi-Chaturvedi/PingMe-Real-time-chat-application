import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useTheme } from "../context/ThemeContext";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import StatusPanel from "../components/StatusPanel";
import ProfilePanel from "../components/ProfilePanel";
import toast from "react-hot-toast";
import {
  FiMessageSquare,
  FiCircle,
  FiUser,
  FiLogOut,
  FiSun,
  FiMoon,
} from "react-icons/fi";
import "./Chat.css";

export default function Chat() {
  const { user, logout } = useAuth();
  const { socket, onlineUsers, setActiveChatId, activeChatId } = useSocket();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("chats"); // chats | status | profile
  const [selectedChat, setSelectedChat] = useState(null); // { user, conversation }
  const [isMobileShowChat, setIsMobileShowChat] = useState(false);

  // Sync activeChatId with the socket context
  useEffect(() => {
    setActiveChatId(selectedChat?.conversation?._id || null);
  }, [selectedChat, setActiveChatId]);

  // Hook up toast popups
  useEffect(() => {
    if (!socket) return;
    const handlePop = (data) => {
      // Avoid spamming if it's the chat we currently have open
      // The backend adds 'groupName' or 'sender' strings to newNotification
      if (document.hidden) return; // Native notification handles this
      toast.success(
        `New message from ${data.sender || data.groupName}: ${data.content}`,
        { duration: 4000, icon: '💬' }
      );
    };
    socket.on("newNotification", handlePop);
    return () => socket.off("newNotification", handlePop);
  }, [socket]);

  const handleSelectChat = (chatData) => {
    setSelectedChat(chatData);
    setIsMobileShowChat(true);
  };

  const handleBack = () => {
    setIsMobileShowChat(false);
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
  };

  return (
    <div className="chat-page">
      {/* Left Navigation Bar */}
      <nav className="nav-bar">
        <div className="nav-top">
          {/* <div className="nav-logo">💬</div> */}
          <button
            id="tab-chats"
            className={`nav-btn ${activeTab === "chats" ? "active" : ""}`}
            onClick={() => setActiveTab("chats")}
            title="Chats"
          >
            <FiMessageSquare />
          </button>
          <button
            id="tab-status"
            className={`nav-btn ${activeTab === "status" ? "active" : ""}`}
            onClick={() => setActiveTab("status")}
            title="Status"
          >
            <FiCircle />
          </button>
          <button
            id="tab-profile"
            className={`nav-btn ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
            title="Profile"
          >
            <FiUser />
          </button>
        </div>
        <div className="nav-bottom">
          <button
            id="toggle-theme"
            className="nav-btn"
            onClick={toggleTheme}
            title={theme === "dark" ? "Light Mode" : "Dark Mode"}
          >
            {theme === "dark" ? <FiSun /> : <FiMoon />}
          </button>
          <button
            id="logout-btn"
            className="nav-btn logout"
            onClick={handleLogout}
            title="Logout"
          >
            <FiLogOut />
          </button>
        </div>
      </nav>

      {/* Content Area */}
      <div className={`chat-content ${isMobileShowChat ? "show-chat" : ""}`}>
        {/* Sidebar Panel */}
        <div className="sidebar-panel">
          {activeTab === "chats" && (
            <Sidebar
              selectedChat={selectedChat}
              onSelectChat={handleSelectChat}
            />
          )}
          {activeTab === "status" && <StatusPanel />}
          {activeTab === "profile" && <ProfilePanel />}
        </div>

        {/* Chat Window */}
        <div className="chat-window-panel">
          {selectedChat ? (
            <ChatWindow
              chatData={selectedChat}
              onBack={handleBack}
            />
          ) : (
            <div className="empty-chat">
              <div className="empty-chat-icon">💬</div>
              <h2>PingMe</h2>
              <p>Select a conversation to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
