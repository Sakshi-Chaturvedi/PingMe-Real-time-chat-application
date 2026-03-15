# PingMe - Modern Real-Time Chat Application 🚀

PingMe is a high-performance, full-stack real-time messaging application designed to provide a seamless communication experience across devices. Inspired by modern platforms like WhatsApp and Telegram, PingMe combines robust backend architecture with a dynamic, responsive frontend to deliver instant messaging, media sharing, and rich social interactions.

---

## ✨ Key Features

### 📨 Messaging Excellence
- **Real-Time Communication**: Instant message delivery and updates powered by Socket.IO.
- **One-to-One & Group Chats**: Seamlessly transition between private DMs and collaborative group environments.
- **Reply System**: Contextualize conversations by replying directly to specific messages with smooth "scroll-to" navigation.
- **Rich Media Support**: Share images, videos, audio, and documents effortlessly via Cloudinary integration.
- **Message Management**: Edit your sent messages, delete them for everyone, or forward them to other contacts/groups.
- **Pinned Messages**: Keep important information at the top of your chat for quick reference.

### 👤 User & Social Features
- **User Authentication**: Secure Signup/Login with JWT-based sessions and account verification.
- **Status Stories**: Share temporary text or media updates with your contacts (WhatsApp-style "Status").
- **Typing Indicators**: Real-time feedback showing when someone is drafting a response.
- **Online/Offline Status**: Track contact availability with live status updates.
- **Profile Customization**: Personalize your profile with avatars, bios, and usernames.
- **Block & Archive**: Manage your privacy by blocking users or archiving inactive conversations.

### 🔍 Advanced Capabilities
- **Powerful Search**: Quickly find specific messages within a conversation using full-text search.
- **Message Pagination**: Optimized loading of chat history for improved performance in long conversations.
- **Live Notifications**: Stay updated with instant in-app and browser-based notifications for new messages.
- **Read Receipts**: Visual confirmation when your messages have been seen by the receiver.

---

## 🛠️ Tech Stack

### Backend
- **Node.js & Express.js**: Scalable and fast server-side environment.
- **MongoDB & Mongoose**: Flexible NoSQL document database for reliable data storage.
- **Socket.IO**: Bi-directional, real-time communication engine.
- **JWT (JSON Web Tokens)**: Secure stateless authentication for API sessions.
- **Cloudinary**: Cloud-based image and video management and delivery.
- **Multer**: Middleware for handling multipart/form-data for file uploads.

### Frontend
- **React.js**: Modern component-based UI library.
- **Vite**: Ultra-fast build tool and dev server.
- **React Router**: Client-side routing for seamless navigation.
- **Socket.IO Client**: Robust real-time connection from the frontend.
- **React Icons**: A comprehensive set of modern icons for enhanced UI.

---

## 🏗️ Project Architecture

The project follows a clean, modular structure for maximum maintainability:

### Backend Structure (`/backend/src`)
- `models/`: Mongoose schemas for Users, Messages, Groups, Status, and Notifications.
- `controllers/`: Logic for handling API requests and business processes.
- `routes/`: Express endpoint definitions grouped by feature area (Auth, Msg, Group, etc.).
- `middlewares/`: Security (Helmet), Rate Limiting, Authentication, and Error handling.
- `utils/`: Reusable helpers including the Socket.IO initialization and email services.

### Frontend Structure (`/frontend/src`)
- `components/`: Modular UI elements like ChatWindow, Sidebar, and ProfilePanels.
- `pages/`: Top-level views (Login, Chat, Register).
- `context/`: Global state management for Authentication and Socket connections.
- `api/`: Centralized Axios-based service for backend communication.

---

## 📡 Real-Time Mechanics (Socket.IO)

The real-time engine is the heart of PingMe, handling the following events:
- `join`: Associates a user's socket with their unique ID room.
- `receiveMessage`: Delivers new messages instantly to recipients.
- `userTyping` / `userStopTyping`: Manages local typing indicators.
- `userOnline` / `disconnect`: Updates cross-client availability status.
- `reactionUpdated`: Synchronizes message emojis across all participants.

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/Sakshi-Chaturvedi/PingMe-Real-time-chat-application.git
cd PingMe-Real-time-chat-application
```

### 2. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
FRONTEND_URL=http://localhost:5173
```
Start the server:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```
Start the frontend dev server:
```bash
npm run dev
```

---

## 🛣️ Key API Endpoints

| Feature | Method | Endpoint |
|---------|--------|----------|
| **Auth** | POST | `/api/v1/auth/signUp` |
| **Auth** | POST | `/api/v1/auth/signIn` |
| **Messages** | GET | `/api/v1/message/getMessages/:id` |
| **Messages** | POST | `/api/v1/message/sendMessage` |
| **Groups** | POST | `/api/v1/group/create` |
| **Status** | GET | `/api/v1/status/all` |

---

## 🔮 Future Improvements
- [ ] End-to-End Encryption (E2EE) messaging enhancements.
- [ ] Voice and Video Calling capabilities.
- [ ] Multi-device sync support.
- [ ] Message scheduling and self-destructing messages.

---

## 👩‍💻 Author
**Sakshi Chaturvedi**
- GitHub: [Sakshi-Chaturvedi](https://github.com/Sakshi-Chaturvedi)
