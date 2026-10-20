const express = require("express");

const router = express.Router();

const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// =========================================================
// GET ALL REGISTERED USERS (ADMIN ONLY)
// =========================================================

router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({ role: "user" })
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json(users);
  } catch (error) {
    console.error("GET USERS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch users.",
      error: error.message,
    });
  }
});

module.exports = router;