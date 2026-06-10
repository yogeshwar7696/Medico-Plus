const mongoose = require("mongoose");

const AppointmentSchema = new mongoose.Schema(
  {
    appointmentID: { type: String, unique: true },
    patientName: { type: String, required: true },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patients",
      required: true,
    },
    doctorName: { type: String, required: true },
    department: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    type: { type: String, default: "Consultation" },
    hasFeedback: {
      type: Boolean,
      default: false,
    },
    feedbackRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Feedback",
      default: null,
    },
    status: {
      type: String,
      enum: ["Upcoming", "Completed", "Cancelled", "Transferred"],
      default: "Upcoming",
    },
    prescribedItems: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId },
        name: { type: String, required: true },
        type: { type: String, enum: ["Medicine", "Test"], required: true },
        price: { type: Number, default: 0 },
        quantity: { type: Number, default: 1 },
        timing: {
          morning: { type: Boolean, default: false },
          afternoon: { type: Boolean, default: false },
          night: { type: Boolean, default: false },
        },
        intake: { type: String, default: "After Food" },
        instruction: { type: String, default: "With Water" },
      },
    ],
    adminRequest: {
      requestType: {
        type: String,
        enum: ["Cancel", "Shift", "None"],
        default: "None",
      },
      reason: { type: String, default: "No request active" },
      targetDoctorName: { type: String, default: "None" },
      status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected", "None"],
        default: "None",
      },
      requestDate: { type: Date, default: Date.now },
    },
    isReassigned: { type: Boolean, default: false },
    originalDoctor: { type: String, default: "None" },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

AppointmentSchema.pre("save", async function () {
  if (!this.isNew) return;
  try {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const datePrefix = `${year}${month}${day}`;

    const countToday = await this.constructor.countDocuments({
      appointmentID: { $regex: new RegExp(`^${datePrefix}`) },
    });

    const sequence = String(countToday + 1).padStart(2, "0");
    this.appointmentID = `${datePrefix}-${sequence}`;
  } catch (err) {
    throw err;
  }
});

module.exports = mongoose.model("Appointments", AppointmentSchema);
