const express = require("express");
const router = express.Router();
const leaveController = require("../controllers/leaveController");
const { protect } = require("../middleware/authMiddleware");

router.post("/apply", protect, leaveController.applyLeave);
router.get("/all", protect, leaveController.getAllLeavesForAdmin);
router.get(
  "/history/:doctorId",
  protect,
  leaveController.getDoctorLeaveHistory,
);

router.get("/conflicts-list", protect, async (req, res) => {
  try {
    const { doctorName, startDate, endDate } = req.query;
    const Appointment = require("../models/Appointment_Model");

    const cleanStartDate = startDate.includes("T")
      ? startDate.split("T")[0]
      : startDate;
    const cleanEndDate = endDate.includes("T")
      ? endDate.split("T")[0]
      : endDate;

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
});
router.put("/admin/resolve/:id", protect, (req, res) => {
  if (req.body.status === "Rejected") {
    return leaveController.rejectLeaveRequest(req, res);
  }
  return leaveController.approveAndReallocateLeave(req, res);
});
router.put(
  "/reallocate-direct/:id",
  protect,
  leaveController.reallocateDirectAppointment,
);
router.put("/update/:id", protect, (req, res) => {
  if (req.body.status === "Rejected") {
    return leaveController.rejectLeaveRequest(req, res);
  }
  return leaveController.approveAndReallocateLeave(req, res);
});

module.exports = router;
