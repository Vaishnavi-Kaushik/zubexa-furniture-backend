const jwt = require("jsonwebtoken");
const User = require("../models/User");

// =========================================================
// PROTECT LOGGED-IN USER
// =========================================================

const protect = async (
  req,
  res,
  next
) => {
  try {
    const authHeader =
      req.headers.authorization || "";

    // =====================================================
    // CHECK AUTH HEADER
    // =====================================================

    if (
      !authHeader ||
      !authHeader.startsWith(
        "Bearer "
      )
    ) {
      return res.status(401).json({
        message:
          "Not authorized, no token.",
      });
    }

    // =====================================================
    // GET TOKEN
    // =====================================================

    const token =
      authHeader
        .replace(
          "Bearer ",
          ""
        )
        .trim();

    if (!token) {
      return res.status(401).json({
        message:
          "Not authorized, no token.",
      });
    }

    // =====================================================
    // VERIFY TOKEN
    // =====================================================

    let decoded;

    try {
      decoded =
        jwt.verify(
          token,
          process.env.JWT_SECRET
        );
    } catch (jwtError) {
      console.error(
        "JWT VERIFY ERROR:",
        jwtError.message
      );

      return res.status(401).json({
        message:
          "Not authorized, token failed.",
      });
    }

    // =====================================================
    // CHECK USER ID
    // =====================================================

    if (!decoded?.id) {
      return res.status(401).json({
        message:
          "Not authorized, invalid token.",
      });
    }

    // =====================================================
    // GET USER
    // =====================================================

    const user =
      await User.findById(
        decoded.id
      ).select("-password");

    if (!user) {
      return res.status(401).json({
        message:
          "Not authorized, user not found.",
      });
    }

    // =====================================================
    // ATTACH USER
    // =====================================================

    req.user = user;
    req.userId = user._id;

    next();

  } catch (error) {

    console.error(
      "Auth Middleware Error:",
      error
    );

    return res.status(401).json({
      message:
        "Not authorized, authentication failed.",
    });
  }
};

// =========================================================
// ADMIN ONLY
// =========================================================

const adminOnly = (
  req,
  res,
  next
) => {

  if (
    !req.user
  ) {
    return res.status(401).json({
      message:
        "Not authorized, user authentication required.",
    });
  }

  if (
    req.user.role !==
    "admin"
  ) {
    return res.status(403).json({
      message:
        "Access denied. Admin privileges required.",
    });
  }

  next();
};

// =========================================================
// EXPORT
// =========================================================

module.exports = {
  protect,
  adminOnly,
};