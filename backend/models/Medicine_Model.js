const mongoose = require("mongoose");

const MedicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    composition: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "General",
    },
    price: {
      type: Number,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    storage: {
      type: String,
      enum: ["Ambient", "Cold", "Frozen"],
      default: "Ambient",
    },
    batchNo: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports =
  mongoose.models.Medicines || mongoose.model("Medicines", MedicineSchema);
