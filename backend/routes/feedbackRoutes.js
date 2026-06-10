const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedbackController");
const { protect } = require("../middleware/authMiddleware");

router.post("/submit", protect, feedbackController.createFeedback);
router.get("/doctor", protect, feedbackController.getFeedbackByDoctor);
router.get("/all", protect, feedbackController.getAllGlobalFeedback);
router.delete("/delete/:id", protect, feedbackController.deleteReview);

module.exports = router;
