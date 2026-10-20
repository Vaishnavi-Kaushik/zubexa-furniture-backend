const express = require("express");
const router = express.Router();


const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const {
  getProjects,
  getAllProjectsAdmin,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} = require("../controllers/projectController");

router.get("/", getProjects);
router.get("/admin/all", protect, adminOnly, getAllProjectsAdmin); // /:id se pehle hi rakhna
router.get("/:id", getProject);
router.post("/", protect, adminOnly, createProject);
router.put("/:id", protect, adminOnly, updateProject);
router.delete("/:id", protect, adminOnly, deleteProject);

module.exports = router;
