const Feedback = require("../models/Feedback_Model");
const Appointment = require("../models/Appointment_Model");
const Doctor = require("../models/Doctor_Model");
const { createNotification } = require("../utils/notificationService");

exports.createFeedback = async (req, res) => {
  try {
    const {
      appointmentId,
      rating,
      comments,
      comment,
      patientId,
      patientName,
      doctorName,
    } = req.body;

    if (!appointmentId || !rating || !patientId || !doctorName) {
      return res
        .status(400)
        .json({ message: "Missing required properties in request matrix." });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res
        .status(404)
        .json({ message: "Target clinical appointment record not found." });
    }

    if (appointment.status !== "Completed") {
      return res.status(400).json({
        message:
          "Cannot submit evaluation logs for ongoing or cancelled slots.",
      });
    }
    if (appointment.hasFeedback) {
      return res.status(400).json({
        message:
          "Feedback track has already been initialized for this session.",
      });
    }

    const feedbackAsset = new Feedback({
      appointmentId,
      patientId,
      patientName: patientName ? patientName.trim() : "Verified Patient",
      doctorName,
      rating: Number(rating),
      comments: comments || comment || "",
    });
    const savedFeedback = await feedbackAsset.save();

    appointment.hasFeedback = true;
    appointment.feedbackRef = savedFeedback._id;
    await appointment.save();

    createNotification({
      userRole: "Admin",
      message: `Sentiment Update: ${savedFeedback.patientName} submitted a ${savedFeedback.rating}-star review for Dr. ${savedFeedback.doctorName}.`,
      type: "system",
    }).catch((e) =>
      console.error("Admin feedback notification failed:", e.message),
    );

    try {
      const assignedDoctor = await Doctor.findOne({
        name: savedFeedback.doctorName,
      });
      if (assignedDoctor) {
        createNotification({
          userId: assignedDoctor._id,
          userRole: "Doctor",
          message: `New Patient Review: ${savedFeedback.patientName} gave ${savedFeedback.rating}-star rating for you.`,
          type: savedFeedback.rating <= 2 ? "warning" : "appointment",
        }).catch((e) =>
          console.error("Doctor real-time broadcast failed:", e.message),
        );
      }
    } catch (docErr) {
      console.error(
        "Failed to route testimonial notification to doctor:",
        docErr.message,
      );
    }

    res.status(201).json({
      message:
        "Feedback processed and linked to appointment profile successfully.",
      data: feedbackAsset,
    });
  } catch (err) {
    console.error("Feedback Controller Engine Crash:", err);
    res.status(500).json({
      message: "Internal transactional database server error.",
      error: err.message,
    });
  }
};

exports.getFeedbackByDoctor = async (req, res) => {
  try {
    const { doctorName } = req.query;

    if (!doctorName) {
      return res
        .status(400)
        .json({ message: "doctorName parameter query is required." });
    }

    const reports = await Feedback.find({ doctorName: doctorName }).sort({
      createdAt: -1,
    });

    res.status(200).json(reports);
  } catch (err) {
    res.status(500).json({
      message: "Internal server error reading telemetry feedback layers",
      error: err.message,
    });
  }
};

exports.getAllGlobalFeedback = async (req, res) => {
  try {
    const data = await Feedback.find({}).sort({ createdAt: -1 });
    res.status(200).json(data);
  } catch (err) {
    console.error("Global Data Telemetry Failure:", err);
    res.status(500).json({
      message: "Failed to read sentiment telemetry layers.",
      error: err.message,
    });
  }
};

exports.deleteReview = async (req, res) => {
  try {
    const targetItem = await Feedback.findByIdAndDelete(req.params.id);
    if (!targetItem) {
      return res
        .status(404)
        .json({ message: "Feedback log record not found." });
    }
    res.status(200).json({ message: "Review archived successfully." });
  } catch (err) {
    res.status(500).json({
      message: "Operational feedback processing deletion failure.",
      error: err.message,
    });
  }
};
