const express = require("express");
const router = express.Router();
const vaultController = require("../controllers/vaultController");
const multer = require("multer");
const path = require("path");
const { protect } = require("../middleware/authMiddleware");

const storage = multer.diskStorage({
  destination: "./uploads/vault/",
  filename: (req, file, cb) => {
    cb(null, `VAULT_${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

router.post(
  "/upload",
  protect,
  upload.single("document"),
  vaultController.uploadRecord,
);
router.get("/:patientId", protect, vaultController.getPatientVault);
router.delete("/:vaultId", protect, vaultController.deleteRecord);

module.exports = router;
