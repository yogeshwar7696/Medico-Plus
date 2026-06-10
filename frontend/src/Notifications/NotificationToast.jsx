import React, { useEffect } from "react";
import { Bell, X } from "lucide-react";
import "./Notifications.css";

export default function NotificationToast({ notification, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [notification, onClose]);

  return (
    <div className={`notif_toast notif_toast_${notification.type || "info"}`}>
      <Bell size={18} className="notif_toast_icon" />
      <div className="notif_toast_body">
        <strong>New Notification</strong>
        <p>{notification.message}</p>
      </div>
      <button
        className="notif_toast_close"
        onClick={onClose}
        aria-label="close"
      >
        <X size={14} />
      </button>
    </div>
  );
}
