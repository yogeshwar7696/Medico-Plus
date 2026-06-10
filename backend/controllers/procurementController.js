const Medicine = require("../models/Medicine_Model");
const Vault = require("../models/Vault_Model");
const { createNotification } = require("../utils/notificationService");

exports.handleAutoFulfill = async (req, res) => {
  try {
    const { vaultId, resourceId, quantity } = req.body;

    const medicine = await Medicine.findById(resourceId);
    if (!medicine) {
      return res
        .status(404)
        .json({ message: "Medicine not found in registry." });
    }

    if (medicine.stock < quantity) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${medicine.stock}, Requested: ${quantity}`,
      });
    }

    medicine.stock -= quantity;
    const updatedMed = await medicine.save();

    await Vault.findByIdAndUpdate(vaultId, { isOrdered: true });

    createNotification({
      userRole: "Admin",
      message: `Order Processed: ${quantity} units of "${updatedMed.name}" deducted and processed automatically.`,
      type: "system",
    }).catch((e) =>
      console.error("Admin auto-fulfill notice failed:", e.message),
    );

    if (updatedMed.stock < 10) {
      createNotification({
        userRole: "Admin",
        message: `Stock Warning: "${updatedMed.name}" inventory is critically low (${updatedMed.stock} left).`,
        type: "warning",
      }).catch((e) =>
        console.error("Low stock warning notification failed:", e.message),
      );
    }

    res.status(200).json({
      message: "Stock deducted and order confirmed.",
      remainingStock: updatedMed.stock,
    });
  } catch (err) {
    res.status(500).json({ message: "Procurement Error: " + err.message });
  }
};

exports.handleManualOrder = async (req, res) => {
  try {
    const { resourceId, quantity } = req.body;
    const medicine = await Medicine.findById(resourceId);

    if (!medicine) return res.status(404).json({ message: "Item not found" });

    medicine.stock += parseInt(quantity, 10);
    const restockedMed = await medicine.save();

    createNotification({
      userRole: "Admin",
      message: `Inventory Restocked: ${quantity} units manually added to "${restockedMed.name}". New Balance: ${restockedMed.stock}.`,
      type: "system",
    }).catch((e) =>
      console.error("Admin manual stock alert failed:", e.message),
    );

    res.status(200).json({
      message: "Inventory updated manually",
      newStock: restockedMed.stock,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const history = await Vault.find({ isOrdered: true }).populate({
      path: "patientId",
      model: "Patients",
    });
    res.status(200).json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
