const express = require("express");
const router = express.Router();
const Medicine = require("../models/Medicine_Model");
const { protect } = require("../middleware/authMiddleware");

router.get("/all", protect, async (req, res) => {
  try {
    const meds = await Medicine.find().sort({ name: 1 });
    res.status(200).json(meds);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/add", protect, async (req, res) => {
  try {
    const newMed = new Medicine(req.body);
    await newMed.save();
    res
      .status(201)
      .json({ message: "Medicine added to inventory", data: newMed });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/update/:id", protect, async (req, res) => {
  try {
    const updatedMed = await Medicine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    res
      .status(200)
      .json({ message: "Medicine synchronized safely", data: updatedMed });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/delete/:id", protect, async (req, res) => {
  try {
    await Medicine.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Medicine removed from registry" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
