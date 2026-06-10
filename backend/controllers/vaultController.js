const Vault = require("../models/Vault_Model");
const fs = require("fs");
const path = require("path");
const { createNotification } = require("../utils/notificationService");

exports.getPatientVault = async (req, res) => {
  try {
    const { patientId } = req.params;
    const records = await Vault.find({ patientId }).sort({ createdAt: -1 });
    res.status(200).json(records);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error accessing vault", error: err.message });
  }
};

exports.uploadRecord = async (req, res) => {
  try {
    const { patientId, type } = req.body;

    if (!req.file) {
      return res.status(400).json({
        message:
          "File data element not intercepted by Multer middleware wrapper.",
      });
    }

    const newRecord = new Vault({
      patientId,
      name: req.file.originalname,
      filename: req.file.filename,
      type: type || "Others",
      size: req.file.size,
    });

    const savedRecord = await newRecord.save();

    createNotification({
      userId: savedRecord.patientId,
      userRole: "Patient",
      message: `New Document: Your [${savedRecord.type}] report (${savedRecord.name}) has been uploaded into your vault.`,
      type: "appointment",
    }).catch((e) =>
      console.error("Patient vault notification failed:", e.message),
    );

    res.status(201).json({
      message: "Clinical asset archived successfully",
      data: savedRecord,
    });
  } catch (err) {
    console.error("CRITICAL VAULT UPLOAD CRASH LOG STATEMENT:", err);
    res.status(500).json({
      message: "Internal system transaction failure.",
      error: err.message,
    });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const { vaultId } = req.params;
    const record = await Vault.findById(vaultId);

    if (!record) {
      return res.status(404).json({ message: "Vault document not found." });
    }

    if (
      req.user.role === "Patient" &&
      record.patientId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: "You do not have permission to delete this vault document.",
      });
    }

    const filePath = path.join(
      __dirname,
      "..",
      "uploads",
      "vault",
      record.filename,
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await record.deleteOne();
    res.status(200).json({ message: "Vault document deleted successfully." });
  } catch (err) {
    console.error("Vault delete failed:", err);
    res.status(500).json({
      message: "Failed to delete vault document.",
      error: err.message,
    });
  }
};