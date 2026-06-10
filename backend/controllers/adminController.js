const Admin = require("../models/Admin_Model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const createToken = (id) => {
  return jwt.sign({ id, role: "Admin" }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });
};

exports.adminSignUp = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingAdmin = await Admin.findOne({
      email: email.toLowerCase().trim(),
    });
    if (existingAdmin) {
      return res
        .status(400)
        .json({ message: "Admin email already registered." });
    }

    const newAdmin = new Admin({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || "SuperAdmin",
    });

    await newAdmin.save();

    const token = createToken(newAdmin._id);
    res.status(201).json({
      message: "Admin created successfully",
      token,
      user: { name: newAdmin.name, email: newAdmin.email, role: newAdmin.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.adminSignIn = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });
    if (!admin) {
      return res.status(401).json({ message: "Invalid Admin Credentials" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid Admin Credentials" });
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = createToken(admin._id);

    res.status(200).json({
      token,
      role: "Admin",
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error during Admin Login" });
  }
};
