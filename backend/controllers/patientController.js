const Patient = require("../models/Patient_Model");
const Appointment = require("../models/Appointment_Model");
const { createNotification } = require("../utils/notificationService");

exports.getDashboardData = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id === "Guest User") {
      return res.status(400).json({
        message:
          "Aborted lookup: Cannot fetch clinical dashboard matrix for an unauthenticated Guest Session framework.",
      });
    }

    const appointments = await Appointment.find({ patientId: id });
    res.status(200).json(appointments);
  } catch (err) {
    console.error("Dashboard controller crash trace:", err);
    res
      .status(500)
      .json({ message: "Error fetching dashboard data", error: err.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id === "Guest User") {
      return res.status(400).json({
        message: "Profile access restricted for anonymous system guests.",
      });
    }

    const patient = await Patient.findById(id);
    if (!patient) {
      return res.status(404).json({
        message: "Patient clinical record profile folder not found.",
      });
    }

    res.status(200).json(patient);
  } catch (err) {
    res.status(500).json({
      message: "Internal server error during profile registry access.",
    });
  }
};

exports.updatePatientProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id === "Guest User") {
      return res.status(400).json({
        message: "Modifications restricted for anonymous profiles.",
      });
    }

    let updateData = { ...req.body };

    if (req.file) {
      updateData.photo = req.file.filename;
    }

    const updatedPatient = await Patient.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updatedPatient) {
      return res.status(404).json({
        message: "Target document no longer tracks in registration database.",
      });
    }

    res.status(200).json({ user: updatedPatient });
  } catch (err) {
    console.error("Profile saving crash trace log:", err);
    res.status(500).json({ message: "Update failed", error: err.message });
  }
};

exports.getAllPatients = async (req, res) => {
  try {
    const patients = await Patient.find({}).select("-password");
    res.status(200).json(patients);
  } catch (err) {
    res.status(500).json({ message: "Error fetching clinical registry" });
  }
};
