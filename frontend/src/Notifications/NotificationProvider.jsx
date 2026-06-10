import {
  React,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import axios from "axios";
import NotificationToast from "./NotificationToast";

const API = "http://localhost:5000/api/notifications";

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
  removeOne: () => {},
  clearAll: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export default function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);
  const esRef = useRef(null);

  const token = localStorage.getItem("token");

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const { data } = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.isRead).length);
    } catch (err) {
      console.error(err.message);
    }
  }, [token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!token) return;

    const es = new EventSource(
      `${API}/stream?token=${encodeURIComponent(token)}`,
    );
    esRef.current = es;

    es.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        if (payload.event === "notification" && payload.notification) {
          const notif = payload.notification;
          setNotifications((prev) => [notif, ...prev]);
          setUnreadCount((c) => c + 1);
          setToast(notif);
        }
      } catch (_) {}
    };

    es.onerror = () => {
      console.warn("Notification stream interrupted, browser will retry.");
    };

    return () => es.close();
  }, [token]);

  const markAllRead = useCallback(async () => {
    if (!token || unreadCount === 0) return;
    try {
      await axios.put(
        `${API}/mark-read`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err.message);
    }
  }, [token, unreadCount]);

  const removeOne = useCallback(
    async (id) => {
      if (!token) return;
      let wasUnread = false;
      setNotifications((prev) => {
        const target = prev.find((n) => n._id === id);
        if (target && !target.isRead) wasUnread = true;
        return prev.filter((n) => n._id !== id);
      });
      if (wasUnread) setUnreadCount((c) => Math.max(0, c - 1));

      try {
        await axios.delete(`${API}/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error(err.message);
        refresh();
      }
    },
    [token, refresh],
  );

  const clearAll = useCallback(async () => {
    if (!token) return;
    const snapshot = notifications;
    setNotifications([]);
    setUnreadCount(0);
    try {
      await axios.delete(`${API}/clear`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error(err.message);
      setNotifications(snapshot);
      setUnreadCount(snapshot.filter((n) => !n.isRead).length);
    }
  }, [token, notifications]);

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllRead, removeOne, clearAll }}
    >
      {children}
      {toast && (
        <NotificationToast
          notification={toast}
          onClose={() => setToast(null)}
        />
      )}
    </NotificationContext.Provider>
  );
}
