const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");
const { protect } = require("../middleware/authMiddleware");

router.put("/cancel/:id", protect, appointmentController.cancelAppointment);

router.post("/book", protect, appointmentController.bookAppointment);
router.get(
  "/list/:patientId",
  protect,
  appointmentController.getPatientAppointments,
);
router.get("/check", protect, appointmentController.checkAvailability);

router.get(
  "/doctor/:name",
  protect,
  appointmentController.getAppointmentsByDoctor,
);
router.put("/complete/:id", protect, appointmentController.completeAppointment);
router.get(
  "/replacements",
  protect,
  appointmentController.getReplacementSpecialists,
);
router.put(
  "/admin-request/:id",
  protect,
  appointmentController.createAdminRequest,
);

router.get("/all", protect, appointmentController.getAllAppointments);
router.put(
  "/reschedule/:id",
  protect,
  appointmentController.rescheduleAppointment,
);
router.get(
  "/admin/pending-requests",
  protect,
  appointmentController.getPendingAdminRequests,
);
router.put(
  "/admin/resolve-request/:id",
  protect,
  appointmentController.resolveAdminRequest,
);

module.exports = router;
