const jwt = require("jsonwebtoken");
const Patient = require("../models/Patient_Model");
const Doctor = require("../models/Doctor_Model");
const Admin = require("../models/Admin_Model");
require("dotenv").config();

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      message:
        "You are not logged in. Please sign in to gain authorization access.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let Model;
    if (decoded.role === "Patient") Model = Patient;
    else if (decoded.role === "Doctor") Model = Doctor;
    else if (decoded.role === "Admin") Model = Admin;
    else {
      return res
        .status(401)
        .json({ message: "Malformed token security context payload." });
    }

    const currentUser = await Model.findById(decoded.id);

    if (!currentUser) {
      return res.status(401).json({
        message:
          "The user belonging to this token registry index no longer exists.",
      });
    }

    req.user = currentUser.toObject();
    req.user.role = decoded.role;

    next();
  } catch (error) {
    console.error("JWT Verification Middleware Engine Failure:", error.message);
    return res.status(401).json({
      message: "Session token expired or corrupted. Authentication rejected.",
    });
  }
};

const restrictTo = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message:
          "Access Denied. Your credential classification permissions are insufficient.",
      });
    }
    next();
  };
};

module.exports = { protect, restrictTo };
