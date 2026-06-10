const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { protect } = require("../middleware/authMiddleware");

router.post("/create", protect, orderController.createOrder);
router.get("/patient/:patientId", protect, orderController.getPatientOrders);
router.get("/all", protect, orderController.getAllOrders);
router.get("/all", orderController.getAllOrders);

router.get("/:id", orderController.getOrderById);
module.exports = router;

