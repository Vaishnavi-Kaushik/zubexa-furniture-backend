const express = require("express");

const router = express.Router();

const {
  registerUser,
  loginUser,
  createAdmin,
} = require("../controllers/authController");

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

module.exports = router;