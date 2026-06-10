const express = require("express");
const router = express.Router();
const deptController = require("../controllers/departmentController");
const { protect } = require("../middleware/authMiddleware");

router.get("/all", protect, deptController.getAllDepartments);
router.post("/add", protect, deptController.createDepartment);
router.put("/update/:id", protect, deptController.updateDepartment);
router.delete("/delete/:id", protect, deptController.deleteDepartment);
router.get("/dropdown/list", protect, deptController.getDepartmentDropdownList);

module.exports = router;
