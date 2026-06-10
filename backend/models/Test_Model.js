const mongoose = require("mongoose");

const TestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["Radiology", "Pathology", "Cardiology", "Neurology", "General"],
      default: "General",
    },
    price: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
    },
    sampleRequired: {
      type: String,
      default: "None",
    },
    turnaroundTime: {
      type: String,
      default: "24 Hours",
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Tests", TestSchema);
