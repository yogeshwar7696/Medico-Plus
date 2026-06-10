const mongoose = require("mongoose");

const VaultSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patients",
    required: true,
  },
  name: { type: String, required: true },
  filename: { type: String, required: true },
  type: {
    type: String,
    enum: ["Prescriptions", "Invoices", "Others", "Lab Reports", "Radiology"],
    default: "Others",
  },
  size: { type: Number },
  resourceId: { type: String, default: null },
  isOrdered: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Vault", VaultSchema);
