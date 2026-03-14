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
        emitTyping,
        emitStopTyping,
        emitMessageRead,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
