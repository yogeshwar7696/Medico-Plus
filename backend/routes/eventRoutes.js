const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const { protect } = require("../middleware/authMiddleware");

router.get("/all", protect, eventController.getAllEvents);
router.post("/add", protect, eventController.createEvent);
router.put("/update/:id", protect, eventController.updateEvent);
router.delete("/delete/:id", protect, eventController.deleteEvent);

module.exports = router;
