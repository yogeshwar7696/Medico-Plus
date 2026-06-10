const { createNotification } = require("../utils/notificationService");
const Event = require("../models/Event_Model");
const Doctor = require("../models/Doctor_Model");

exports.getAllEvents = async (req, res) => {
  try {
    const databaseLogs = await Event.find({}).sort({ date: 1 });
    res.status(200).json(databaseLogs);
  } catch (err) {
    res.status(500).json({
      message: "Failed to read event registry telemetry layers.",
      error: err.message,
    });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      department,
      date,
      location,
      type,
      capacity,
      startTime,
      notes,
      doctors,
      priority,
    } = req.body;

    if (!title || !department || !date || !location) {
      return res
        .status(400)
        .json({ message: "Missing core registration properties." });
    }

    const freshEvent = new Event({
      title,
      department: Array.isArray(department) ? department : [department],
      date,
      location,
      type: type || "Workshop",
      capacity: Number(capacity) || 100,
      startTime: startTime || "09:00 AM",
      priority: priority || "Normal",
      doctors: Array.isArray(doctors) ? doctors : [],
      notes: notes || "",
    });

    const savedRecord = await freshEvent.save();

    // 1. Broadcast event initialization down Admin interface pipes
    createNotification({
      userRole: "Admin",
      message: `Event Scheduled: "${savedRecord.title}" (${savedRecord.type}) has been scheduled for ${savedRecord.date} at ${savedRecord.startTime}.`,
      type: "system",
    }).catch((e) => console.error("Admin event alert failed:", e.message));

    // 2. Loop through speaker panel name strings to locate Doctor documents and push personalized alerts
    if (Array.isArray(savedRecord.doctors) && savedRecord.doctors.length > 0) {
      savedRecord.doctors.forEach(async (docName) => {
        try {
          const docDoc = await Doctor.findOne({ name: docName });
          if (docDoc) {
            createNotification({
              userId: docDoc._id,
              userRole: "Doctor",
              message: `Event Invitation: You have been invented for an event "${savedRecord.title}" on ${savedRecord.date}.`,
              type: "appointment",
            });
          }
        } catch (err) {
          console.error(
            `Failed to dispatch event notice to ${docName}:`,
            err.message,
          );
        }
      });
    }

    res.status(201).json(savedRecord);
  } catch (err) {
    res.status(500).json({
      message: "Internal transactional server failure.",
      error: err.message,
    });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const targetAsset = await Event.findByIdAndDelete(req.params.id);
    if (!targetAsset) {
      return res
        .status(404)
        .json({ message: "Target document registry item not found." });
    }
    // 1. Alert Admin dashboards regarding roster drop
    createNotification({
      userRole: "Admin",
      message: `Event Cancellation: "${targetAsset.title}" scheduled for ${targetAsset.date} has been canceled.`,
      type: "warning",
    }).catch((e) =>
      console.error("Admin event delete alert failed:", e.message),
    );

    // 2. Alert panel doctors that the event has been pulled down
    if (Array.isArray(targetAsset.doctors)) {
      targetAsset.doctors.forEach(async (docName) => {
        try {
          const docDoc = await Doctor.findOne({ name: docName });
          if (docDoc) {
            createNotification({
              userId: docDoc._id,
              userRole: "Doctor",
              message: `Cancellation Notice: The medical event "${targetAsset.title}" on ${targetAsset.date} has been canceled.`,
              type: "warning",
            });
          }
        } catch (err) {
          console.error(err);
        }
      });
    }

    res.status(200).json({
      message: "Medical event successfully removed from active schema indexes.",
    });
  } catch (err) {
    res.status(500).json({
      message: "Operational processing failure during archival sequence.",
      error: err.message,
    });
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const {
      title,
      department,
      date,
      location,
      type,
      capacity,
      startTime,
      notes,
      doctors,
      priority,
    } = req.body;

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          title,
          department: Array.isArray(department) ? department : [department],
          date,
          location,
          type,
          capacity: Number(capacity),
          startTime,
          notes,
          doctors: Array.isArray(doctors) ? doctors : [],
          priority,
        },
      },
      { new: true, runValidators: true },
    );

    if (!updatedEvent) {
      return res
        .status(404)
        .json({ message: "Target medical event record not found." });
    }
    // 1. Broadcast profile adjustments to Admin panel streams
    createNotification({
      userRole: "Admin",
      message: `Event Modification: Event Details updated for "${updatedEvent.title}".`,
      type: "system",
    }).catch((e) =>
      console.error("Admin event update alert failed:", e.message),
    );

    // 2. Re-verify listed panel specialists regarding modifications
    if (Array.isArray(updatedEvent.doctors)) {
      updatedEvent.doctors.forEach(async (docName) => {
        try {
          const docDoc = await Doctor.findOne({ name: docName });
          if (docDoc) {
            createNotification({
              userId: docDoc._id,
              userRole: "Doctor",
              message: `Event Modification : Schedules "${updatedEvent.title}" have been updated.`,
              type: "system",
            });
          }
        } catch (err) {
          console.error(err);
        }
      });
    }

    res.status(200).json(updatedEvent);
  } catch (err) {
    console.error("Event Update Controller Crash:", err);
    res.status(500).json({
      message: "Failed to process database document update log.",
      error: err.message,
    });
  }
};
