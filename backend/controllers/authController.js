const Patient = require("../models/Patient_Model");
const Doctor = require("../models/Doctor_Model");
const Admin = require("../models/Admin_Model");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
require("dotenv").config();

const passwordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const validatePasswordStrength = (password) => {
  return passwordStrengthRegex.test(password);
};

// Token
const createToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

exports.signUp = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "All registration fields are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!validatePasswordStrength(password)) {
      return res.status(400).json({
        message:
          "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.",
      });
    }

    const existingPatient = await Patient.findOne({ email: normalizedEmail });
    if (existingPatient) {
      return res
        .status(400)
        .json({ message: "User already exists with this email address." });
    }

    const newPatient = new Patient({
      name: name.trim(),
      email: normalizedEmail,
      password,
    });

    await newPatient.save();

    const token = createToken(newPatient._id, "Patient");

    const userPayload = newPatient.toObject();
    delete userPayload.password;

    return res.status(201).json({
      token,
      user: userPayload,
      role: "Patient",
    });
  } catch (err) {
    console.error("Critical Signup Error:", err.message);
    return res
      .status(500)
      .json({ message: "Registration processing failed.", error: err.message });
  }
};

/*
Route: POST /api/auth/signin
 */


exports.signIn = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    let Model;
    if (role === "Patient") Model = Patient;
    else if (role === "Doctor") Model = Doctor;
    else if (role === "Admin" || role === "SuperAdmin") Model = Admin;
    else return res.status(400).json({ message: "Invalid role structure." });

    const user = await Model.findOne({ email: email.toLowerCase().trim() });
    const e = await Model.find({});
    if (!user) {
      console.log(e);
      return res.status(401).json({ message: "User credentials not found." });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) return res.status(400).json({ message: "Invalid password" });

    const token = createToken(user._id, role);
    const userData = user.toObject();
    delete userData.password;

    return res.status(200).json({ token, user: userData, role });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Both current and new password fields are required.",
      });
    }

    if (!validatePasswordStrength(newPassword)) {
      return res.status(400).json({
        message:
          "New password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.",
      });
    }

    const userId = req.user?.id || req.user?._id;
    const userRole = req.user?.role;

    let Model;
    if (userRole === "Patient") Model = Patient;
    else if (userRole === "Doctor") Model = Doctor;
    else if (userRole === "Admin" || userRole === "SuperAdmin") Model = Admin;
    else {
      return res.status(400).json({ message: "Invalid token role context." });
    }

    const user = await Model.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User account index trace not found inside registry.",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Incorrect current password credentials." });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        message:
          "New password must be completely different from your current one.",
      });
    }

    user.password = newPassword;
    await user.save();

    return res
      .status(200)
      .json({ message: "Security credentials updated successfully." });
  } catch (err) {
    console.error("Guarded Security Auth Controller Crash:", err.message);
    return res.status(500).json({
      message:
        "Internal transactional server failure error updating password keys.",
    });
  }
};

exports.googleAuth = async (req, res) => {
  const { token, role } = req.body;
  try {
    const googleRes = await axios.get(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${token}`,
    );
    const { email, name, picture } = googleRes.data;

    const Model = role === "Doctor" ? Doctor : Patient;
    let user = await Model.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      user = new Model({
        name,
        email: email.toLowerCase().trim(),
        photo: picture,
        password: `google_auth_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      });
      await user.save();
    }

    const appToken = createToken(user._id, role);
    const userPayload = user.toObject();
    delete userPayload.password;

    return res.status(200).json({
      token: appToken,
      user: userPayload,
      role,
    });
  } catch (error) {
    console.error("Google Auth Error:", error.message);
    return res.status(401).json({ message: "Invalid Google Token" });
  }
};

/*
  Route: PUT /api/auth/update-password
 */
exports.updatePassword = async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({
        message: "Email, token, and new password are all required.",
      });
    }

    if (!validatePasswordStrength(newPassword)) {
      return res.status(400).json({
        message:
          "New password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a symbol.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await Patient.findOne({
      email: normalizedEmail,
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    let userRole = "Patient";

    if (!user) {
      user = await Doctor.findOne({
        email: normalizedEmail,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });
      userRole = "Doctor";
    }

    if (!user) {
      user = await Admin.findOne({
        email: normalizedEmail,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });
      userRole = "Admin";
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired password reset token." });
    }

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**

 Route: PUT /api/auth/update-profile/:id
 */
exports.updateProfile = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    if (req.file) {
      updateData.photo = req.file.filename;
    }

    if (updateData.password) delete updateData.password;

    const updatedPatient = await Patient.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true },
    );

    if (!updatedPatient) {
      return res.status(404).json({ message: "User not found" });
    }

    const userPayload = updatedPatient.toObject();
    delete userPayload.password;

    return res.status(200).json({
      message: "Profile updated successfully",
      user: userPayload,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * @section Secondary Administrative Email Modification Checkpoint
 */
exports.updateEmail = async (req, res) => {
  try {
    const { newEmail, password } = req.body;
    const user = await Patient.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect password." });
    }

    const emailExists = await Patient.findOne({
      email: newEmail.toLowerCase().trim(),
    });
    if (emailExists) {
      return res.status(400).json({ message: "Email already in use." });
    }

    user.email = newEmail.toLowerCase().trim();
    await user.save();

    return res.status(200).json({ message: "Email updated successfully" });
  } catch (err) {
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email address is required." });
    }

    let Model;
    if (role === "Patient") Model = Patient;
    else if (role === "Doctor") Model = Doctor;
    else if (role === "Admin") Model = Admin;
    else
      return res.status(400).json({ message: "Invalid role classification." });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await Model.findOne({ email: normalizedEmail });
    if (!user) {
      return res
        .status(404)
        .json({ message: "No account matched with that email address." });
    }

    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = verificationToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    if (!process.env.SUPPORT_EMAIL || !process.env.SUPPORT_EMAIL_PASS) {
      console.error("Forgot password email credentials are not configured.");
      return res.status(500).json({
        message: "Password reset email service is unavailable.",
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SUPPORT_EMAIL,
        pass: process.env.SUPPORT_EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Medico+ Support" <${process.env.SUPPORT_EMAIL}>`,
      to: normalizedEmail,
      subject: "Your Medico+ Password Reset Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f7fafc; border-radius: 8px;">
          <h2 style="color: #1d4ed8;">Password Reset Verification Code</h2>
          <p>Use the following code to reset your Medico+ password. It expires in 15 minutes.</p>
          <p style="font-size: 24px; font-weight: 700; letter-spacing: 2px; margin: 20px 0;">${verificationToken}</p>
          <p>If you did not request this code, please ignore this message.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    console.log(
      `[SECURITY AUDIT] Password Reset Token for ${email} (${role}): ${verificationToken}`,
    );

    return res.status(200).json({
      message: "Verification security token transmitted to your email address.",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Failed to generate recovery token.",
      error: err.message,
    });
  }
};

exports.verifyToken = async (req, res) => {
  try {
    const { email, token } = req.body;

    let user =
      (await Patient.findOne({
        email,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      })) ||
      (await Doctor.findOne({
        email,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      })) ||
      (await Admin.findOne({
        email,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      }));

    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid or expired security token code." });
    }

    return res
      .status(200)
      .json({ message: "Token verification checkpoint passed successfully." });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Verification lifecycle failure.", error: err.message });
  }
};
