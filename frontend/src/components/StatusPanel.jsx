import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import {
  createStatus,
  getMyStatuses,
  getAllStatuses,
  viewStatus,
  deleteStatus,
} from "../api";
import toast from "react-hot-toast";
import { BASE_URL } from "../config";
import { FiPlus, FiX, FiTrash2, FiEye } from "react-icons/fi";

export default function StatusPanel() {
  const { user } = useAuth();
  const [myStatuses, setMyStatuses] = useState([]);
  const [contactStatuses, setContactStatuses] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showViewer, setShowViewer] = useState(null); // { statuses, currentIndex }
  const [newStatus, setNewStatus] = useState({
    contentType: "text",
    text: "",
    backgroundColor: "#075e54",
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatuses();
  }, []);

  const fetchStatuses = async () => {
    try {
      const [myRes, allRes] = await Promise.all([
        getMyStatuses(),
        getAllStatuses(),
      ]);
      if (myRes.data.success) setMyStatuses(myRes.data.statuses);
      if (allRes.data.success) setContactStatuses(allRes.data.statuses);
    } catch (err) {
      console.error("Failed to fetch statuses:", err);
    }
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("contentType", newStatus.contentType);

      if (newStatus.contentType === "text") {
        formData.append("text", newStatus.text);
        formData.append("backgroundColor", newStatus.backgroundColor);
      } else {
        if (!file) {
          toast.error("Please select a file");
          setLoading(false);
          return;
        }
        formData.append("media", file);
        formData.append("caption", newStatus.text);
      }

      const { data } = await createStatus(formData);
      if (data.success) {
        toast.success("Status posted!");
        setShowCreate(false);
        setNewStatus({ contentType: "text", text: "", backgroundColor: "#075e54" });
        setFile(null);
        fetchStatuses();
      }
    } catch (err) {
      toast.error("Failed to post status");
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (groupedStatus) => {
    const statuses = groupedStatus.statuses;
    setShowViewer({ statuses, currentIndex: 0 });

    // Mark first status as viewed
    try {
      await viewStatus(statuses[0]._id);
    } catch {}
  };

  const handleNextStatus = async () => {
    if (showViewer.currentIndex < showViewer.statuses.length - 1) {
      const nextIndex = showViewer.currentIndex + 1;
      setShowViewer({ ...showViewer, currentIndex: nextIndex });
      try {
        await viewStatus(showViewer.statuses[nextIndex]._id);
      } catch {}
    } else {
      setShowViewer(null);
    }
  };

  const handleDeleteStatus = async (statusId) => {
    try {
      await deleteStatus(statusId);
      toast.success("Status deleted");
      fetchStatuses();
    } catch {
      toast.error("Failed to delete status");
    }
  };

  const bgColors = [
    "#075e54", "#128c7e", "#25d366", "#dcf8c6",
    "#e74c3c", "#9b59b6", "#3498db", "#2c3e50",
    "#f39c12", "#1abc9c", "#e91e63", "#673ab7",
  ];

  return (
    <div className="status-panel">
      <div className="sidebar-header">
        <h2>Status</h2>
        <button className="icon-btn" onClick={() => setShowCreate(true)}>
          <FiPlus />
        </button>
      </div>

      {/* My Status */}
      <div className="status-section">
        <h4 className="status-section-title">My Status</h4>
        {myStatuses.length === 0 ? (
          <div
            className="status-item my-status-add"
            onClick={() => setShowCreate(true)}
          >
            <div className="status-ring no-status">
              <div className="avatar-placeholder">+</div>
            </div>
            <div className="status-info">
              <span>Add a status</span>
              <small>Tap to add a status update</small>
            </div>
          </div>
        ) : (
          <div
            className="status-item"
            onClick={() =>
              handleView({ user, statuses: myStatuses })
            }
          >
            <div className="status-ring has-status">
              <div className="avatar-placeholder">
                {user?.username?.charAt(0)?.toUpperCase()}
              </div>
            </div>
            <div className="status-info">
              <span>My Status</span>
              <small>{myStatuses.length} updates</small>
            </div>
          </div>
        )}
      </div>

      {/* Contacts' Status */}
      <div className="status-section">
        <h4 className="status-section-title">Recent Updates</h4>
        {contactStatuses.length === 0 && (
          <p className="no-data">No recent status updates</p>
        )}
        {contactStatuses.map((group) => (
          <div
            key={group.user._id}
            className="status-item"
            onClick={() => handleView(group)}
          >
            <div
              className={`status-ring ${
                group.hasUnviewed ? "has-status" : "viewed"
              }`}
            >
              {group.user.avatar?.url ? (
                <img src={group.user.avatar.url.startsWith('http') ? group.user.avatar.url : `${BASE_URL}${group.user.avatar.url}`} alt="" className="avatar" />
              ) : (
                <div className="avatar-placeholder">
                  {group.user.username?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>
            <div className="status-info">
              <span>{group.user.username}</span>
              <small>{group.statuses.length} updates</small>
            </div>
          </div>
        ))}
      </div>

      {/* Create Status Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Status</h3>
              <button className="icon-btn" onClick={() => setShowCreate(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="status-type-selector">
                <button
                  className={newStatus.contentType === "text" ? "active" : ""}
                  onClick={() =>
                    setNewStatus({ ...newStatus, contentType: "text" })
                  }
                >
                  Text
                </button>
                <button
                  className={newStatus.contentType === "image" ? "active" : ""}
                  onClick={() =>
                    setNewStatus({ ...newStatus, contentType: "image" })
                  }
                >
                  Image
                </button>
                <button
                  className={newStatus.contentType === "video" ? "active" : ""}
                  onClick={() =>
                    setNewStatus({ ...newStatus, contentType: "video" })
                  }
                >
                  Video
                </button>
              </div>

              {newStatus.contentType === "text" ? (
                <>
                  <textarea
                    placeholder="What's on your mind?"
                    value={newStatus.text}
                    onChange={(e) =>
                      setNewStatus({ ...newStatus, text: e.target.value })
                    }
                    className="status-textarea"
                    style={{ backgroundColor: newStatus.backgroundColor, color: "#fff" }}
                    maxLength={500}
                  />
                  <div className="bg-color-picker">
                    {bgColors.map((color) => (
                      <button
                        key={color}
                        className={`color-swatch ${
                          newStatus.backgroundColor === color ? "active" : ""
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() =>
                          setNewStatus({ ...newStatus, backgroundColor: color })
                        }
                      />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <input
                    type="file"
                    accept={
                      newStatus.contentType === "image"
                        ? "image/*"
                        : "video/*"
                    }
                    onChange={(e) => setFile(e.target.files[0])}
                    className="modal-input"
                  />
                  <input
                    type="text"
                    placeholder="Add a caption..."
                    value={newStatus.text}
                    onChange={(e) =>
                      setNewStatus({ ...newStatus, text: e.target.value })
                    }
                    className="modal-input"
                  />
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleCreate}
                disabled={loading}
              >
                {loading ? "Posting..." : "Post Status"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Viewer */}
      {showViewer && (
        <div className="status-viewer" onClick={handleNextStatus}>
          <button
            className="status-viewer-close"
            onClick={(e) => {
              e.stopPropagation();
              setShowViewer(null);
            }}
          >
            <FiX />
          </button>

          {/* Progress bars */}
          <div className="status-progress-bar">
            {showViewer.statuses.map((_, i) => (
              <div
                key={i}
                className={`progress-segment ${
                  i <= showViewer.currentIndex ? "active" : ""
                }`}
              />
            ))}
          </div>

          {/* Status content */}
          {(() => {
            const current = showViewer.statuses[showViewer.currentIndex];
            if (!current) return null;
            return (
              <div
                className="status-viewer-content"
                style={
                  current.contentType === "text"
                    ? { backgroundColor: current.backgroundColor }
                    : {}
                }
              >
                {current.contentType === "text" && (
                  <p className="status-viewer-text">{current.text}</p>
                )}
                {current.contentType === "image" && (
                  <img src={current.media?.url?.startsWith('http') ? current.media.url : `${BASE_URL}${current.media.url}`} alt="status" />
                )}
                {current.contentType === "video" && (
                  <video controls autoPlay>
                    <source src={current.media?.url?.startsWith('http') ? current.media.url : `${BASE_URL}${current.media.url}`} />
                  </video>
                )}
                {current.caption && (
                  <p className="status-caption">{current.caption}</p>
                )}
                <div className="status-viewer-footer">
                  <span>
                    <FiEye /> {current.viewedBy?.length || 0} views
                  </span>
                  <span>{new Date(current.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
