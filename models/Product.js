const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    // =========================================================
    // BASIC PRODUCT INFORMATION
    // =========================================================
    name: {
      type: String,
      required: true,
      trim: true,
    },

    code: {
      type: String,
      default: "",
      trim: true,
    },

    size: {
      type: String,
      default: "",
      trim: true,
    },

    productType: {
      type: String,
      default: "",
      trim: true,
    },

    material: {
      type: String,
      default: "",
      trim: true,
    },

    color: {
      type: String,
      default: "",
      trim: true,
    },

    brand: {
      type: String,
      default: "",
      trim: true,
    },

    warranty: {
      type: String,
      default: "",
      trim: true,
    },

    // =========================================================
    // MULTIPLE CATEGORIES
    // =========================================================
    categories: [
      {
        category: {
          type: String,
          required: true,
          trim: true,
        },

        subCategory: {
          type: String,
          default: "",
          trim: true,
        },

        subSubCategory: {
          type: String,
          default: "",
          trim: true,
        },

        categoryPath: {
          type: String,
          default: "",
          trim: true,
        },
      },
    ],

    // =========================================================
    // LEGACY CATEGORY FIELDS
    // =========================================================
    category: {
      type: String,
      default: "",
      trim: true,
    },

    subCategory: {
      type: String,
      default: "",
      trim: true,
    },

    subSubCategory: {
      type: String,
      default: "",
      trim: true,
    },

    categoryPath: {
      type: String,
      default: "",
      trim: true,
    },

    // =========================================================
    // PRODUCT DESCRIPTION
    // =========================================================
    shortDescription: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    // =========================================================
    // PRICING
    // =========================================================
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    salePrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    // =========================================================
    // STOCK
    // =========================================================
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    stockStatus: {
      type: String,
      enum: [
        "In Stock",
        "Out of Stock",
        "Pre-Order",
      ],
      default: "In Stock",
    },

    // =========================================================
    // FEATURED PRODUCT
    // =========================================================
    featured: {
      type: Boolean,
      default: false,
    },

    // =========================================================
    // TAGS
    // =========================================================
    tags: {
      type: [String],
      default: [],
    },

    // =========================================================
    // SEO
    // =========================================================
    seoTitle: {
      type: String,
      default: "",
      trim: true,
    },

    metaDescription: {
      type: String,
      default: "",
      trim: true,
    },

    // =========================================================
    // PRODUCT IMAGES
    // =========================================================
    images: {
      type: [String],
      default: [],
    },

    // =========================================================
    // PRODUCT STATUS
    // =========================================================
    status: {
      type: String,
      enum: [
        "active",
        "inactive",
        "draft",
      ],
      default: "active",
    },
  },

  // =========================================================
  // TIMESTAMPS
  // =========================================================
  {
    timestamps: true,
  }
);

// =========================================================
// EXPORT MODEL
// =========================================================
module.exports =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema);