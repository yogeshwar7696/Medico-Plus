const mongoose = require("mongoose");

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  head: {
    type: String,
    required: true,
    trim: true,
  },
  doctors: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
    },
  ],
  doctorCount: {
    type: Number,
    default: 0,
  },
  budget: {
    type: Number,
    default: 0,
  },
  patientCount: {
    type: Number,
    default: 0,
  },
  location: {
    type: String,
    default: "Main Block",
  },
  status: {
    type: String,
    enum: ["Active", "Maintenance", "Decommissioned"],
    default: "Active",
  },
  color: {
    type: String,
    default: "#007acc",
  },
  rating: {
    type: Number,
    default: 4.5,
  },
  operatingHours: {
    type: String,
    default: "24/7",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports =
  mongoose.models.Department || mongoose.model("Department", DepartmentSchema);
