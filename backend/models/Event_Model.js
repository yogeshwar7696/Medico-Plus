const mongoose = require("mongoose");

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  department: {
    type: [String],
    required: true,
    default: ["General Medicine"],
  },
  date: { type: String, required: true },
  startTime: { type: String, default: "09:00 AM" },
  location: { type: String, required: true, default: "Main Auditorium" },
  type: { type: String, default: "Workshop" },
  registered: { type: Number, default: 0 },
  capacity: { type: Number, required: true, default: 100 },
  status: {
    type: String,
    enum: ["Upcoming", "Ongoing", "Completed", "Cancelled"],
    default: "Upcoming",
  },
  priority: { type: String, default: "Normal" },
  doctors: { type: [String], default: [] },
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Event || mongoose.model("Event", EventSchema);
