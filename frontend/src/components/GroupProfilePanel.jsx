import { useState, useEffect } from "react";
import {
  addMember,
  removeMember,
  toggleAdmin,
  leaveGroup,
  getAllUsers,
  getSharedMedia,
} from "../api";
import {
  FiX,
  FiUserPlus,
  FiLogOut,
  FiShield,
  FiTrash2,
} from "react-icons/fi";
import toast from "react-hot-toast";
import { BASE_URL } from "../config";

export default function GroupProfilePanel({
  conversation,
  currentUser,
  onClose,
  onGroupUpdated,
}) {
  const [allUsers, setAllUsers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [media, setMedia] = useState([]);

  const isAdmin = conversation.groupAdmins?.some(
    (a) => (a._id || a).toString() === currentUser._id
  );
  const isCreator =
    (conversation.groupAdmin?._id || conversation.groupAdmin)?.toString() ===
    currentUser._id;

  useEffect(() => {
    // Fetch all users for "Add Member" dropdown
    getAllUsers()
      .then((res) => setAllUsers(res.data.users || []))
      .catch(() => {});

    // Fetch shared media
    if (conversation._id) {
      getSharedMedia(conversation._id)
        .then((res) => {
          if (res.data.success) setMedia(res.data.media);
        })
        .catch(() => {});
    }
  }, [conversation._id]);

  const nonMembers = allUsers.filter(
    (u) =>
      !conversation.participants.some(
        (p) => (p._id || p).toString() === u._id
      )
  );

  const handleAddMember = async (userId) => {
    try {
      await addMember(conversation._id, userId);
      toast.success("Member added");
      setShowAddMember(false);
      onGroupUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add member");
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await removeMember(conversation._id, userId);
      toast.success("Member removed");
      onGroupUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to remove member");
    }
  };

  const handleToggleAdmin = async (userId) => {
    try {
      const res = await toggleAdmin(conversation._id, userId);
      toast.success(res.data.message);
      onGroupUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to toggle admin");
    }
  };

  const handleLeave = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    try {
      await leaveGroup(conversation._id);
      toast.success("Left group");
      onClose();
      // Force sidebar to refresh — caller should handle
      onGroupUpdated?.();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to leave group");
    }
  };

  const createdDate = conversation.createdAt
    ? new Date(conversation.createdAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="group-profile-panel">
      <div className="gp-header">
        <button className="icon-btn" onClick={onClose} title="Close">
          <FiX />
        </button>
        <h3>Group Info</h3>
      </div>

      <div className="gp-scrollview">
        {/* Hero */}
        <div className="gp-hero">
          {conversation.groupAvatar?.url ? (
            <img
              src={conversation.groupAvatar.url}
              alt={conversation.groupName}
              className="gp-avatar"
            />
          ) : (
            <div className="gp-avatar-placeholder">
              {conversation.groupName?.charAt(0)?.toUpperCase() || "G"}
            </div>
          )}
          <h2>{conversation.groupName}</h2>
          {conversation.groupDescription && (
            <p className="gp-desc">{conversation.groupDescription}</p>
          )}
          <span className="gp-created">
            Created {createdDate} · {conversation.participants?.length} members
          </span>
        </div>

        {/* Members */}
        <div className="gp-section">
          <div className="gp-section-header">
            <h4>Members</h4>
          </div>

          {isAdmin && (
            <>
              <button
                className="gp-add-member-btn"
                onClick={() => setShowAddMember(!showAddMember)}
              >
                <FiUserPlus /> Add Member
              </button>
              {showAddMember && (
                <div className="add-member-dropdown">
                  {nonMembers.length > 0 ? (
                    nonMembers.map((u) => (
                      <div
                        key={u._id}
                        className="am-item"
                        onClick={() => handleAddMember(u._id)}
                      >
                        <div className="gp-member-avatar-placeholder">
                          {u.username?.charAt(0)?.toUpperCase()}
                        </div>
                        <span>{u.username}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{ padding: "0.8rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      No more users to add
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {conversation.participants?.map((member) => {
            const memberId = (member._id || member).toString();
            const isMemberAdmin = conversation.groupAdmins?.some(
              (a) => (a._id || a).toString() === memberId
            );
            const isMemberCreator =
              (
                conversation.groupAdmin?._id || conversation.groupAdmin
              )?.toString() === memberId;
            const isMe = memberId === currentUser._id;

            return (
              <div key={memberId} className="gp-member-item">
                {member.avatar?.url ? (
                  <img
                    src={member.avatar.url}
                    alt={member.username}
                    className="gp-member-avatar"
                  />
                ) : (
                  <div className="gp-member-avatar-placeholder">
                    {member.username?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="gp-member-info">
                  <span className="gp-member-name">
                    {member.username}
                    {isMe && " (You)"}
                  </span>
                  {isMemberCreator && (
                    <span className="gp-admin-badge">Group Creator</span>
                  )}
                  {isMemberAdmin && !isMemberCreator && (
                    <span className="gp-admin-badge">Admin</span>
                  )}
                </div>

                {/* Admin controls */}
                {isAdmin && !isMe && !isMemberCreator && (
                  <div className="gp-member-actions">
                    {isCreator && (
                      <button
                        onClick={() => handleToggleAdmin(memberId)}
                        title={isMemberAdmin ? "Remove Admin" : "Make Admin"}
                      >
                        <FiShield />
                      </button>
                    )}
                    <button
                      className="danger"
                      onClick={() => handleRemoveMember(memberId)}
                      title="Remove from group"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Shared Media */}
        <div className="gp-section">
          <div className="gp-section-header">
            <h4>Shared Media ({media.length})</h4>
          </div>
          {media.length > 0 ? (
            <div className="media-grid">
              {media.map((msg) => {
                const url = msg.media?.url || msg.file?.url || "";
                const fullUrl = url.startsWith("http")
                  ? url
                  : `${BASE_URL}${url}`;
                const isImage =
                  url.match(/\.(jpeg|jpg|gif|png)$/i) != null ||
                  msg.media?.type === "image";

                return (
                  <div key={msg._id} className="media-grid-item">
                    {isImage && url ? (
                      <img src={fullUrl} alt="Shared" />
                    ) : (
                      <div className="file-box">
                        📎 {msg.media?.type === "video" ? "Video" : "Doc"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="no-media-text">No media shared yet.</p>
          )}
        </div>

        {/* Leave Group */}
        <div className="gp-section">
          <button className="gp-leave-btn" onClick={handleLeave}>
            <FiLogOut /> Leave Group
          </button>
        </div>
      </div>
    </div>
  );
}
