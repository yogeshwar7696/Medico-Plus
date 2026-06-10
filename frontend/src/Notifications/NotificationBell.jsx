import React, { useState, useRef, useEffect } from "react";
import { Bell, Trash2 } from "lucide-react";
import { useNotifications } from "./NotificationProvider";
import "./Notifications.css";

function timeAgo(date) {
  const d = new Date(date);
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, removeOne, clearAll } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) markAllRead();
  };

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  return (
    <div className="notif_bell_wrap" ref={wrapRef}>
      <button
        className="pat_nav_notif_hub"
        onClick={toggle}
        aria-label="Open notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif_bell_badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif_panel">
          <div className="notif_panel_header">
            <div>
              <strong>Notifications</strong>
              <span>{notifications.length} total</span>
            </div>
            {notifications.length > 0 && (
              <button
                className="notif_clear_btn"
                onClick={clearAll}
                title="Clear all notifications"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="notif_panel_list">
            {notifications.length === 0 && (
              <div className="notif_empty">You're all caught up.</div>
            )}

            {unread.length > 0 && (
              <>
                <div className="notif_section">Recent</div>
                {unread.map((n) => (
                  <NotifRow key={n._id} n={n} onRemove={removeOne} />
                ))}
              </>
            )}

            {read.length > 0 && (
              <>
                <div className="notif_section">Earlier</div>
                {read.map((n) => (
                  <NotifRow key={n._id} n={n} muted onRemove={removeOne} />
                ))}
              </>
            )}
          </div>

          <div className="notif_panel_footer">
            Notifications auto-delete after 30 days.
          </div>
        </div>
      )}
    </div>
  );
}

function NotifRow({ n, muted, onRemove }) {
  return (
    <div className={`notif_row ${muted ? "notif_row_read" : ""}`}>
      <span className={`notif_dot notif_dot_${n.type || "info"}`} />
      <div className="notif_row_body">
        <p>{n.message}</p>
        <span>{timeAgo(n.createdAt)}</span>
      </div>
      <button
        className="notif_row_remove"
        onClick={() => onRemove(n._id)}
        title="Remove"
        aria-label="Remove notification"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
