const Appointment = require("../models/Appointment_Model");
const Event = require("../models/Event_Model");
const Doctor = require("../models/Doctor_Model");
const Admin = require("../models/Admin_Model");
const { createNotification } = require("./notificationService");

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const TICK_MS = 15 * MINUTE;
const MISSED_GRACE = 30 * MINUTE;

async function runSweep() {
  try {
    const appointments = await Appointment.find({ status: "Upcoming" });
    const now = Date.now();

    for (const appt of appointments) {
      const standardDateStr = appt.date.includes("T")
        ? appt.date.split("T")[0]
        : appt.date;
      const when = new Date(`${standardDateStr} ${appt.time}`).getTime();

      if (isNaN(when)) {
        console.error(
          `Invalid appointment date metrics detected for ID: ${appt._id}`,
        );
        continue;
      }

      const msUntil = when - now;
      const flags = appt.remindersSent || {};

      if (msUntil <= 3 * DAY && msUntil > 2 * DAY && !flags.threeDay) {
        await createNotification({
          userId: appt.patientId,
          userRole: "Patient",
          message: `Reminder: appointment with Dr. ${appt.doctorName} in 3 days (${appt.date} at ${appt.time}).`,
          type: "appointment",
        });
        appt.remindersSent.threeDay = true;
        appt.markModified("remindersSent");
        await appt.save();
        continue;
      }

      if (msUntil <= DAY && msUntil > 0 && !flags.oneDay) {
        await createNotification({
          userId: appt.patientId,
          userRole: "Patient",
          message: `Reminder: appointment with Dr. ${appt.doctorName} tomorrow at ${appt.time}.`,
          type: "appointment",
        });
        appt.remindersSent.oneDay = true;
        appt.markModified("remindersSent");
        await appt.save();
        continue;
      }

      if (msUntil < -MISSED_GRACE && !flags.missed) {
        await createNotification({
          userId: appt.patientId,
          userRole: "Patient",
          message: `You missed your appointment with Dr. ${appt.doctorName} on ${appt.date} at ${appt.time}. Please reschedule.`,
          type: "warning",
        });
        appt.remindersSent.missed = true;
        appt.markModified("remindersSent");
        await appt.save();
      }
    }
  } catch (err) {
    console.error("Reminder sweep failed:", err.message);
  }
}

async function broadcastEventReminder(event, message) {
  const [admins, doctors] = await Promise.all([
    Admin.find({}, { _id: 1 }),
    event.doctors && event.doctors.length > 0
      ? Doctor.find({ name: { $in: event.doctors } }, { _id: 1 })
      : Promise.resolve([]),
  ]);

  const dispatches = [];
  for (const a of admins) {
    dispatches.push(
      createNotification({
        userId: a._id,
        userRole: "Admin",
        message,
        type: "info",
      }),
    );
  }
  for (const d of doctors) {
    dispatches.push(
      createNotification({
        userId: d._id,
        userRole: "Doctor",
        message,
        type: "info",
      }),
    );
  }
  await Promise.allSettled(dispatches);
}

async function sweepEvents() {
  try {
    const events = await Event.find({ status: "Upcoming" });
    const now = Date.now();

    for (const event of events) {
      const standardDateStr = event.date.includes("T")
        ? event.date.split("T")[0]
        : event.date;
      const when = new Date(`${standardDateStr} 00:00`).getTime();

      if (isNaN(when)) {
        console.error(
          `Invalid event date metrics detected for ID: ${event._id}`,
        );
        continue;
      }

      const msUntil = when - now;
      const flags = event.remindersSent || {};

      if (msUntil <= 3 * DAY && msUntil > 2 * DAY && !flags.threeDay) {
        await broadcastEventReminder(
          event,
          `Upcoming event "${event.title}" in 3 days on ${event.date} at ${event.startTime} (${event.location}).`,
        );
        event.remindersSent.threeDay = true;
        event.markModified("remindersSent");
        await event.save();
        continue;
      }

      if (msUntil <= DAY && msUntil > 0 && !flags.oneDay) {
        await broadcastEventReminder(
          event,
          `Reminder: event "${event.title}" tomorrow at ${event.startTime} (${event.location}).`,
        );
        event.remindersSent.oneDay = true;
        event.markModified("remindersSent");
        await event.save();
      }
    }
  } catch (err) {
    console.error("Event reminder sweep failed:", err.message);
  }
}

function startReminderScheduler() {
  runSweep();
  sweepEvents();
  setInterval(() => {
    runSweep();
    sweepEvents();
  }, TICK_MS);
  console.log(`Reminder scheduler armed (every ${TICK_MS / MINUTE} min).`);
}

module.exports = { startReminderScheduler };
