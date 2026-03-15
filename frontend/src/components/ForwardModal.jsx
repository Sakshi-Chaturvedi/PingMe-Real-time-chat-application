import { useState, useEffect } from "react";
import { getConversations, forwardMessage } from "../api";
import { FiX, FiSearch } from "react-icons/fi";
import toast from "react-hot-toast";

/**
 * ForwardModal — lets the user pick a conversation (DM or group) to forward a message to.
 * Props:
 *   message  — the original message object to forward
 *   onClose  — callback to close the modal
 */
export default function ForwardModal({ message, onClose }) {
  const [conversations, setConversations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getConversations()
      .then((res) => {
        if (res.data.success) setConversations(res.data.conversations || []);
      })
      .catch(() => {});
  }, []);

  const filtered = conversations.filter((c) => {
    const name = c.isGroup
      ? c.groupName
      : c.participants?.[0]?.username || "";
    return name?.toLowerCase().includes(search.toLowerCase());
  });

  const handleForward = async (conv) => {
    setLoading(true);
    try {
      const payload = conv.isGroup
        ? { groupId: conv._id }
        : { receiverId: conv.participants?.[0]?._id };

      await forwardMessage(message._id, payload);
      toast.success("Message forwarded!");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to forward");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content forward-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Forward Message</h3>
          <button className="icon-btn" onClick={onClose}>
            <FiX />
          </button>
        </div>

        <div className="forward-search">
          <FiSearch />
          <input
            type="text"
            placeholder="Search conversations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="forward-list">
          {filtered.length > 0 ? (
            filtered.map((conv) => {
              const name = conv.isGroup
                ? conv.groupName
                : conv.participants?.[0]?.username;
              const initial = name?.charAt(0)?.toUpperCase() || "?";

              return (
                <div
                  key={conv._id}
                  className="forward-item"
                  onClick={() => !loading && handleForward(conv)}
                >
                  <div className="gp-member-avatar-placeholder">{initial}</div>
                  <div className="forward-item-info">
                    <span className="forward-item-name">{name}</span>
                    {conv.isGroup && (
                      <span className="forward-item-badge">Group</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "1rem" }}>
              No conversations found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
