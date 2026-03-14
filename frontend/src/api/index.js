import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:3000/api/v1",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Auth APIs ──
export const signUp = (data) => API.post("/auth/signUp", data);
export const verifyUser = (data) => API.post("/auth/verifyUser", data);
export const signIn = (data) => API.post("/auth/signIn", data);
export const signOut = () => API.get("/auth/signOut");
export const getProfile = () => API.get("/auth/profile");
export const updateProfile = (data) =>
  API.put("/auth/update-profile", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const savePushSubscription = (subscription) =>
  API.post("/auth/push-subscription", { subscription });
export const savePublicKey = (publicKey) =>
  API.post("/auth/publicKey", { publicKey });
export const getUserPublicKey = (userId) =>
  API.get(`/auth/publicKey/${userId}`);

// ── Message APIs ──
export const getAllUsers = () => API.get("/message/getAllUsers");
export const getConversations = () => API.get("/message/conversations");
export const getMessages = (receiverId) =>
  API.get(`/message/getMessages/${receiverId}`);
export const sendMessage = (data) =>
  API.post("/message/sendMessage", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const addReaction = (messageId, emoji) =>
  API.post(`/message/react/${messageId}`, { emoji });
export const removeReaction = (messageId) =>
  API.delete(`/message/react/${messageId}`);
export const editMessage = (messageId, message) =>
  API.put(`/message/edit/${messageId}`, { message });
export const deleteMessage = (messageId) =>
  API.delete(`/message/delete/${messageId}`);
export const markAsRead = (conversationId) =>
  API.put(`/message/markAsRead/${conversationId}`);
export const searchMessages = (query, conversationId) =>
  API.get("/message/search", { params: { query, conversationId } });
export const togglePinMessage = (messageId) =>
  API.put(`/message/pin/${messageId}`);
export const getPinnedMessages = (conversationId) =>
  API.get(`/message/pinned/${conversationId}`);

// ── Group APIs ──
export const createGroup = (data) =>
  API.post("/group/create", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const updateGroup = (groupId, data) =>
  API.put(`/group/update/${groupId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const addMember = (groupId, userId) =>
  API.post(`/group/addMember/${groupId}`, { userId });
export const removeMember = (groupId, userId) =>
  API.post(`/group/removeMember/${groupId}`, { userId });
export const toggleAdmin = (groupId, userId) =>
  API.put(`/group/toggleAdmin/${groupId}`, { userId });
export const leaveGroup = (groupId) =>
  API.post(`/group/leave/${groupId}`);
export const sendGroupMessage = (groupId, data) =>
  API.post(`/group/sendMessage/${groupId}`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const getGroupMessages = (groupId) =>
  API.get(`/group/messages/${groupId}`);

// ── Status APIs ──
export const createStatus = (data) =>
  API.post("/status/create", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
export const getMyStatuses = () => API.get("/status/my");
export const getAllStatuses = () => API.get("/status/all");
export const viewStatus = (statusId) =>
  API.put(`/status/view/${statusId}`);
export const deleteStatus = (statusId) =>
  API.delete(`/status/delete/${statusId}`);

export default API;
