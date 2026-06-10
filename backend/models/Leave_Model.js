const mongoose = require("mongoose");

const LeaveSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Doctor",
    required: true,
  },
  doctorName: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  leaveType: {
    type: String,
    enum: ["Full_Day", "Slot_Block"], 
    required: true,
    default: "Full_Day",
  },
  type: {
    type: String,
    required: true,
    trim: true,
    default: "Personal",
  },
  startDate: {
    type: String,
    required: true,
  },
  endDate: {
    type: String, 
    required: true,
  },
  blockedSlots: {
    type: [String], 
    default: [],
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
    priority: {
    type: String,
    enum: ["Low", "Medium", "High"],
    default: "Medium",
    required: true,
  },
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected", "Reassigned"], 
    default: "Pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.Leave || mongoose.model("Leave", LeaveSchema);
