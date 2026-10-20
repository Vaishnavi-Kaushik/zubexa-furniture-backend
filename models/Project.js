const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    projectNo: { type: Number, default: 0 },
    title: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    year: { type: String, required: true, trim: true },
    value: { type: Number, default: 0 },
    category: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["Completed", "Ongoing"],
      default: "Completed",
    },
    overview: { type: String, default: "" },
    heroImage: { type: String, default: "" },
    solutions: [
      {
        title: { type: String, required: true },
        image: { type: String, default: "" },
      },
    ],
    gallery: [
      {
        url: { type: String, required: true },
        tag: { type: String, default: "Other" },
      },
    ],
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", projectSchema);