const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const PatientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    photo: { type: String, default: "https://i.pravatar.cc/150?u=default" },
    contact: { type: String, required: false },
    age: { type: Number, required: false },
    gender: { type: String, required: false },
    bloodGroup: { type: String, required: false },
    height: { type: String, required: false },
    weight: { type: String, required: false },
    disease: { type: String, required: false },
    address: { type: String, required: false },
    registrationDate: {
      type: String,
      default: () => new Date().toLocaleDateString(),
    },
    emergencyContact: { type: String, required: false, default: "" },
    dob: { type: String },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true },
);

PatientSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  if (this.password.startsWith("$2b$") || this.password.startsWith("$2a$")) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

module.exports =
  mongoose.models.Patients || mongoose.model("Patients", PatientSchema);
