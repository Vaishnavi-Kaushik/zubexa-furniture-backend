const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

// =========================================================
// GENERATE JWT TOKEN
// =========================================================

const generateToken = (userId, role) => {
  return jwt.sign(
    {
      id: userId,
      role: role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );
};

// =========================================================
// REGISTER USER
// POST /api/auth/register
// =========================================================

const registerUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
    } = req.body;

    // =====================================================
    // VALIDATION
    // =====================================================

    if (
      !fullName ||
      !email ||
      !phone ||
      !password
    ) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // =====================================================
    // CHECK EXISTING USER
    // =====================================================

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(400).json({
        message:
          "User already exists with this email",
      });
    }

    // =====================================================
    // HASH PASSWORD
    // =====================================================

    const salt = await bcrypt.genSalt(10);

    const hashedPassword =
      await bcrypt.hash(
        password,
        salt
      );

    // =====================================================
    // CREATE NORMAL USER
    // =====================================================

    const user = await User.create({
      fullName: fullName.trim(),

      email: email.toLowerCase().trim(),

      phone: phone.trim(),

      password: hashedPassword,

      role: "user",
    });

    // =====================================================
    // GENERATE TOKEN
    // =====================================================

    const token = generateToken(
      user._id,
      user.role
    );

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(201).json({
      message:
        "Registration successful",

      token,

      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "Register User Error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// =========================================================
// LOGIN USER
// POST /api/auth/login
// =========================================================

const loginUser = async (
  req,
  res
) => {
  try {
    const {
      email,
      password,
    } = req.body;

    // =====================================================
    // VALIDATION
    // =====================================================

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email and password are required",
      });
    }

    // =====================================================
    // FIND USER
    // =====================================================

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(400).json({
        message:
          "Invalid email or password",
      });
    }

    // =====================================================
    // CHECK PASSWORD
    // =====================================================

    const isMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!isMatch) {
      return res.status(400).json({
        message:
          "Invalid email or password",
      });
    }

    // =====================================================
    // GENERATE ROLE-AWARE TOKEN
    // =====================================================

    const token = generateToken(
      user._id,
      user.role
    );

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json({
      message:
        "Login successful",

      token,

      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "Login User Error:",
      error
    );

    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// =========================================================
// CREATE ADMIN
// POST /api/auth/create-admin
//
// This endpoint requires:
// x-admin-setup-key: YOUR_SECRET_KEY
//
// Keep ADMIN_SETUP_KEY only in backend .env
// =========================================================

const createAdmin = async (
  req,
  res
) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      setupKey,
    } = req.body;

    // =====================================================
    // SETUP KEY CHECK
    // =====================================================

    const adminSetupKey =
      process.env.ADMIN_SETUP_KEY;

    if (!adminSetupKey) {
      console.error(
        "ADMIN_SETUP_KEY is missing in .env"
      );

      return res.status(500).json({
        message:
          "Admin setup is not configured on the server.",
      });
    }

    // Allow setup key either from header or body
    const providedSetupKey =
      req.headers[
        "x-admin-setup-key"
      ] || setupKey;

    if (
      !providedSetupKey ||
      providedSetupKey !==
        adminSetupKey
    ) {
      return res.status(403).json({
        message:
          "Invalid admin setup key.",
      });
    }

    // =====================================================
    // VALIDATION
    // =====================================================

    if (
      !fullName ||
      !email ||
      !phone ||
      !password
    ) {
      return res.status(400).json({
        message:
          "Full name, email, phone and password are required.",
      });
    }

    // =====================================================
    // CHECK EXISTING USER
    // =====================================================

    const existingUser =
      await User.findOne({
        email:
          email.toLowerCase().trim(),
      });

    if (existingUser) {
      return res.status(400).json({
        message:
          "A user already exists with this email.",
      });
    }

    // =====================================================
    // HASH PASSWORD
    // =====================================================

    const salt =
      await bcrypt.genSalt(10);

    const hashedPassword =
      await bcrypt.hash(
        password,
        salt
      );

    // =====================================================
    // CREATE ADMIN
    // =====================================================

    const admin =
      await User.create({
        fullName:
          fullName.trim(),

        email:
          email.toLowerCase().trim(),

        phone:
          phone.trim(),

        password:
          hashedPassword,

        role: "admin",
      });

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(201).json({
      message:
        "Admin account created successfully.",

      user: {
        id: admin._id,
        fullName:
          admin.fullName,
        email:
          admin.email,
        phone:
          admin.phone,
        role:
          admin.role,
      },
    });
  } catch (error) {
    console.error(
      "Create Admin Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to create admin account.",
      error:
        error.message,
    });
  }
};

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  registerUser,
  loginUser,
  createAdmin,
};