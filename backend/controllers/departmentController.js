const Department = require("../models/Department_Model");
const Doctor = require("../models/Doctor_Model");
const { createNotification } = require("../utils/notificationService");

exports.getAllDepartments = async (req, res) => {
  try {
    const data = await Department.find({})
      .populate({
        path: "doctors",
        select: "name email specialization availability photo",
      })
      .sort({ name: 1 });

    res.status(200).json(data);
  } catch (err) {
    console.error("Fetch Departments Error:", err);
    res.status(500).json({
      message:
        "Failed to sync clinical infrastructure from cluster registries.",
      error: err.message,
    });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const {
      name,
      head,
      doctors,
      budget,
      patientCount,
      location,
      status,
      color,
      rating,
      operatingHours,
    } = req.body;

    const exists = await Department.findOne({ name: name.trim() });
    if (exists) {
      return res.status(400).json({
        message:
          "Infrastructure name validation conflict: This clinical wing name already exists.",
      });
    }

    const assignedDoctors = Array.isArray(doctors) ? doctors : [];

    const newWing = new Department({
      name: name.trim(),
      head: head.trim(),
      doctors: assignedDoctors,
      doctorCount: assignedDoctors.length,
      budget: Number(budget) || 0,
      patientCount: Number(patientCount) || 0,
      location: location || "Main Block",
      status: status || "Active",
      color: color || "#007acc",
      rating: Number(rating) || 4.5,
      operatingHours: operatingHours || "24/7",
    });

    const saved = await newWing.save();

    // Broadcast infrastructure addition to all active Admin dashboards
    createNotification({
      userRole: "Admin",
      message: `New Department: The "${saved.name}" wing has been created under Dr. ${saved.head || "Unassigned"}.`,
      type: "system",
    }).catch((e) =>
      console.error("Admin department creation alert failed:", e.message),
    );

    res.status(201).json(saved);
  } catch (err) {
    console.error("Create Department Error:", err.message);
    res.status(500).json({
      message:
        "Database transactional record rejection on infrastructure initialization.",
      error: err.message,
    });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const {
      name,
      head,
      doctors,
      budget,
      patientCount,
      location,
      status,
      color,
      rating,
      operatingHours,
    } = req.body;

    const assignedDoctors = Array.isArray(doctors) ? doctors : [];

    const updated = await Department.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          name: name ? name.trim() : undefined,
          head: head ? head.trim() : undefined,
          doctors: assignedDoctors,
          doctorCount: assignedDoctors.length,
          budget: budget !== undefined ? Number(budget) : undefined,
          patientCount:
            patientCount !== undefined ? Number(patientCount) : undefined,
          location,
          status,
          color,
          rating: rating !== undefined ? Number(rating) : undefined,
          operatingHours,
        },
      },
      { new: true, runValidators: true },
    ).populate("doctors", "name email specialization availability photo");

    if (!updated) {
      return res.status(404).json({
        message: "Infrastructure target tracking document unlocated.",
      });
    }

    // Alert Admin interface that structural changes have been committed cleanly
    createNotification({
      userRole: "Admin",
      message: `Department Modification: "${updated.name}" details have been updated.`,
      type: "system",
    }).catch((e) =>
      console.error("Admin department update alert failed:", e.message),
    );

    res.status(200).json(updated);
  } catch (err) {
    console.error("Update Department Error:", err.message);
    res.status(500).json({
      message:
        "Failed to execute structural modification process loop inside active collections.",
      error: err.message,
    });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const target = await Department.findByIdAndDelete(req.params.id);

    if (!target) {
      return res.status(404).json({
        message:
          "Target infrastructure link missing or already decommissioned.",
      });
    }

    // Dispatched high-visibility system warning context down admin pipes
    createNotification({
      userRole: "Admin",
      message: `Department Warning: A clinical wing has been decommissioned and cleared from cluster directories.`,
      type: "warning",
    }).catch((e) =>
      console.error("Admin department deletion alert failed:", e.message),
    );

    res.status(200).json({
      message:
        "Clinical wing permanently split off from active cluster infrastructure indexes.",
    });
  } catch (err) {
    console.error("Delete Department Error:", err.message);
    res.status(500).json({
      message:
        "Operational processing failure during permanent drop cycle tracking sequences.",
      error: err.message,
    });
  }
};

exports.getDepartmentDropdownList = async (req, res) => {
  try {
    const departments = await Department.find({}, "name").sort({ name: 1 });

    if (!departments || departments.length === 0) {
      return res
        .status(200)
        .json([
          { name: "Cardiology" },
          { name: "Pediatrics" },
          { name: "Neurology" },
          { name: "Emergency" },
          { name: "Dermatology" },
        ]);
    }

    return res.status(200).json(departments);
  } catch (err) {
    console.error("Fetch Department Dropdown List Error:", err.message);
    return res.status(500).json({
      message: "Failed to read lightweight infrastructure names list.",
      error: err.message,
    });
  }
};
