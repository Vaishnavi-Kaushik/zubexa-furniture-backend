const express = require("express");

const router = express.Router();

const {
  registerUser,
  loginUser,
  createAdmin,
  updateProfile,
  changePassword,
} = require("../controllers/authController");

const {
  protect,
} = require("../middleware/authMiddleware");

// =========================================================
// REGISTER USER
// =========================================================

router.post(
  "/register",
  registerUser
);

// =========================================================
// LOGIN USER
// =========================================================

router.post(
  "/login",
  loginUser
);

// =========================================================
// CREATE ADMIN
// =========================================================

router.post(
  "/create-admin",
  createAdmin
);

// =========================================================
// UPDATE PROFILE
// PUT /api/auth/profile
// =========================================================

router.put(
  "/profile",
  protect,
  updateProfile
);

// =========================================================
// CHANGE PASSWORD
// PUT /api/auth/change-password
// =========================================================

router.put(
  "/change-password",
  protect,
  changePassword
);

module.exports = router;