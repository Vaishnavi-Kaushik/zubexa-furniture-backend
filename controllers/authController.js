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

    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingUser) {
      return res.status(400).json({
        message:
          "User already exists with this email",
      });
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword =
      await bcrypt.hash(
        password,
        salt
      );

    const user = await User.create({
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: hashedPassword,
      role: "user",
    });

    const token = generateToken(
      user._id,
      user.role
    );

    return res.status(201).json({
      message: "Registration successful",
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

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(400).json({
        message:
          "Invalid email or password",
      });
    }

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

    const token = generateToken(
      user._id,
      user.role
    );

    return res.status(200).json({
      message: "Login successful",
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

    const salt =
      await bcrypt.genSalt(10);

    const hashedPassword =
      await bcrypt.hash(
        password,
        salt
      );

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
// UPDATE PROFILE
// PUT /api/auth/profile
// PROTECTED
// =========================================================

const updateProfile = async (
  req,
  res
) => {
  try {
    const {
      fullName,
      email,
      phone,
    } = req.body;

    // -----------------------------------------
    // VALIDATION
    // -----------------------------------------

    if (
      !fullName ||
      !email ||
      !phone
    ) {
      return res.status(400).json({
        message:
          "Full name, email and phone are required.",
      });
    }

    const cleanName =
      fullName.trim();

    const cleanEmail =
      email.toLowerCase().trim();

    const cleanPhone =
      phone.trim();

    if (!cleanName) {
      return res.status(400).json({
        message:
          "Full name cannot be empty.",
      });
    }

    if (!cleanEmail) {
      return res.status(400).json({
        message:
          "Email cannot be empty.",
      });
    }

    if (!cleanPhone) {
      return res.status(400).json({
        message:
          "Phone cannot be empty.",
      });
    }

    // -----------------------------------------
    // CHECK EMAIL ALREADY USED
    // -----------------------------------------

    const existingUser =
      await User.findOne({
        email: cleanEmail,
        _id: {
          $ne: req.user._id,
        },
      });

    if (existingUser) {
      return res.status(400).json({
        message:
          "This email is already registered with another account.",
      });
    }

    // -----------------------------------------
    // GET CURRENT USER
    // -----------------------------------------

    const user =
      await User.findById(
        req.user._id
      );

    if (!user) {
      return res.status(404).json({
        message:
          "User not found.",
      });
    }

    // -----------------------------------------
    // UPDATE USER
    // -----------------------------------------

    user.fullName =
      cleanName;

    user.email =
      cleanEmail;

    user.phone =
      cleanPhone;

    await user.save();

    // -----------------------------------------
    // RESPONSE
    // -----------------------------------------

    return res.status(200).json({
      message:
        "Profile updated successfully.",
      user: {
        id: user._id,
        fullName:
          user.fullName,
        email:
          user.email,
        phone:
          user.phone,
        role:
          user.role,
      },
    });
  } catch (error) {
    console.error(
      "Update Profile Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to update profile.",
      error:
        error.message,
    });
  }
};

// =========================================================
// CHANGE PASSWORD
// PUT /api/auth/change-password
// PROTECTED
// =========================================================

const changePassword = async (
  req,
  res
) => {
  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    // -----------------------------------------
    // VALIDATION
    // -----------------------------------------

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        message:
          "Current password, new password and confirm password are required.",
      });
    }

    // -----------------------------------------
    // CHECK NEW PASSWORD MATCH
    // -----------------------------------------

    if (
      newPassword !==
      confirmPassword
    ) {
      return res.status(400).json({
        message:
          "New password and confirm password do not match.",
      });
    }

    // -----------------------------------------
    // PASSWORD LENGTH
    // -----------------------------------------

    if (
      newPassword.length < 6
    ) {
      return res.status(400).json({
        message:
          "New password must be at least 6 characters.",
      });
    }

    // -----------------------------------------
    // GET USER WITH PASSWORD
    // -----------------------------------------

    const user =
      await User.findById(
        req.user._id
      );

    if (!user) {
      return res.status(404).json({
        message:
          "User not found.",
      });
    }

    // -----------------------------------------
    // CHECK CURRENT PASSWORD
    // -----------------------------------------

    const isCurrentPasswordCorrect =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (
      !isCurrentPasswordCorrect
    ) {
      return res.status(400).json({
        message:
          "Current password is incorrect.",
      });
    }

    // -----------------------------------------
    // PREVENT SAME PASSWORD
    // -----------------------------------------

    const isSamePassword =
      await bcrypt.compare(
        newPassword,
        user.password
      );

    if (isSamePassword) {
      return res.status(400).json({
        message:
          "New password must be different from your current password.",
      });
    }

    // -----------------------------------------
    // HASH NEW PASSWORD
    // -----------------------------------------

    const salt =
      await bcrypt.genSalt(10);

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        salt
      );

    user.password =
      hashedPassword;

    await user.save();

    // -----------------------------------------
    // RESPONSE
    // -----------------------------------------

    return res.status(200).json({
      message:
        "Password changed successfully.",
    });
  } catch (error) {
    console.error(
      "Change Password Error:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to change password.",
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
  updateProfile,
  changePassword,
};