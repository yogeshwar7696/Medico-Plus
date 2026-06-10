const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

router.post("/signup", adminController.adminSignUp);
router.post("/signin", adminController.adminSignIn);

module.exports = router;
