const mongoose = require("mongoose");

// Poora category tree ek hi document mein save hota hai
// tree = [{ name, subCategories: [{ name, subCategories: ["sub-sub", ...] }] }]
const categorySchema = new mongoose.Schema(
  {
    key: { type: String, default: "main", unique: true },
    tree: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Category", categorySchema);