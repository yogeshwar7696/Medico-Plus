const jwt = require("jsonwebtoken");
const Notification = require("../models/Notification_Model");
const { addClient } = require("../utils/notificationService");

// GET /api/notifications
exports.getMyNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/notifications/unread-count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });
    res.status(200).json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/notifications/:id
exports.deleteOne = async (req, res) => {
  try {
    const deleted = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!deleted) {
      return res.status(404).json({ message: "Notification not found." });
    }
    res
      .status(200)
      .json({ message: "Notification removed.", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/notifications
exports.clearAll = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user._id });
    res.status(200).json({ message: "All notifications cleared." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// PUT /api/notifications/mark-read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true } },
    );
    res.status(200).json({ message: "All notifications marked as read." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/notifications/stream?token=<jwt>
exports.stream = async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).end();

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_) {
    return res.status(401).end();
  }

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  res.write(`data: ${JSON.stringify({ event: "connected" })}\n\n`);

  const unregister = addClient(decoded.role, decoded.id, res);

  const heartbeat = setInterval(() => {
    res.write(`: ping\n\n`);
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    unregister();
  });
};
