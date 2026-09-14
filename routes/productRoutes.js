const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const Product = require("../models/Product");

const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

// =========================================================
// UPLOAD FOLDER
// =========================================================

const uploadDir = path.join(
  __dirname,
  "..",
  "uploads"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

// =========================================================
// MULTER STORAGE
// =========================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

// =========================================================
// FILE FILTER
// =========================================================

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only JPG, JPEG, PNG and WEBP images are allowed."
      )
    );
  }
};

// =========================================================
// UPLOAD MIDDLEWARE
// =========================================================

const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 10,
    fileSize: 5 * 1024 * 1024,
  },
});

// =========================================================
// HELPER
// PARSE CATEGORIES
// =========================================================

const parseCategories = (categories) => {
  if (!categories) {
    return [];
  }

  if (Array.isArray(categories)) {
    return categories;
  }

  try {
    const parsed = JSON.parse(categories);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.error(
      "Category JSON Parse Error:",
      error
    );

    return [];
  }
};

// =========================================================
// HELPER
// NORMALIZE CATEGORIES
// =========================================================

const normalizeCategories = (categories) => {
  return categories
    .filter(
      (item) =>
        item &&
        item.category
    )
    .map((item) => {
      const category = String(
        item.category || ""
      ).trim();

      const subCategory = String(
        item.subCategory || ""
      ).trim();

      const subSubCategory = String(
        item.subSubCategory || ""
      ).trim();

      const categoryPath = String(
        item.categoryPath ||
          [
            category,
            subCategory,
            subSubCategory,
          ]
            .filter(Boolean)
            .join(" / ")
      ).trim();

      return {
        category,
        subCategory,
        subSubCategory,
        categoryPath,
      };
    });
};

// =========================================================
// HELPER
// PARSE TAGS
// =========================================================

const parseTags = (tags) => {
  if (!tags) {
    return [];
  }

  if (Array.isArray(tags)) {
    return tags
      .map((tag) =>
        String(tag).trim()
      )
      .filter(Boolean);
  }

  return String(tags)
    .split(",")
    .map((tag) =>
      tag.trim()
    )
    .filter(Boolean);
};

// =========================================================
// HELPER
// PARSE BOOLEAN
// =========================================================

const parseBoolean = (value) => {
  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  );
};

// =========================================================
// HELPER
// PARSE NUMBER
// =========================================================

const parseNumber = (
  value,
  fallback = 0
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return fallback;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

// =========================================================
// HELPER
// VALID PRODUCT STATUS
// =========================================================

const allowedStatuses = [
  "active",
  "inactive",
  "draft",
];

const normalizeStatus = (
  status,
  fallback = "active"
) => {
  if (
    status &&
    allowedStatuses.includes(status)
  ) {
    return status;
  }

  return fallback;
};

// =========================================================
// GET ALL PRODUCTS
// PUBLIC
// =========================================================

router.get(
  "/",
  async (req, res) => {
    try {
      const products =
        await Product.find().sort({
          createdAt: -1,
        });

      return res.status(200).json(
        products
      );
    } catch (error) {
      console.error(
        "Get Products Error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch products",
        error: error.message,
      });
    }
  }
);

// =========================================================
// ADD PRODUCT
// ADMIN ONLY
// =========================================================

router.post(
  "/",
  protect,
  adminOnly,
  upload.array("images", 10),
  async (req, res) => {
    try {
      // =====================================================
      // PRODUCT DATA
      // =====================================================

      const {
        name,
        price,
        salePrice,
        stock,
        stockStatus,
        featured,

        code,
        size,
        productType,
        material,
        color,
        brand,
        warranty,

        shortDescription,
        description,

        tags,

        seoTitle,
        metaDescription,

        status,
      } = req.body;

      // =====================================================
      // CATEGORY DATA
      // =====================================================

      const rawCategories =
        parseCategories(
          req.body.categories
        );

      const categories =
        normalizeCategories(
          rawCategories
        );

      // =====================================================
      // BACKWARD COMPATIBILITY
      // =====================================================

      if (
        categories.length === 0 &&
        req.body.category
      ) {
        const oldCategory = {
          category: String(
            req.body.category || ""
          ).trim(),

          subCategory: String(
            req.body.subCategory || ""
          ).trim(),

          subSubCategory: String(
            req.body.subSubCategory || ""
          ).trim(),
        };

        oldCategory.categoryPath = [
          oldCategory.category,
          oldCategory.subCategory,
          oldCategory.subSubCategory,
        ]
          .filter(Boolean)
          .join(" / ");

        categories.push(
          oldCategory
        );
      }

      // =====================================================
      // VALIDATION
      // =====================================================

      if (
        !name ||
        categories.length === 0 ||
        price === undefined ||
        price === ""
      ) {
        return res.status(400).json({
          message:
            "Product name, at least one category and price are required.",
        });
      }

      // =====================================================
      // PRICE
      // =====================================================

      const productPrice =
        parseNumber(
          price,
          -1
        );

      if (productPrice < 0) {
        return res.status(400).json({
          message:
            "Product price must be a valid number.",
        });
      }

      // =====================================================
      // SALE PRICE
      // =====================================================

      const productSalePrice =
        parseNumber(
          salePrice,
          0
        );

      if (productSalePrice < 0) {
        return res.status(400).json({
          message:
            "Sale price must be a valid number.",
        });
      }

      // =====================================================
      // STOCK
      // =====================================================

      const productStock =
        parseNumber(
          stock,
          0
        );

      if (productStock < 0) {
        return res.status(400).json({
          message:
            "Stock cannot be negative.",
        });
      }

      // =====================================================
      // IMAGES
      // =====================================================

      const imageUrls = (
        req.files || []
      ).map(
        (file) =>
          `/uploads/${file.filename}`
      );

      // =====================================================
      // PRIMARY CATEGORY
      // =====================================================

      const primaryCategory =
        categories[0];

      // =====================================================
      // CREATE PRODUCT
      // =====================================================

      const product =
        await Product.create({
          // -------------------------------------------------
          // BASIC INFORMATION
          // -------------------------------------------------

          name:
            String(name).trim(),

          code:
            code !== undefined
              ? String(code).trim()
              : "",

          size:
            size !== undefined
              ? String(size).trim()
              : "",

          productType:
            productType !== undefined
              ? String(
                  productType
                ).trim()
              : "",

          material:
            material !== undefined
              ? String(
                  material
                ).trim()
              : "",

          color:
            color !== undefined
              ? String(color).trim()
              : "",

          brand:
            brand !== undefined
              ? String(brand).trim()
              : "",

          warranty:
            warranty !== undefined
              ? String(warranty).trim()
              : "",

          // -------------------------------------------------
          // CATEGORY
          // -------------------------------------------------

          category:
            primaryCategory.category,

          subCategory:
            primaryCategory.subCategory,

          subSubCategory:
            primaryCategory.subSubCategory,

          categoryPath:
            primaryCategory.categoryPath,

          categories,

          // -------------------------------------------------
          // PRICING
          // -------------------------------------------------

          price:
            productPrice,

          salePrice:
            productSalePrice,

          // -------------------------------------------------
          // STOCK
          // -------------------------------------------------

          stock:
            productStock,

          stockStatus:
            stockStatus || "In Stock",

          // -------------------------------------------------
          // DESCRIPTION
          // -------------------------------------------------

          shortDescription:
            shortDescription !== undefined
              ? String(
                  shortDescription
                )
              : "",

          description:
            description !== undefined
              ? String(
                  description
                )
              : "",

          // -------------------------------------------------
          // OPTIONS
          // -------------------------------------------------

          featured:
            parseBoolean(
              featured
            ),

          tags:
            parseTags(tags),

          // -------------------------------------------------
          // SEO
          // -------------------------------------------------

          seoTitle:
            seoTitle !== undefined
              ? String(
                  seoTitle
                ).trim()
              : "",

          metaDescription:
            metaDescription !== undefined
              ? String(
                  metaDescription
                ).trim()
              : "",

          // -------------------------------------------------
          // IMAGES
          // -------------------------------------------------

          images:
            imageUrls,

          // -------------------------------------------------
          // STATUS
          // -------------------------------------------------

          status:
            normalizeStatus(
              status,
              "active"
            ),
        });

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(201).json({
        message:
          "Product created successfully",
        product,
      });
    } catch (error) {
      console.error(
        "Create Product Error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create product",
        error: error.message,
      });
    }
  }
);

// =========================================================
// GET SINGLE PRODUCT
// PUBLIC
// =========================================================

router.get(
  "/:id",
  async (req, res) => {
    try {
      const product =
        await Product.findById(
          req.params.id
        );

      if (!product) {
        return res.status(404).json({
          message:
            "Product not found",
        });
      }

      return res.status(200).json(
        product
      );
    } catch (error) {
      console.error(
        "Get Product Error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to fetch product",
        error: error.message,
      });
    }
  }
);

// =========================================================
// UPDATE PRODUCT
// ADMIN ONLY
// =========================================================

router.put(
  "/:id",
  protect,
  adminOnly,
  upload.array("images", 10),
  async (req, res) => {
    try {
      // =====================================================
      // PRODUCT DATA
      // =====================================================

      const {
        name,
        price,
        salePrice,
        stock,
        stockStatus,
        featured,

        code,
        size,
        productType,
        material,
        color,
        brand,
        warranty,

        shortDescription,
        description,

        tags,

        seoTitle,
        metaDescription,

        status,
      } = req.body;

      // =====================================================
      // FIND EXISTING PRODUCT
      // =====================================================

      const existingProduct =
        await Product.findById(
          req.params.id
        );

      if (!existingProduct) {
        return res.status(404).json({
          message:
            "Product not found",
        });
      }

      // =====================================================
      // PARSE CATEGORIES
      // =====================================================

      let rawCategories =
        parseCategories(
          req.body.categories
        );

      let categories =
        normalizeCategories(
          rawCategories
        );

      // =====================================================
      // OLD CATEGORY FORMAT
      // =====================================================

      if (
        categories.length === 0 &&
        req.body.category
      ) {
        const oldCategory = {
          category: String(
            req.body.category || ""
          ).trim(),

          subCategory: String(
            req.body.subCategory || ""
          ).trim(),

          subSubCategory: String(
            req.body.subSubCategory || ""
          ).trim(),
        };

        oldCategory.categoryPath = [
          oldCategory.category,
          oldCategory.subCategory,
          oldCategory.subSubCategory,
        ]
          .filter(Boolean)
          .join(" / ");

        categories.push(
          oldCategory
        );
      }

      // =====================================================
      // KEEP EXISTING CATEGORIES
      // =====================================================

      if (
        categories.length === 0
      ) {
        categories =
          Array.isArray(
            existingProduct.categories
          )
            ? existingProduct.categories
            : [];
      }

      // =====================================================
      // PRIMARY CATEGORY
      // =====================================================

      const primaryCategory =
        categories[0] || {};

      // =====================================================
      // PRICE
      // =====================================================

      let updatedPrice =
        existingProduct.price;

      if (
        price !== undefined &&
        price !== ""
      ) {
        updatedPrice =
          parseNumber(
            price,
            existingProduct.price
          );
      }

      if (
        !Number.isFinite(
          updatedPrice
        ) ||
        updatedPrice < 0
      ) {
        return res.status(400).json({
          message:
            "Product price must be a valid number.",
        });
      }

      // =====================================================
      // SALE PRICE
      // =====================================================

      let updatedSalePrice =
        existingProduct.salePrice || 0;

      if (
        salePrice !== undefined
      ) {
        updatedSalePrice =
          parseNumber(
            salePrice,
            0
          );
      }

      if (
        !Number.isFinite(
          updatedSalePrice
        ) ||
        updatedSalePrice < 0
      ) {
        return res.status(400).json({
          message:
            "Sale price must be a valid number.",
        });
      }

      // =====================================================
      // STOCK
      // =====================================================

      let updatedStock =
        existingProduct.stock || 0;

      if (
        stock !== undefined
      ) {
        updatedStock =
          parseNumber(
            stock,
            0
          );
      }

      if (
        !Number.isFinite(
          updatedStock
        ) ||
        updatedStock < 0
      ) {
        return res.status(400).json({
          message:
            "Stock cannot be negative.",
        });
      }

      // =====================================================
      // UPDATE DATA
      // =====================================================

      const updateData = {
        // -------------------------------------------------
        // BASIC INFORMATION
        // -------------------------------------------------

        name:
          name !== undefined
            ? String(name).trim()
            : existingProduct.name,

        code:
          code !== undefined
            ? String(code).trim()
            : existingProduct.code || "",

        size:
          size !== undefined
            ? String(size).trim()
            : existingProduct.size || "",

        productType:
          productType !== undefined
            ? String(
                productType
              ).trim()
            : existingProduct.productType ||
              "",

        material:
          material !== undefined
            ? String(
                material
              ).trim()
            : existingProduct.material ||
              "",

        color:
          color !== undefined
            ? String(
                color
              ).trim()
            : existingProduct.color ||
              "",

        brand:
          brand !== undefined
            ? String(
                brand
              ).trim()
            : existingProduct.brand ||
              "",

        warranty:
          warranty !== undefined
            ? String(
                warranty
              ).trim()
            : existingProduct.warranty ||
              "",

        // -------------------------------------------------
        // CATEGORIES
        // -------------------------------------------------

        categories,

        category:
          primaryCategory.category ||
          existingProduct.category ||
          "",

        subCategory:
          primaryCategory.subCategory ||
          existingProduct.subCategory ||
          "",

        subSubCategory:
          primaryCategory.subSubCategory ||
          existingProduct.subSubCategory ||
          "",

        categoryPath:
          primaryCategory.categoryPath ||
          existingProduct.categoryPath ||
          "",

        // -------------------------------------------------
        // PRICING
        // -------------------------------------------------

        price:
          updatedPrice,

        salePrice:
          updatedSalePrice,

        // -------------------------------------------------
        // STOCK
        // -------------------------------------------------

        stock:
          updatedStock,

        stockStatus:
          stockStatus !== undefined &&
          stockStatus !== ""
            ? stockStatus
            : existingProduct.stockStatus ||
              "In Stock",

        // -------------------------------------------------
        // DESCRIPTION
        // -------------------------------------------------

        shortDescription:
          shortDescription !== undefined
            ? String(
                shortDescription
              )
            : existingProduct.shortDescription ||
              "",

        description:
          description !== undefined
            ? String(
                description
              )
            : existingProduct.description ||
              "",

        // -------------------------------------------------
        // OPTIONS
        // -------------------------------------------------

        featured:
          featured !== undefined
            ? parseBoolean(
                featured
              )
            : existingProduct.featured ||
              false,

        tags:
          tags !== undefined
            ? parseTags(tags)
            : existingProduct.tags ||
              [],

        // -------------------------------------------------
        // SEO
        // -------------------------------------------------

        seoTitle:
          seoTitle !== undefined
            ? String(
                seoTitle
              ).trim()
            : existingProduct.seoTitle ||
              "",

        metaDescription:
          metaDescription !== undefined
            ? String(
                metaDescription
              ).trim()
            : existingProduct.metaDescription ||
              "",

        // -------------------------------------------------
        // STATUS
        // -------------------------------------------------

        status:
          status !== undefined &&
          status !== ""
            ? normalizeStatus(
                status,
                existingProduct.status ||
                  "active"
              )
            : existingProduct.status ||
              "active",
      };

      // =====================================================
      // NEW IMAGES
      // =====================================================

      const newImages = (
        req.files || []
      ).map(
        (file) =>
          `/uploads/${file.filename}`
      );

      /*
        New images uploaded:
        replace old images.

        No new images:
        keep existing images.
      */

      if (
        newImages.length > 0
      ) {
        updateData.images =
          newImages;
      }

      // =====================================================
      // UPDATE DATABASE
      // =====================================================

      const product =
        await Product.findByIdAndUpdate(
          req.params.id,
          updateData,
          {
            new: true,
            runValidators: true,
          }
        );

      if (!product) {
        return res.status(404).json({
          message:
            "Product not found",
        });
      }

      // =====================================================
      // RESPONSE
      // =====================================================

      return res.status(200).json({
        message:
          "Product updated successfully",
        product,
      });
    } catch (error) {
      console.error(
        "Update Product Error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update product",
        error: error.message,
      });
    }
  }
);

// =========================================================
// DELETE PRODUCT
// ADMIN ONLY
// =========================================================

router.delete(
  "/:id",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const product =
        await Product.findByIdAndDelete(
          req.params.id
        );

      if (!product) {
        return res.status(404).json({
          message:
            "Product not found",
        });
      }

      return res.status(200).json({
        message:
          "Product deleted successfully",
      });
    } catch (error) {
      console.error(
        "Delete Product Error:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to delete product",
        error: error.message,
      });
    }
  }
);

// =========================================================
// EXPORT
// =========================================================

module.exports = router;