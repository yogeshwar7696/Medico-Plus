const express = require("express");
const router = express.Router();
const Test = require("../models/Test_Model");
const { protect } = require("../middleware/authMiddleware");

router.get("/all", protect, async (req, res) => {
  try {
    const tests = await Test.find();
    res.status(200).json(tests);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tests" });
  }
});

router.put("/update/:id", protect, async (req, res) => {
  try {
    const updatedTest = await Test.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    res
      .status(200)
      .json({ message: "Test synchronized safely", data: updatedTest });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
