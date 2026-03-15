import { createContext, useContext, useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({}); // { conversationId: count }
  const [activeChatId, setActiveChatId] = useState(null); // Which chat is currently open
  const socketRef = useRef(null);

  useEffect(() => {
    if (user) {
      const newSocket = io("http://localhost:3000", {
        withCredentials: true,
        transports: ["websocket", "polling"],
      });

      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
        // Join the user's own room
        newSocket.emit("join", user._id);
        
        // Request browser notification permission
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      });

      // Track online users
      newSocket.on("userOnline", ({ userId, isOnline }) => {
        setOnlineUsers((prev) => {
          if (isOnline) {
            return prev.includes(userId) ? prev : [...prev, userId];
          } else {
            return prev.filter((id) => id !== userId);
          }
        });
      });

      // Typing indicators
      newSocket.on("userTyping", ({ senderId }) => {
        setTypingUsers((prev) => ({ ...prev, [senderId]: true }));
      });

      newSocket.on("userStopTyping", ({ senderId }) => {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          delete updated[senderId];
          return updated;
        });
      });

      // Handle raw receive message globally for badges
      newSocket.on("receiveMessage", (msg) => {
        // If the message is from someone else and not in the currently open chat
        if (msg.sender._id !== user._id && msg.conversationId !== activeChatId) {
          setUnreadCounts((prev) => ({
            ...prev,
            [msg.conversationId]: (prev[msg.conversationId] || 0) + 1
          }));
        }
      });

      // Handle new notifications (toasts + browser push)
      newSocket.on("newNotification", (data) => {
        // Only trigger toast/push if the conversation is not open
        // Wait, newNotification event doesn't have conversationId universally in the payload yet, 
        // but let's just use the `activeChatId` condition safely if possible, or just show it anyway.
        // If document is hidden (backgrounded), show Native Push Notification
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          new Notification(`New message from ${data.sender || data.groupName}`, {
            body: data.content,
            icon: "/favicon.ico" // standard fallback
          });
        }
      });

      socketRef.current = newSocket;
      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
        socketRef.current = null;
      };
    }
  }, [user]);

  // Emit typing event
  const emitTyping = (receiverId) => {
    if (socket && user) {
      socket.emit("typing", { senderId: user._id, receiverId });
    }
  };

  const emitStopTyping = (receiverId) => {
    if (socket && user) {
      socket.emit("stopTyping", { senderId: user._id, receiverId });
    }
  };

  // Emit message read
  const emitMessageRead = (messageId, senderId) => {
    if (socket && user) {
      socket.emit("messageRead", {
        messageId,
        readBy: user._id,
        senderId,
      });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        onlineUsers,
        typingUsers,
        unreadCounts,
        setUnreadCounts,
        activeChatId,
        setActiveChatId,
        emitTyping,
        emitStopTyping,
        emitMessageRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
