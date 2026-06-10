const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { protect } = require("../middleware/authMiddleware");
router.get(
  "/medicines/history",
  protect,
  orderController.getMedicineProcurementHistory,
);
router.get(
  "/tests/history",
  protect,
  orderController.getTestProcurementHistory,
);

module.exports = router;
