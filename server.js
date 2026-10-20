require("dotenv").config();

const express = require("express");
const cors = require("cors");

const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const userRoutes = require("./routes/userRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const projectRoutes = require("./routes/projectRoutes");

// dotenv.config();

connectDB();

const app = express();

// =========================================================
// MIDDLEWARE
// =========================================================

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// =========================================================
// ROUTES
// =========================================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/categories",
  categoryRoutes
);

app.use(
  "/api/projects",
  projectRoutes
);

// =========================================================
// UPLOADS
// =========================================================


// =========================================================
// PRODUCT IMAGE STORAGE
// =========================================================

const uploadDir = process.env.PRODUCT_UPLOAD_DIR
  ? path.resolve(process.env.PRODUCT_UPLOAD_DIR)
  : path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

console.log("PRODUCT IMAGE SERVE DIRECTORY:", uploadDir);

app.use("/uploads", express.static(uploadDir));


// =========================================================
// TEST ROUTE
// =========================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ZUBEXA Backend is running",
  });
});

// =========================================================
// 404
// =========================================================

app.use((req, res) => {
  res.status(404).json({
    message: "API route not found.",
    path: req.originalUrl,
  });
});

// =========================================================
// GLOBAL ERROR HANDLER
// =========================================================

app.use((err, req, res, next) => {
  console.error(
    "GLOBAL SERVER ERROR:",
    err
  );

  res.status(500).json({
    message:
      err.message ||
      "Internal server error.",
  });
});

// =========================================================
// SERVER
// =========================================================

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});
