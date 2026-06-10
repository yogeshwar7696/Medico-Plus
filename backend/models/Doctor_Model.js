const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const DoctorSchema = new mongoose.Schema(
  {
    doctorId: {
      type: String,
      required: true,
      unique: true,
    },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    degrees: { type: String, required: true },
    department: { type: String, required: true },
    age: { type: Number },
    experience: { type: String },
    branch: { type: String },
    fee: { type: Number },
    availability: {
      type: String,
      enum: ["Available", "On Leave", "Busy"],
      default: "Available",
    },
    shiftStart: {
      type: String,
      default: "09:00",
    },
    shiftEnd: {
      type: String,
      default: "17:00",
    },
    blockedSlotsByDate: {
      type: Map,
      of: [String],
      default: new Map(),
    },
    bio: {
      type: String,
      default:
        "Dedicated medical professional committed to patient-centered care.",
    },
    phone: { type: String },
    photo: { type: String },
    signaturePath: { type: String },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true },
);

DoctorSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  if (this.password.startsWith("$2b$") || this.password.startsWith("$2a$")) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

module.exports =
  mongoose.models.Doctor || mongoose.model("Doctor", DoctorSchema);
