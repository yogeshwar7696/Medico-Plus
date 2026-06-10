const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getMyNotifications,
  getUnreadCount,
  markAllAsRead,
  deleteOne,
  clearAll,
  stream,
} = require("../controllers/notificationController");

router.get("/stream", stream);
router.get("/", protect, getMyNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.put("/mark-read", protect, markAllAsRead);
router.delete("/clear", protect, clearAll);
router.delete("/:id", protect, deleteOne);

module.exports = router;
