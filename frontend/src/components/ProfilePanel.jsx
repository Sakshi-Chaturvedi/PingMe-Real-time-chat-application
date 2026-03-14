import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../api";
import toast from "react-hot-toast";
import { FiEdit3, FiSave, FiCamera, FiMail, FiPhone, FiUser } from "react-icons/fi";

export default function ProfilePanel() {
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const data = new FormData();
      if (formData.username !== user.username)
        data.append("username", formData.username);
      if (formData.email !== user.email) data.append("email", formData.email);
      if (formData.phone !== user.phone) data.append("phone", formData.phone);
      if (avatarFile) data.append("avatar", avatarFile);

      const res = await updateProfile(data);
      if (res.data.success) {
        updateUser(res.data.user);
        toast.success("Profile updated!");
        setEditing(false);
        setAvatarFile(null);
        setAvatarPreview(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const displayAvatar = avatarPreview || user?.avatar?.url;

  return (
    <div className="profile-panel">
      <div className="sidebar-header">
        <h2>Profile</h2>
        <button
          className="icon-btn"
          onClick={() => (editing ? handleSave() : setEditing(true))}
          disabled={loading}
        >
          {editing ? <FiSave /> : <FiEdit3 />}
        </button>
      </div>

      <div className="profile-avatar-section">
        <div className="profile-avatar-wrapper">
          {displayAvatar ? (
            <img src={displayAvatar} alt="avatar" className="profile-avatar" />
          ) : (
            <div className="profile-avatar-placeholder">
              {user?.username?.charAt(0)?.toUpperCase()}
            </div>
          )}
          {editing && (
            <label className="avatar-upload-btn">
              <FiCamera />
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarChange}
              />
            </label>
          )}
        </div>
      </div>

      <div className="profile-fields">
        <div className="profile-field">
          <FiUser className="field-icon" />
          <div className="field-content">
            <label>Username</label>
            {editing ? (
              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            ) : (
              <p>{user?.username}</p>
            )}
          </div>
        </div>
        <div className="profile-field">
          <FiMail className="field-icon" />
          <div className="field-content">
            <label>Email</label>
            {editing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            ) : (
              <p>{user?.email}</p>
            )}
          </div>
        </div>
        <div className="profile-field">
          <FiPhone className="field-icon" />
          <div className="field-content">
            <label>Phone</label>
            {editing ? (
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            ) : (
              <p>{user?.phone}</p>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <div className="profile-actions">
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <button
            className="btn-secondary"
            onClick={() => {
              setEditing(false);
              setFormData({
                username: user?.username || "",
                email: user?.email || "",
                phone: user?.phone || "",
              });
              setAvatarFile(null);
              setAvatarPreview(null);
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
