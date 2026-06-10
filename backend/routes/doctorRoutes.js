const express = require("express");
const router = express.Router();
const doctorController = require("../controllers/doctorController");
const leaveController = require("../controllers/leaveController");
const upload = require("../middleware/upload");
const { protect } = require("../middleware/authMiddleware");

router.get("/list", protect, doctorController.getAllDoctors);
router.get("/replacements", protect, doctorController.getAvailableReplacements);
router.get(
  "/availability/:doctorId/:date",
  protect,
  doctorController.getDoctorAvailabilityByDate,
);

router.get("/profile/:id", protect, doctorController.getDoctorById);
router.get("/analytics/:id", protect, doctorController.getPerformanceStats);

router.post(
  "/register",
  protect,
  upload.single("photo"),
  doctorController.registerDoctor,
);
router.put(
  "/update/:id",
  protect,
  upload.any(),
  doctorController.updateDoctorProfile,
);
router.put("/status/:id", protect, doctorController.updateAvailabilityStatus);
router.put(
  "/availability/update",
  protect,
  doctorController.updateSlotAvailability,
);
router.put(
  "/reallocate-direct/:id",
  protect,
  leaveController.reallocateDirectAppointment,
);

module.exports = router;
