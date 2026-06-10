const Appointment = require("../models/Appointment_Model");
const Doctor = require("../models/Doctor_Model");
const { generateDoctorSlots } = require("../utils/slotGenerator");
const { createNotification } = require("../utils/notificationService");


exports.bookAppointment = async (req, res) => {
  try {
    const { doctorName, date, time } = req.body;

    const existingConflict = await Appointment.findOne({
      doctorName,
      date,
      time,
      status: { $ne: "Cancelled" },
    });

    if (existingConflict) {
      return res.status(409).json({
        message: "This slot was just reserved. Please select a different time.",
      });
    }

    const doctor = await Doctor.findOne({ name: doctorName });
    if (doctor) {
      if (doctor.blockedSlotsByDate) {
        const activeBlocks = doctor.blockedSlotsByDate.get(date) || [];
        if (activeBlocks.includes(time)) {
          return res
            .status(409)
            .json({ message: "This slot is blocked for administrative use." });
        }
      }

      const validDynamicSlots = generateDoctorSlots(
        doctor.shiftStart,
        doctor.shiftEnd,
        doctor.doctorId || String(doctor._id),
      );

      if (!validDynamicSlots.includes(time)) {
        return res.status(400).json({
          message:
            "Selected time does not fall within the doctor's active dynamic shift schedule.",
        });
      }
    }

    const cleanPayload = {
      ...req.body,
      adminRequest: {
        requestType: "None",
        reason: "No request active",
        targetDoctorName: "None",
        status: "None",
        requestDate: new Date(),
      },
      isReassigned: false,
      originalDoctor: "None",
    };

    const newAppointment = new Appointment(cleanPayload);
    const saved = await newAppointment.save();

    createNotification({
      userId: saved.patientId,
      userRole: "Patient",
      message: `Appointment confirmed with Dr. ${saved.doctorName} on ${saved.date} at ${saved.time}.`,
      type: "appointment",
    }).catch((e) => console.error("Notification dispatch failed:", e.message));

    res.status(201).json({
      message: "Appointment successful",
      appointmentID: saved.appointmentID,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.checkAvailability = async (req, res) => {
  try {
    const { doctorName, doctor, date } = req.query;
    const target = doctorName || doctor;

    const booked = await Appointment.find({
      doctorName: target,
      date: date,
      status: { $ne: "Cancelled" },
    }).select("time");

    res.status(200).json(booked.map((appt) => appt.time));
  } catch (err) {
    res.status(500).json({ message: "Server error during slot check" });
  }
};

//  Fetch all for a specific patient
exports.getPatientAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      patientId: req.params.patientId,
    })
      .populate("feedbackRef")
      .sort({ createdAt: -1 });

    res.status(200).json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Fetch all for a specific doctor 
exports.getAppointmentsByDoctor = async (req, res) => {
  try {
    const appointments = await Appointment.find({
      doctorName: { $regex: new RegExp(req.params.name, "i") },
    }).sort({ date: 1, time: 1 });
    res.status(200).json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Finalize appointment
exports.completeAppointment = async (req, res) => {
  try {
    const { prescribedItems } = req.body;

    const updated = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: "Completed",
          prescribedItems: prescribedItems,
        },
      },
      { new: true },
    );

    createNotification({
      userId: updated.patientId,
      userRole: "Patient",
      message: `Your consultation with Dr. ${updated.doctorName} is completed. Prescriptions have been uploaded.`,
      type: "appointment",
    }).catch((e) =>
      console.error("Patient complete notification failed:", e.message),
    );

    res.status(200).json({ message: "Session finalized", data: updated });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Clinical finalization failed", error: err.message });
  }
};

//  Create Shift/Cancel Requests for Admin
exports.createAdminRequest = async (req, res) => {
  try {
    const { requestType, reason, targetDoctorName } = req.body;

    const updated = await Appointment.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          adminRequest: {
            requestType: requestType,
            reason,
            targetDoctorName: targetDoctorName || null,
            status: "Pending",
            requestDate: new Date(),
          },
        },
      },
      { new: true },
    );
    createNotification({
      userRole: "Admin",
      message: `New Request: Shift/Cancellation submitted for Appointment #${updated.appointmentID || updated._id}.`,
      type: "appointment",
    }).catch((e) =>
      console.error("Admin push request notification failed:", e.message),
    );

    res.status(200).json({ message: "Request sent to Admin", data: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getReplacementSpecialists = async (req, res) => {
  try {
    const { department, date, time } = req.query;

    const specialists = await Doctor.find({
      department,
      availability: "Available",
    });

    const busyDoctors = await Appointment.find({
      date,
      time,
      status: { $in: ["Upcoming", "Transferred"] },
    }).distinct("doctorName");

    const available = [];

    for (let doc of specialists) {
      if (busyDoctors.includes(doc.name)) continue;

      if (doc.blockedSlotsByDate) {
        const manualBlocks = doc.blockedSlotsByDate.get(date) || [];
        if (manualBlocks.includes(time)) continue;
      }

      const generatedShiftSlots = generateDoctorSlots(
        doc.shiftStart,
        doc.shiftEnd,
        doc.doctorId || String(doc._id),
      );
      if (generatedShiftSlots.includes(time)) {
        available.push(doc);
      }
    }

    res.status(200).json(available);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Registry lookup failed", error: err.message });
  }
};

//  Fetch all appointments
exports.getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({}).sort({ date: -1 });
    res.status(200).json(appointments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Direct Patient Cancellation
exports.cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: "Appointment record not found" });
    }

    appointment.status = "Cancelled";
    await appointment.save();
    createNotification({
      userId: saved.patientId,
      userRole: "Patient",
      message: `Appointment confirmed with Dr. ${saved.doctorName} on ${saved.date} at ${saved.time}.`,
      type: "appointment",
    }).catch((e) => console.error("Notification dispatch failed:", e.message));

    if (doctor) {
      createNotification({
        userId: doctor._id,
        userRole: "Doctor",
        message: `New booking: ${saved.patientName} has scheduled a slot on ${saved.date} at ${saved.time}.`,
        type: "appointment",
      }).catch((e) => console.error("Doctor notification failed:", e.message));
    }

    res.status(200).json({
      message: "Appointment cancelled successfully",
      id: req.params.id,
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal server error during cancellation",
      error: err.message,
    });
  }
};

// Change Date and Time for an existing appointment
exports.rescheduleAppointment = async (req, res) => {
  try {
    const { date, time, doctorName } = req.body;
    const { id } = req.params;

    const conflict = await Appointment.findOne({
      doctorName,
      date,
      time,
      _id: { $ne: id },
      status: { $ne: "Cancelled" },
    });

    if (conflict) {
      return res.status(409).json({
        message: "The new slot is already booked. Please choose another time.",
      });
    }

    const doctor = await Doctor.findOne({ name: doctorName });
    if (doctor) {
      if (doctor.blockedSlotsByDate) {
        const activeBlocks = doctor.blockedSlotsByDate.get(date) || [];
        if (activeBlocks.includes(time)) {
          return res.status(409).json({
            message: "The selected slot is blocked on this doctor's roster.",
          });
        }
      }

      const validDynamicSlots = generateDoctorSlots(
        doctor.shiftStart,
        doctor.shiftEnd,
        doctor.doctorId || String(doctor._id),
      );
      if (!validDynamicSlots.includes(time)) {
        return res.status(400).json({
          message:
            "The selected time falls outside of this doctor's dynamic shift hours.",
        });
      }
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      {
        $set: {
          date,
          time,
          status: "Upcoming",
          "remindersSent.threeDay": false,
          "remindersSent.oneDay": false,
          "remindersSent.missed": false,
        },
      },
      { new: true },
    );

    if (!updatedAppointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    createNotification({
      userId: updatedAppointment.patientId,
      userRole: "Patient",
      message: `Your appointment with Dr. ${updatedAppointment.doctorName} has been rescheduled to ${updatedAppointment.date} at ${updatedAppointment.time}.`,
      type: "appointment",
    }).catch((e) => console.error("Notification dispatch failed:", e.message));

    res.status(200).json({
      message: "Appointment rescheduled successfully",
      data: updatedAppointment,
    });
  } catch (err) {
    res.status(500).json({
      message: "Internal server error during rescheduling",
      error: err.message,
    });
  }
};

//  Fetch pending doctor requests
exports.getPendingAdminRequests = async (req, res) => {
  try {
    const pendingAppointments = await Appointment.find({
      "adminRequest.status": "Pending",
    }).sort({ "adminRequest.requestDate": -1 });

    const formattedRequests = pendingAppointments.map((appt) => ({
      _id: appt._id,
      appointmentId: appt._id,
      appointmentID: appt.appointmentID,
      patientName: appt.patientName,
      date: appt.date,
      time: appt.time,
      oldDate: appt.date,
      oldTime: appt.time,
      newDate:
        appt.adminRequest.requestType === "Shift"
          ? appt.adminRequest.targetDoctorName
          : "Cancellation Request",
      newTime: appt.adminRequest.requestType,
      adminRequest: {
        requestType: appt.adminRequest.requestType,
        reason: appt.adminRequest.reason,
        targetDoctorName: appt.adminRequest.targetDoctorName,
        status: appt.adminRequest.status,
        requestDate: appt.adminRequest.requestDate,
      },
    }));

    res.status(200).json(formattedRequests);
  } catch (err) {
    res.status(500).json({
      message: "Failed to compile the pending administrative ledger.",
      error: err.message,
    });
  }
};

//  Approve or Reject a Doctor's Shift/Cancel Request
exports.resolveAdminRequest = async (req, res) => {
  try {
    const { action } = req.body;
    const { id } = req.params;

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res
        .status(404)
        .json({ message: "Target appointment record not found." });
    }

    if (action === "Approved") {
      const type = appointment.adminRequest.requestType;

      if (type === "Shift") {
        appointment.originalDoctor = appointment.doctorName;
        appointment.isReassigned = true;
        appointment.doctorName = appointment.adminRequest.targetDoctorName;
        appointment.status = "Upcoming";
      } else if (type === "Cancel") {
        appointment.status = "Cancelled";
      }

      appointment.adminRequest.status = "Approved";
    } else {
      appointment.adminRequest.status = "Rejected";
    }

    const updated = await appointment.save();

    if (action === "Approved") {
      createNotification({
        userId: updated.patientId,
        userRole: "Patient",
        message:
          updated.adminRequest.requestType === "Shift"
            ? `Your appointment was reassigned to Dr. ${updated.doctorName} on ${updated.date}.`
            : `Your appointment on ${updated.date} has been cancelled by administration.`,
        type: "warning",
      }).catch((e) =>
        console.error("Patient resolve alert failed:", e.message),
      );

      if (updated.adminRequest.requestType === "Shift") {
        const targetDoc = await Doctor.findOne({ name: updated.doctorName });
        if (targetDoc) {
          createNotification({
            userId: targetDoc._id,
            userRole: "Doctor",
            message: `Reassignment: Patient ${updated.patientName} has been transferred to your appointments for ${updated.date}.`,
            type: "appointment",
          }).catch((e) => console.error("New doctor alert failed:", e.message));
        }
      }
    }

    res.status(200).json({
      message: `Administrative intervention resolved successfully as: ${action}`,
      data: updated,
    });
  } catch (err) {
    res.status(500).json({
      message: "Transactional processing failed during request resolution.",
      error: err.message,
    });
  }
};
