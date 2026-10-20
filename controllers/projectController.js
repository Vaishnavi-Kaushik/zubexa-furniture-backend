const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Project = require("../models/Project");

// ======================================================
// MULTER IMAGE UPLOAD SETUP
// ======================================================

const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },

  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${ext}`;

    cb(null, uniqueName);
  },
});

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
      new Error("Only JPG, JPEG, PNG and WEBP images are allowed."),
      false
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per image
    files: 50,
  },
});

const sortOrder = { projectNo: 1, createdAt: 1 };

// ======================================================
// PUBLIC: ONLY PUBLISHED PROJECTS
// ======================================================

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      isPublished: true,
    }).sort(sortOrder);

    res.json(projects);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load projects.",
    });
  }
};

// ======================================================
// ADMIN: ALL PROJECTS
// ======================================================

exports.getAllProjectsAdmin = async (req, res) => {
  try {
    const projects = await Project.find().sort(sortOrder);

    res.json(projects);
  } catch (err) {
    res.status(500).json({
      message: "Failed to load projects.",
    });
  }
};

// ======================================================
// PUBLIC: SINGLE PROJECT
// ======================================================

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      isPublished: true,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    res.json(project);
  } catch (err) {
    res.status(404).json({
      message: "Project not found.",
    });
  }
};

// ======================================================
// CREATE PROJECT
// ======================================================

exports.createProject = [
  upload.any(),

  async (req, res) => {
    try {
      const body = req.body;

      // ----------------------------------------------
      // Parse JSON fields coming from FormData
      // ----------------------------------------------

      let solutions = [];
      let gallery = [];

      try {
        solutions = body.solutions
          ? JSON.parse(body.solutions)
          : [];
      } catch {
        solutions = [];
      }

      try {
        gallery = body.gallery
          ? JSON.parse(body.gallery)
          : [];
      } catch {
        gallery = [];
      }

      // ----------------------------------------------
      // Uploaded files
      // ----------------------------------------------

      const files = req.files || [];

      const heroFile = files.find(
        (file) => file.fieldname === "heroImage"
      );

      const solutionFiles = files.filter(
        (file) => file.fieldname.startsWith("solutionImage_")
      );

      const galleryFiles = files.filter(
        (file) => file.fieldname.startsWith("galleryImage_")
      );

      // ----------------------------------------------
      // Hero image
      // ----------------------------------------------

      let heroImage = body.heroImage || "";

      if (heroFile) {
        heroImage = `/uploads/${heroFile.filename}`;
      }

      // ----------------------------------------------
      // Solution images
      // ----------------------------------------------

      solutions = solutions.map((solution, index) => {
        const file = solutionFiles.find(
          (item) => item.fieldname === `solutionImage_${index}`
        );

        return {
          title: solution.title || "",
          image: file
            ? `/uploads/${file.filename}`
            : solution.image || "",
        };
      });

      // ----------------------------------------------
      // Gallery images
      // ----------------------------------------------

      gallery = gallery.map((item, index) => {
        const file = galleryFiles.find(
          (itemFile) =>
            itemFile.fieldname === `galleryImage_${index}`
        );

        return {
          url: file
            ? `/uploads/${file.filename}`
            : item.url || "",
          tag: item.tag || "Other",
        };
      });

      // ----------------------------------------------
      // Create project
      // ----------------------------------------------

      const project = await Project.create({
        projectNo: Number(body.projectNo || 0),
        title: body.title || "",
        country: body.country || "",
        year: body.year || "",
        value: Number(body.value || 0),
        category: body.category || "",
        status: body.status || "Completed",
        overview: body.overview || "",
        heroImage,
        solutions,
        gallery,
        isPublished:
          body.isPublished === true ||
          body.isPublished === "true",
      });

      res.status(201).json(project);
    } catch (err) {
      console.error("Create project error:", err);

      res.status(400).json({
        message: err.message || "Failed to create project.",
      });
    }
  },
];

// ======================================================
// UPDATE PROJECT
// ======================================================

exports.updateProject = [
  upload.any(),

  async (req, res) => {
    try {
      const project = await Project.findById(req.params.id);

      if (!project) {
        return res.status(404).json({
          message: "Project not found.",
        });
      }

      const body = req.body;
      const files = req.files || [];

      // ----------------------------------------------
      // Parse JSON fields
      // ----------------------------------------------

      let solutions = [];
      let gallery = [];

      try {
        solutions = body.solutions
          ? JSON.parse(body.solutions)
          : project.solutions;
      } catch {
        solutions = project.solutions;
      }

      try {
        gallery = body.gallery
          ? JSON.parse(body.gallery)
          : project.gallery;
      } catch {
        gallery = project.gallery;
      }

      // ----------------------------------------------
      // Hero image
      // ----------------------------------------------

      let heroImage = body.heroImage || project.heroImage || "";

      const heroFile = files.find(
        (file) => file.fieldname === "heroImage"
      );

      if (heroFile) {
        heroImage = `/uploads/${heroFile.filename}`;
      }

      // ----------------------------------------------
      // Solution images
      // ----------------------------------------------

      const solutionFiles = files.filter(
        (file) => file.fieldname.startsWith("solutionImage_")
      );

      solutions = solutions.map((solution, index) => {
        const file = solutionFiles.find(
          (item) => item.fieldname === `solutionImage_${index}`
        );

        return {
          title: solution.title || "",
          image: file
            ? `/uploads/${file.filename}`
            : solution.image || "",
        };
      });

      // ----------------------------------------------
      // Gallery images
      // ----------------------------------------------

      const galleryFiles = files.filter(
        (file) => file.fieldname.startsWith("galleryImage_")
      );

      gallery = gallery.map((item, index) => {
        const file = galleryFiles.find(
          (itemFile) =>
            itemFile.fieldname === `galleryImage_${index}`
        );

        return {
          url: file
            ? `/uploads/${file.filename}`
            : item.url || "",
          tag: item.tag || "Other",
        };
      });

      // ----------------------------------------------
      // Update project
      // ----------------------------------------------

      project.projectNo = Number(body.projectNo || 0);
      project.title = body.title || "";
      project.country = body.country || "";
      project.year = body.year || "";
      project.value = Number(body.value || 0);
      project.category = body.category || "";
      project.status = body.status || "Completed";
      project.overview = body.overview || "";
      project.heroImage = heroImage;
      project.solutions = solutions;
      project.gallery = gallery;

      if (body.isPublished !== undefined) {
        project.isPublished =
          body.isPublished === true ||
          body.isPublished === "true";
      }

      const updatedProject = await project.save();

      res.json(updatedProject);
    } catch (err) {
      console.error("Update project error:", err);

      res.status(400).json({
        message: err.message || "Failed to update project.",
      });
    }
  },
];

// ======================================================
// DELETE PROJECT
// ======================================================

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found.",
      });
    }

    res.json({
      message: "Project deleted.",
    });
  } catch (err) {
    res.status(400).json({
      message: err.message,
    });
  }
};