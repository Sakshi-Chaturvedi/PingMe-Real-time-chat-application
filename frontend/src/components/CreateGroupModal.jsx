import { useState, useRef } from "react";
import { createGroup } from "../api";
import toast from "react-hot-toast";
import { FiX, FiUsers, FiCheck, FiCamera } from "react-icons/fi";

export default function CreateGroupModal({ users, onClose, onCreated }) {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const toggleUser = (userId) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (selectedUsers.length < 2) {
      toast.error("Select at least 2 members");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("groupName", groupName);
      formData.append("groupDescription", description);
      formData.append("participants", JSON.stringify(selectedUsers));
      if (avatarFile) formData.append("media", avatarFile);

      const { data } = await createGroup(formData);
      if (data.success) {
        toast.success("Group created!");
        onCreated(data.group);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create group");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <FiUsers /> Create Group
          </h3>
          <button className="icon-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>
        <div className="modal-body">
          {/* Avatar Upload */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'var(--bg-active)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', overflow: 'hidden', position: 'relative',
              }}
              onClick={() => fileRef.current?.click()}
              title="Upload group avatar"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <FiCamera style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }} />
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files[0];
                if (f) {
                  setAvatarFile(f);
                  setAvatarPreview(URL.createObjectURL(f));
                }
              }}
            />
          </div>
          <input
            type="text"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="modal-input"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="modal-input"
          />
          <p className="modal-label">
            Select members ({selectedUsers.length} selected)
          </p>
          <div className="user-select-list">
            {users.map((u) => (
              <div
                key={u._id}
                className={`user-select-item ${
                  selectedUsers.includes(u._id) ? "selected" : ""
                }`}
                onClick={() => toggleUser(u._id)}
              >
                <div className="avatar-placeholder small">
                  {u.username?.charAt(0)?.toUpperCase()}
                </div>
                <span>{u.username}</span>
                {selectedUsers.includes(u._id) && (
                  <FiCheck className="check-icon" />
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
