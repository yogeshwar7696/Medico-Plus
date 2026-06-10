const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

router.post("/signup", authController.signUp);
router.post("/signin", authController.signIn);
router.post("/google", authController.googleAuth);

router.put("/update-email/:id", protect, authController.updateEmail);
router.put("/change-password", protect, authController.changePassword);
router.put(
  "/update-profile/:id",
  upload.single("photo"),
  authController.updateProfile,
);
router.put("/update-password", authController.updatePassword);
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-token", authController.verifyToken);

module.exports = router;
