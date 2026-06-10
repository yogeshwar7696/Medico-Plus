const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  userRole: {
    type: String,
    enum: ["Patient", "Doctor", "Admin"],
    required: true,
  },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ["info", "success", "warning", "error", "appointment", "system"],
    default: "info",
  },
  isRead: { type: Boolean, default: false },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 30,
  },
});

module.exports = mongoose.model("Notification", NotificationSchema);
