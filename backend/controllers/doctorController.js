const Doctor = require("../models/Doctor_Model");
const mongoose = require("mongoose");
const Leave = require("../models/Leave_Model");
const Appointment = require("../models/Appointment_Model");
const { generateDoctorSlots } = require("../utils/slotGenerator");
const { createNotification } = require("../utils/notificationService");

exports.getAllDoctors = async (req, res) => {
  try {
    const doctors = await Doctor.find(
      {},
      "doctorId name email department specialization availability fee branch photo degrees experience",
    );
    res.status(200).json(doctors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getDoctorById = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ doctorId: req.params.id });
    if (!doctor)
      return res.status(404).json({ message: "Doctor record not found" });
    res.status(200).json(doctor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.registerDoctor = async (req, res) => {
  try {
    const lastDoc = await Doctor.findOne().sort({ createdAt: -1 });
    let newId = "DOC-001";

    if (lastDoc && lastDoc.doctorId) {
      const lastNum = parseInt(lastDoc.doctorId.split("-")[1], 10);
      newId = `DOC-${String(lastNum + 1).padStart(3, "0")}`;
    }

    const doctorData = {
      ...req.body,
      fee: Number(req.body.fee) || 0,
      doctorId: newId,
      photo: req.file ? req.file.filename : null,
    };

    const newDoctor = new Doctor(doctorData);
    await newDoctor.save();

    res.status(201).json({
      message: "Specialist successfully onboarded to registry.",
      doctorId: newId,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateDoctorProfile = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    if (req.files) {
      if (req.files["signature"] && req.files["signature"][0]) {
        updateData.signaturePath = req.files["signature"][0].filename;
      }
      if (req.files["photo"] && req.files["photo"][0]) {
        updateData.photo = req.files["photo"][0].filename;
      }
    } else if (req.file) {
      if (req.file.fieldname === "signature") {
        updateData.signaturePath = req.file.filename;
      } else {
        updateData.photo = req.file.filename;
      }
    }

    if (updateData.fee) updateData.fee = Number(updateData.fee);
    if (updateData.password === "" || !updateData.password)
      delete updateData.password;

    const updatedDoctor = await Doctor.findOneAndUpdate(
      { doctorId: id },
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updatedDoctor)
      return res.status(404).json({ message: "Doctor not found" });

    // Inform the practitioner directly that security credentials or bio configs have changed
    createNotification({
      userId: updatedDoctor._id,
      userRole: "Doctor",
      message:
        "Profile Updated: Your clinical profile have been updated.",
      type: "system",
    }).catch((e) =>
      console.error(
        "Doctor profile alteration notification failed:",
        e.message,
      ),
    );

    res.status(200).json({
      message: "Clinical profile configurations updated successfully",
      user: updatedDoctor,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateAvailabilityStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await Doctor.findOneAndUpdate(
      { doctorId: id },
      { $set: { availability: status } },
      { new: true },
    );

    res.status(200).json({
      message: `Clinical status changed to ${status}`,
      availability: updated.availability,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getPerformanceStats = async (req, res) => {
  try {
    const { id } = req.params;
    const doctor = await Doctor.findOne({ doctorId: id });

    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    res.status(200).json({
      labels: ["Q1", "Q2", "Q3", "Q4"],
      stats: [88, 92, 95, 94],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAvailableReplacements = async (req, res) => {
  try {
    const { date, time, department } = req.query;

    let queryCondition = {
      availability: { $ne: "On Leave" },
    };

    if (department && department.trim() !== "") {
      queryCondition.department = department;
    }

    if (req.user && req.user._id) {
      queryCondition._id = { $ne: req.user._id };
    }

    const availableDoctors = await Doctor.find(queryCondition);
    const activeRegistryReplacements = [];

    for (let doc of availableDoctors) {
      if (doc.blockedSlotsByDate) {
        const approvedBlocks = doc.blockedSlotsByDate.get(date) || [];
        if (approvedBlocks.includes(time)) continue;
      }

      const dynamicSlots = generateDoctorSlots(
        doc.shiftStart || "09:00",
        doc.shiftEnd || "17:00",
        String(doc._id),
      );
      if (dynamicSlots.includes(time)) {
        activeRegistryReplacements.push(doc);
      }
    }

    const mappedDoctors = activeRegistryReplacements.map((doc) => ({
      _id: doc._id,
      name: doc.name,
      department: doc.department,
      doctorId: doc.doctorId,
    }));

    return res.status(200).json(mappedDoctors);
  } catch (err) {
    console.error("Replacements department lookup failed:", err);
    return res
      .status(500)
      .json({ message: "Internal Server Error matching department lines" });
  }
};

exports.getDoctorAvailabilityByDate = async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    let doctor = null;

    if (mongoose.Types.ObjectId.isValid(doctorId)) {
      doctor = await Doctor.findById(doctorId);
    }

    if (!doctor) {
      doctor = await Doctor.findOne({ doctorId: doctorId });
    }

    if (!doctor) {
      return res.status(200).json({
        date,
        slotsConfigMatrix: [],
        blockedSlots: [],
        pendingAdminSlots: [],
      });
    }

    const dynamicTotalDaySlots = generateDoctorSlots(
      doctor.shiftStart || "09:00",
      doctor.shiftEnd || "17:00",
      doctor.doctorId || String(doctor._id),
    );

    let activeAppointments = [];
    try {
      activeAppointments = await Appointment.find({
        doctorName: doctor.name,
        date: date,
        status: "Upcoming",
      }).distinct("time");
    } catch (e) {
      console.warn("Appointment query fallback bypass triggered.");
    }

    let rawApprovedBlocks = [];
    if (doctor.blockedSlotsByDate) {
      if (typeof doctor.blockedSlotsByDate.get === "function") {
        rawApprovedBlocks = doctor.blockedSlotsByDate.get(date) || [];
      } else {
        rawApprovedBlocks = doctor.blockedSlotsByDate[date] || [];
      }
    }

    try {
      const activeLeavesOnThisDate = await Leave.find({
        doctor: doctor._id,
        startDate: { $lte: date },
        endDate: { $gte: date },
      });

      activeLeavesOnThisDate.forEach((leave) => {
        if (leave.status === "Approved" || leave.status === "Reassigned") {
          if (leave.leaveType === "Full_Day") {
            rawApprovedBlocks.push("FULL_DAY_LEAVE");
          } else if (
            leave.leaveType === "Slot_Block" &&
            Array.isArray(leave.blockedSlots)
          ) {
            rawApprovedBlocks.push(...leave.blockedSlots);
          }
        }
      });
    } catch (leaveErr) {
      console.error("Historical date leave calculation failure:", leaveErr);
    }

    let rawPendingAdminSlots = [];
    try {
      const pendingLeaveRequests = await Leave.find({
        doctor: doctor._id,
        startDate: date,
        leaveType: "Slot_Block",
        status: "Pending",
      });

      pendingLeaveRequests.forEach((req) => {
        if (Array.isArray(req.blockedSlots)) {
          rawPendingAdminSlots.push(...req.blockedSlots);
        }
      });
    } catch (e) {
      console.error("Pending leave collection mapping intercept failed:", e);
    }

    const cleanAppointments = activeAppointments.map((slot) =>
      String(slot).trim(),
    );
    const cleanApprovedBlocks = rawApprovedBlocks.map((slot) =>
      String(slot).trim(),
    );
    const cleanPendingAdminSlots = rawPendingAdminSlots.map((slot) =>
      String(slot).trim(),
    );

    const confirmedBlockedSet = new Set([
      ...cleanAppointments,
      ...cleanApprovedBlocks,
    ]);

    return res.status(200).json({
      date,
      slotsConfigMatrix: dynamicTotalDaySlots,
      blockedSlots: Array.from(confirmedBlockedSet),
      pendingAdminSlots: [...new Set(cleanPendingAdminSlots)],
    });
  } catch (err) {
    console.error("Aggregation crash context:", err);
    return res.status(500).json({
      message: "Internal error parsing availability timelines.",
      error: err.message,
    });
  }
};

exports.updateSlotAvailability = async (req, res) => {
  try {
    const { doctorId, date, slot, status } = req.body;
    const doctor = await Doctor.findById(doctorId);

    if (!doctor) return res.status(404).json({ message: "Doctor not found." });

    if (
      !doctor.blockedSlotsByDate ||
      typeof doctor.blockedSlotsByDate.set !== "function"
    ) {
      doctor.blockedSlotsByDate = new Map();
    }

    let currentBlocks = doctor.blockedSlotsByDate.get(date) || [];

    if (status === "unavailable") {
      if (!currentBlocks.includes(slot)) currentBlocks.push(slot);
    } else {
      currentBlocks = currentBlocks.filter((s) => s !== slot);
    }

    doctor.blockedSlotsByDate.set(date, currentBlocks);
    doctor.markModified("blockedSlotsByDate");
    const updatedDoctorWithSlots = await doctor.save();

    // Broadcast manually configured scheduling constraints to Admin terminal
    createNotification({
      userRole: "Admin",
      message: `Leave Request: ${updatedDoctorWithSlots.name} applied leaves for ${slot} on ${date}.`,
      type: "system",
    }).catch((e) =>
      console.error("Admin roster block notification failed:", e.message),
    );

    res.status(200).json({
      message: "Slot configurations synchronized cleanly.",
      blockedSlots: currentBlocks,
    });
  } catch (err) {
    console.error("Update Slot Crash Error:", err.message);
    res.status(500).json({
      message: "Failed to write availability mutation rule.",
      error: err.message,
    });
  }
};