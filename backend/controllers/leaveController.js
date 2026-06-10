const Leave = require("../models/Leave_Model");
const Doctor = require("../models/Doctor_Model");
const Appointment = require("../models/Appointment_Model");
const mongoose = require("mongoose");
const { generateDoctorSlots } = require("../utils/slotGenerator");
const { createNotification } = require("../utils/notificationService");

exports.applyLeave = async (req, res) => {
  try {
    const {
      doctorId,
      leaveType,
      startDate,
      endDate,
      blockedSlots,
      reason,
      type,
    } = req.body;

    const doctor = await Doctor.findOne({
      $or: [
        ...(mongoose.Types.ObjectId.isValid(doctorId)
          ? [{ _id: doctorId }]
          : []),
        { doctorId: doctorId },
      ],
    });

    if (!doctor)
      return res.status(404).json({ message: "Doctor profile not found." });

    if (leaveType === "Slot_Block") {
      const existingPendingBlock = await Leave.findOne({
        doctor: doctor._id,
        startDate: startDate,
        leaveType: "Slot_Block",
        status: "Pending",
      });

      if (existingPendingBlock) {
        existingPendingBlock.blockedSlots = blockedSlots;
        existingPendingBlock.reason = reason;
        await existingPendingBlock.save();

        return res.status(200).json({
          message: "Roster hour allocations synchronized cleanly.",
          data: existingPendingBlock,
        });
      }
    }

    const newLeave = new Leave({
      doctor: doctor._id,
      doctorName: doctor.name,
      department: doctor.department || "General Medicine",
      leaveType,
      startDate,
      endDate: leaveType === "Full_Day" ? endDate : startDate,
      blockedSlots: leaveType === "Slot_Block" ? blockedSlots : [],
      reason: `${type ? "[" + type + "] " : ""}${reason}`.trim(),
      status: "Pending",
    });

    await newLeave.save();

    createNotification({
      userRole: "Admin",
      message: `Leave Alert: ${newLeave.doctorName} (${newLeave.department}) requested leave for [${newLeave.leaveType}] starting ${newLeave.startDate}.`,
      type: "system",
    }).catch((e) =>
      console.error("Admin leave application notice failed:", e.message),
    );

    res.status(201).json({
      message: "Absence application logged successfully.",
      data: newLeave,
    });
  } catch (err) {
    console.error("Apply Leave Exception Error:", err.message);
    res
      .status(500)
      .json({ message: "Database transaction rejected.", error: err.message });
  }
};

const getDatesRangeArray = (startStr, endStr) => {
  const dates = [];
  let curr = new Date(startStr);
  const stop = new Date(endStr);
  while (curr <= stop) {
    dates.push(curr.toISOString().split("T")[0]);
    curr.setDate(curr.getDate() + 1);
  }
  return dates;
};

exports.approveAndReallocateLeave = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const leave = await Leave.findById(leaveId);

    if (!leave) {
      return res.status(404).json({ message: "Leave log node missing." });
    }
    if (leave.status !== "Pending") {
      return res
        .status(400)
        .json({ message: "This audit timeline loop is already closed." });
    }

    const peerDoctors = await Doctor.find({
      department: leave.department,
      _id: { $ne: leave.doctor },
      availability: "Available",
    });

    let conflictQuery = {
      doctorName: leave.doctorName,
      status: "Upcoming",
    };

    if (leave.leaveType === "Full_Day") {
      conflictQuery.date = { $gte: leave.startDate, $lte: leave.endDate };
    } else {
      conflictQuery.date = leave.startDate;
      conflictQuery.time = { $in: leave.blockedSlots };
    }

    const conflictingAppointments = await Appointment.find(conflictQuery);
    const reallocationLogs = [];

    for (let appt of conflictingAppointments) {
      let reallocated = false;

      for (let peer of peerDoctors) {
        const hasConflict = await Appointment.findOne({
          doctorName: peer.name,
          date: appt.date,
          time: appt.time,
          status: "Upcoming",
        });

        if (!hasConflict) {
          appt.doctorName = peer.name;
          appt.notes = `${appt.notes || ""}\n[Auto-Reallocated to ${peer.name} due to approved leave]`;
          await appt.save();

          reallocationLogs.push({
            appointmentId: appt._id,
            status: "Transferred",
            assignedTo: peer.name,
            slot: appt.time,
          });
          reallocated = true;
          break;
        }
      }

      if (!reallocated && peerDoctors.length > 0) {
        const selectedPeer = peerDoctors[0];
        const standardClinicalSlots = generateDoctorSlots(
          selectedPeer.shiftStart || "09:00",
          selectedPeer.shiftEnd || "17:00",
        );

        const peerBusySlots = await Appointment.find({
          doctorName: selectedPeer.name,
          date: appt.date,
          status: "Upcoming",
        }).distinct("time");

        const openSlotFallback = standardClinicalSlots.find(
          (slot) => !peerBusySlots.includes(slot),
        );

        if (openSlotFallback) {
          appt.doctorName = selectedPeer.name;
          const originalSlot = appt.time;
          appt.time = openSlotFallback;
          appt.notes = `${appt.notes || ""}\n[Rescheduled from ${originalSlot} to ${openSlotFallback} with ${selectedPeer.name}]`;
          await appt.save();

          reallocationLogs.push({
            appointmentId: appt._id,
            status: "Rescheduled",
            assignedTo: selectedPeer.name,
            slot: openSlotFallback,
          });
          reallocated = true;
        }
      }

      if (!reallocated) {
        appt.adminRequest = {
          requestType: "Shift",
          reason: "Leave Conflict: Automatic allocation exhausted.",
          targetDoctorName: "None",
          status: "Pending",
          requestDate: new Date(),
        };
        appt.notes = `${appt.notes || ""}\n[Leave Conflict: Flagged for manual administrative dispatch routing]`;
        await appt.save();

        reallocationLogs.push({
          appointmentId: appt._id,
          status: "Manual Review Required",
          assignedTo: "None",
          slot: appt.time,
        });
      }
    }

    const finalStatus =
      req.body.status === "Rejected"
        ? "Rejected"
        : reallocationLogs.length > 0
          ? "Reassigned"
          : "Approved";
    leave.status = finalStatus;
    await leave.save();

    const doctor = await Doctor.findById(leave.doctor);
    if (doctor) {
      if (
        !doctor.blockedSlotsByDate ||
        typeof doctor.blockedSlotsByDate.set !== "function"
      ) {
        doctor.blockedSlotsByDate = new Map();
      }

      if (leave.leaveType === "Full_Day" || !leave.leaveType) {
        const targetedDates = getDatesRangeArray(
          leave.startDate,
          leave.endDate,
        );
        targetedDates.forEach((dateStr) => {
          let currentBlocks = doctor.blockedSlotsByDate.get(dateStr) || [];
          if (!currentBlocks.includes("FULL_DAY_LEAVE")) {
            currentBlocks.push("FULL_DAY_LEAVE");
            doctor.blockedSlotsByDate.set(dateStr, currentBlocks);
          }
        });
      } else if (leave.leaveType === "Slot_Block") {
        const targetedDate = leave.startDate;
        let currentBlocks = doctor.blockedSlotsByDate.get(targetedDate) || [];
        const uniqueBlocksSet = new Set([
          ...currentBlocks,
          ...leave.blockedSlots,
        ]);
        doctor.blockedSlotsByDate.set(
          targetedDate,
          Array.from(uniqueBlocksSet),
        );
      }

      doctor.markModified("blockedSlotsByDate");
      await doctor.save();
    }

    createNotification({
      userId: leave.doctor,
      userRole: "Doctor",
      message: `Leave Update: Your leave application starting ${leave.startDate} has been marked as [${finalStatus}].`,
      type: finalStatus === "Rejected" ? "warning" : "appointment",
    }).catch((e) =>
      console.error("Doctor leave update alert failed:", e.message),
    );

    reallocationLogs.forEach(async (log) => {
      try {
        const affectedAppt = await Appointment.findById(log.appointmentId);
        if (!affectedAppt) return;

        if (log.status === "Transferred" || log.status === "Rescheduled") {
          createNotification({
            userId: affectedAppt.patientId,
            userRole: "Patient",
            message:
              log.status === "Transferred"
                ? `Transfer Alert: Your session was transferred to Dr. ${log.assignedTo} on ${affectedAppt.date} at ${affectedAppt.time}.`
                : `Reschedule Alert: Your session was rescheduled with Dr. ${log.assignedTo} to ${affectedAppt.date} at ${log.slot}.`,
            type: "appointment",
          });

          const peerDoc = await Doctor.findOne({ name: log.assignedTo });
          if (peerDoc) {
            createNotification({
              userId: peerDoc._id,
              userRole: "Doctor",
              message: `Reschedule Alert: Patient ${affectedAppt.patientName} has been transferred to your schedule for ${affectedAppt.date}.`,
              type: "appointment",
            });
          }
        } else if (log.status === "Manual Review Required") {
          createNotification({
            userRole: "Admin",
            message: `Reschedule Deficit: Appointment #${affectedAppt.appointmentID || affectedAppt._id} requires manual reassignment review.`,
            type: "warning",
          });
        }
      } catch (err) {
        console.error(
          "Cascading notification dispatcher failed for log block:",
          err.message,
        );
      }
    });

    return res.status(200).json({
      message:
        "Leave processed successfully. Cascading redistribution complete.",
      conflictsProcessed: conflictingAppointments.length,
      auditTelemetry: reallocationLogs,
      status: finalStatus,
    });
  } catch (err) {
    console.error("Cascading Engine Crash Exception:", err);
    return res
      .status(500)
      .json({ message: "Processing path crashed.", error: err.message });
  }
};

exports.reallocateDirectAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetDoctorName, adjustedTime } = req.body;

    const appointment = await Appointment.findById(id);
    if (!appointment)
      return res.status(404).json({ message: "Appointment record missing." });

    appointment.doctorName = targetDoctorName;
    if (adjustedTime) {
      const originalTime = appointment.time;
      appointment.time = adjustedTime;
      appointment.notes = `${appointment.notes || ""}\n[Manual Reallocation: Adjusted from ${originalTime} to ${adjustedTime} with Dr. ${targetDoctorName}]`;
    } else {
      appointment.notes = `${appointment.notes || ""}\n[Manual Reallocation: Exact slot transfer approved with Dr. ${targetDoctorName}]`;
    }

    await appointment.save();

    createNotification({
      userId: appointment.patientId,
      userRole: "Patient",
      message: adjustedTime
        ? `Appointment Update: Your appointment has been moved to Dr. ${targetDoctorName} on ${appointment.date} at ${adjustedTime}.`
        : `Appointment Update: Your appointment has been transferred to Dr. ${targetDoctorName} on ${appointment.date}.`,
      type: "appointment",
    }).catch((e) =>
      console.error("Manual reallocation patient alert failed:", e.message),
    );

    try {
      const receivingDoc = await Doctor.findOne({ name: targetDoctorName });
      if (receivingDoc) {
        createNotification({
          userId: receivingDoc._id,
          userRole: "Doctor",
          message: `Appointment Alert: Patient ${appointment.patientName} has been opted to your schedule for ${appointment.date}.`,
          type: "appointment",
        });
      }
    } catch (e) {
      console.error(e);
    }

    res
      .status(200)
      .json({ message: "Appointment rerouted cleanly.", data: appointment });
  } catch (err) {
    res.status(500).json({
      message: "Direct reallocation routing failed.",
      error: err.message,
    });
  }
};

exports.rejectLeaveRequest = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const leave = await Leave.findById(leaveId);

    if (!leave)
      return res.status(404).json({ message: "Leave log node missing." });

    leave.status = "Rejected";
    await leave.save();

    createNotification({
      userId: leave.doctor,
      userRole: "Doctor",
      message: `Leave Update: Your leave application for ${leave.startDate} has been declined by administration.`,
      type: "warning",
    }).catch((e) =>
      console.error("Doctor leave rejection alert failed:", e.message),
    );

    res.status(200).json({
      message: "Absence application request declined cleanly.",
      data: leave,
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to process rejection path choice loop.",
      error: err.message,
    });
  }
};

exports.getDoctorLeaveHistory = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const history = await Leave.find({ doctor: doctorId }).sort({
      startDate: 1,
    });

    if (history.length === 0) {
      const alternateHistory = await Leave.find({
        doctorName: req.query.doctorName || "",
      }).sort({ startDate: 1 });
      return res.status(200).json(alternateHistory);
    }

    res.status(200).json(history);
  } catch (err) {
    console.error("Fetch Leave History Error:", err.message);
    res.status(500).json({
      message: "Failed to pull historical records logs.",
      error: err.message,
    });
  }
};

exports.getAllLeavesForAdmin = async (req, res) => {
  try {
    const allLeaves = await Leave.find({}).sort({ createdAt: -1 });
    res.status(200).json(allLeaves);
  } catch (err) {
    console.error("Fetch All Leaves Admin Error:", err.message);
    res.status(500).json({
      message: "Failed to pull systems leave logs.",
      error: err.message,
    });
  }
};

exports.getConflictsList = async (req, res) => {
  try {
    const { doctorName, startDate, endDate } = req.query;
    const Appointment = require("../models/Appointment_Model");

    if (!startDate) {
      return res.status(200).json([]);
    }

    const cleanStartDate = startDate.includes("T")
      ? startDate.split("T")[0]
      : startDate;
    const cleanEndDate =
      endDate && endDate.includes("T")
        ? endDate.split("T")[0]
        : endDate || cleanStartDate;

    const conflicts = await Appointment.find({
      doctorName: doctorName,
      date: { $gte: cleanStartDate, $lte: cleanEndDate },
      status: "Upcoming",
    });

    return res.status(200).json(conflicts);
  } catch (err) {
    return res.status(500).json({
      message: "Failed to compile conflict maps.",
      error: err.message,
    });
  }
};
