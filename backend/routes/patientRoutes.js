const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patientController");
const upload = require("../middleware/upload");
const { protect } = require("../middleware/authMiddleware");

router.get("/all", protect, patientController.getAllPatients);
router.get("/dashboard/:id", protect, patientController.getDashboardData);
router.get("/profile/:id", protect, patientController.getProfile);
router.put(
  "/update/:id",
  protect,
  upload.single("photo"),
  patientController.updatePatientProfile,
);

module.exports = router;
