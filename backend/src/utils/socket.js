const { Server } = require("socket.io");

let io;

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map();

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:5174",
      ],
      credentials: true,
    },
    // Performance: enable binary parser and set ping interval
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // ── User joins their own room (for targeted messages) ──
    socket.on("join", (userId) => {
      if (!userId) return;
      socket.join(userId);

      // Track this socket for the user
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);

      // Broadcast online status to all clients
      io.emit("userOnline", { userId, isOnline: true });

      console.log(`User ${userId} joined room (socket: ${socket.id})`);
    });

    // ── Typing indicators ──
    socket.on("typing", ({ senderId, receiverId }) => {
      if (receiverId) {
        socket.to(receiverId).emit("userTyping", { senderId });
      }
    });

    socket.on("stopTyping", ({ senderId, receiverId }) => {
      if (receiverId) {
        socket.to(receiverId).emit("userStopTyping", { senderId });
      }
    });

    // ── Read receipts ──
    socket.on("messageRead", ({ messageId, readBy, senderId }) => {
      if (senderId) {
        socket.to(senderId).emit("messageReadReceipt", { messageId, readBy });
      }
    });

    // ── Disconnect handling ──
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);

      // Find which user this socket belongs to and remove it
      for (const [userId, sockets] of onlineUsers.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);

          // If no more sockets for this user, they are offline
          if (sockets.size === 0) {
            onlineUsers.delete(userId);
            io.emit("userOnline", { userId, isOnline: false });
          }
          break;
        }
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

// Helper: check if a user is currently online
const isUserOnline = (userId) => {
  return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
};

// Helper: get list of all online user IDs
const getOnlineUserIds = () => {
  return Array.from(onlineUsers.keys());
};

module.exports = { initSocket, getIO, isUserOnline, getOnlineUserIds };