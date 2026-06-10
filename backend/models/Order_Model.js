const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    orderID: { type: String, unique: true }, 
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patients",
      required: true,
    },
    patientName: { type: String, required: true },
    items: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
        name: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        type: { type: String, enum: ["Medicine", "Test"], required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Pending", "Processing", "Dispatched", "Completed", "Cancelled"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Paid"],
      default: "Unpaid",
    },
  },
  { timestamps: true },
);

OrderSchema.pre("save", async function () {
  if (!this.isNew) return;
  const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  this.orderID = `ORD-${datePrefix}-${randomSuffix}`;
});

module.exports = mongoose.model("Orders", OrderSchema);
