import { useState, useEffect } from "react";
import { getUserProfile, getSharedMedia, blockUser, unblockUser } from "../api";
import { FiX, FiPhone, FiMail, FiCalendar, FiInfo, FiSlash, FiUserPlus } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import "./UserProfilePanel.css";

export default function UserProfilePanel({ user, conversationId, onClose, isGroup }) {
  const { user: currentUser, updateUser: setCurrentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      try {
        if (!isGroup && user?._id) {
          const profileRes = await getUserProfile(user._id);
          if (profileRes.data.success) {
            setProfile(profileRes.data.user);
          }
        }
        
        if (conversationId) {
          const mediaRes = await getSharedMedia(conversationId);
          if (mediaRes.data.success) {
            setMedia(mediaRes.data.media);
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile or media", err);
        toast.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user?._id, conversationId, isGroup]);

  const isBlocked = !isGroup && profile && currentUser?.blockedUsers?.includes(profile._id);

  const handleBlockToggle = async () => {
    if (!profile) return;
    setBlocking(true);
    try {
      if (isBlocked) {
        const res = await unblockUser(profile._id);
        if (res.data.success) {
          toast.success("User unblocked");
          setCurrentUser({
            ...currentUser,
            blockedUsers: currentUser.blockedUsers.filter(id => id !== profile._id)
          });
        }
      } else {
        const res = await blockUser(profile._id);
        if (res.data.success) {
          toast.success("User blocked");
          setCurrentUser({
            ...currentUser,
            blockedUsers: [...(currentUser.blockedUsers || []), profile._id]
          });
        }
      }
    } catch (err) {
      console.error("Block toggle failed", err);
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setBlocking(false);
    }
  };

  if (loading) {
    return (
      <div className="user-profile-panel loading">
        <div className="spinner"></div>
      </div>
    );
  }

  // If it's a group, we just show limited info for now and shared media.
  const displayAvatar = isGroup ? user?.groupAvatar?.url : profile?.avatar?.url;
  const displayName = isGroup ? user?.groupName : profile?.username;
  const displayPhone = profile?.phone;
  const displayEmail = profile?.email;
  const joinedDate = profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : null;

  return (
    <div className="user-profile-panel slide-in">
      <div className="profile-header">
        <button className="icon-btn" onClick={onClose} title="Close Profile">
          <FiX />
        </button>
        <h3>Contact Info</h3>
      </div>
      
      <div className="profile-scrollview">
        <div className="profile-hero">
          <div className="profile-avatar-wrapper">
            {displayAvatar ? (
              <img src={displayAvatar} alt={displayName} className="profile-large-avatar" />
            ) : (
              <div className="profile-avatar-placeholder">
                {displayName?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </div>
          <h2>{displayName}</h2>
          {!isGroup && <span className="profile-phone">{displayPhone || "No Phone Number"}</span>}
        </div>

        {!isGroup && (
          <div className="profile-section">
            <div className="info-row">
              <FiInfo className="info-icon" />
              <div className="info-content">
                <span className="info-label">About</span>
                <span className="info-value">Hey there! I am using PingMe.</span>
              </div>
            </div>
            {displayEmail && (
              <div className="info-row">
                <FiMail className="info-icon" />
                <div className="info-content">
                  <span className="info-label">Email</span>
                  <span className="info-value">{displayEmail}</span>
                </div>
              </div>
            )}
            {joinedDate && (
              <div className="info-row">
                <FiCalendar className="info-icon" />
                <div className="info-content">
                  <span className="info-label">Joined</span>
                  <span className="info-value">{joinedDate}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="profile-section media-section">
          <h4>Shared Media ({media.length})</h4>
          {media.length > 0 ? (
            <div className="media-grid">
              {media.map((msg) => {
                const url = msg.media?.url || msg.file?.url || "";
                const fullUrl = url.startsWith("http") ? url : `http://localhost:3000${url}`;
                const isImage = url.match(/\.(jpeg|jpg|gif|png)$/i) != null || (msg.media?.type === "image");
                
                return (
                  <div key={msg._id} className="media-grid-item">
                    {isImage && url ? (
                      <img src={fullUrl} alt="Shared" />
                    ) : (
                      <div className="file-box">📎 {msg.media?.type === 'video' ? 'Video' : 'Doc'}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
             <p className="no-media-text">No media shared yet.</p>
          )}
        </div>

        {!isGroup && profile && (
          <div className="profile-section actions-section">
            <button 
              className={`block-btn ${isBlocked ? 'unblock' : ''}`} 
              onClick={handleBlockToggle}
              disabled={blocking}
            >
              {isBlocked ? <FiUserPlus /> : <FiSlash />}
              {isBlocked ? "Unblock User" : "Block User"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
