const express = require("express");
const router = express.Router();

const Category = require("../models/Category");
const Product = require("../models/Product");

// ⚠️ Ye 2 middleware wahi use karo jo productRoutes.js mein POST/PUT/DELETE par lage hain.
// Naam/path alag ho to yahan badal do.
const { protect, adminOnly } = require("../middleware/authMiddleware");

const same = (a, b) =>
  String(a || "").trim().toLowerCase() ===
  String(b || "").trim().toLowerCase();

// tree ko saaf (sanitize) karta hai
function cleanTree(tree) {
  if (!Array.isArray(tree)) return null;

  return tree
    .map((cat) => {
      const name = String(cat?.name || "").trim();
      if (!name) return null;

      const subs = (Array.isArray(cat.subCategories) ? cat.subCategories : [])
        .map((sub) => {
          const subName = String(
            typeof sub === "string" ? sub : sub?.name || ""
          ).trim();
          if (!subName) return null;

          const subSubs = (
            typeof sub === "string" || !Array.isArray(sub.subCategories)
              ? []
              : sub.subCategories
          )
            .map((s) =>
              String(typeof s === "string" ? s : s?.name || "").trim()
            )
            .filter(Boolean);

          return { name: subName, subCategories: subSubs };
        })
        .filter(Boolean);

      return { name, subCategories: subs };
    })
    .filter(Boolean);
}

// =========================================================
// GET  /api/categories  -> saved tree (ya null)
// =========================================================

router.get("/", async (req, res) => {
  try {
    const doc = await Category.findOne({ key: "main" }).lean();

    res.json({ tree: doc?.tree?.length ? doc.tree : null });
  } catch (error) {
    console.error("Get Categories Error:", error);
    res.status(500).json({ message: "Unable to load categories." });
  }
});

// =========================================================
// PUT  /api/categories  -> poora tree save (add / delete)
// =========================================================

router.put("/", protect, adminOnly, async (req, res) => {
  try {
    const tree = cleanTree(req.body.tree);

    if (!tree) {
      return res.status(400).json({ message: "Invalid category tree." });
    }

    const doc = await Category.findOneAndUpdate(
      { key: "main" },
      { $set: { tree } },
      { new: true, upsert: true }
    );

    res.json({ message: "Categories saved.", tree: doc.tree });
  } catch (error) {
    console.error("Save Categories Error:", error);
    res.status(500).json({ message: "Unable to save categories." });
  }
});

// =========================================================
// POST /api/categories/rename
// body: { level, category, subCategory, subSubCategory, newName, tree }
// Products ke naam bhi badal deta hai, phir tree save karta hai
// =========================================================

router.post("/rename", protect, adminOnly, async (req, res) => {
  try {
    const { category, subCategory, subSubCategory, tree } = req.body;
    const level = Number(req.body.level);
    const newName = String(req.body.newName || "").trim();
    const cleaned = cleanTree(tree);

    if (![1, 2, 3].includes(level) || !newName || !cleaned) {
      return res.status(400).json({ message: "Invalid rename request." });
    }

    const matches = (e) =>
      same(e.category, category) &&
      (level < 2 || same(e.subCategory, subCategory)) &&
      (level < 3 || same(e.subSubCategory, subSubCategory));

    const apply = (e) => {
      const out = { ...e };
      if (level === 1) out.category = newName;
      if (level === 2) out.subCategory = newName;
      if (level === 3) out.subSubCategory = newName;

      out.categoryPath = [out.category, out.subCategory, out.subSubCategory]
        .filter(Boolean)
        .join(" / ");

      return out;
    };

    const products = await Product.find({}).lean();
    let updated = 0;

    for (const p of products) {
      const set = {};

      // categories array
      if (Array.isArray(p.categories) && p.categories.length > 0) {
        let changed = false;

        const cats = p.categories.map((e) => {
          if (matches(e)) {
            changed = true;
            return apply(e);
          }
          return e;
        });

        if (changed) set.categories = cats;
      }

      // legacy single-category fields
      const legacy = {
        category: p.category,
        subCategory: p.subCategory || "",
        subSubCategory: p.subSubCategory || "",
      };

      if (p.category && matches(legacy)) {
        const n = apply(legacy);
        set.category = n.category;
        set.subCategory = n.subCategory;
        set.subSubCategory = n.subSubCategory;
        set.categoryPath = n.categoryPath;
      }

      if (Object.keys(set).length > 0) {
        await Product.updateOne({ _id: p._id }, { $set: set });
        updated++;
      }
    }

    const doc = await Category.findOneAndUpdate(
      { key: "main" },
      { $set: { tree: cleaned } },
      { new: true, upsert: true }
    );

    res.json({
      message: "Category renamed.",
      updatedProducts: updated,
      tree: doc.tree,
    });
  } catch (error) {
    console.error("Rename Category Error:", error);
    res.status(500).json({ message: "Unable to rename category." });
  }
});

// =========================================================
// POST /api/categories/delete
// body: { level, category, subCategory, subSubCategory, tree }
// Us category ke products delete karta hai (jo products ki doosri
// category bhi hai, unmein sirf ye category hatti hai), phir tree save
// =========================================================

router.post("/delete", protect, adminOnly, async (req, res) => {
  try {
    const { category, subCategory, subSubCategory, tree } = req.body;
    const level = Number(req.body.level);
    const cleaned = cleanTree(tree);

    if (![1, 2, 3].includes(level) || !cleaned) {
      return res.status(400).json({ message: "Invalid delete request." });
    }

    const matches = (e) =>
      same(e.category, category) &&
      (level < 2 || same(e.subCategory, subCategory)) &&
      (level < 3 || same(e.subSubCategory, subSubCategory));

    const products = await Product.find({}).lean();
    let deleted = 0;
    let updated = 0;

    for (const p of products) {
      const hasArray = Array.isArray(p.categories) && p.categories.length > 0;

      if (!hasArray && !p.category) continue;

      const entries = hasArray
        ? p.categories
        : [
            {
              category: p.category,
              subCategory: p.subCategory || "",
              subSubCategory: p.subSubCategory || "",
            },
          ];

      const remaining = entries.filter((e) => !matches(e));

      // is product ka is category se koi lena-dena nahi
      if (remaining.length === entries.length) continue;

      // product sirf isi category mein tha -> product delete
      if (remaining.length === 0) {
        await Product.deleteOne({ _id: p._id });
        deleted++;
        continue;
      }

      // product ki doosri category bhi hai -> sirf ye category hatao
      const first = remaining[0];

      await Product.updateOne(
        { _id: p._id },
        {
          $set: {
            categories: remaining,
            category: first.category,
            subCategory: first.subCategory || "",
            subSubCategory: first.subSubCategory || "",
            categoryPath:
              first.categoryPath ||
              [first.category, first.subCategory, first.subSubCategory]
                .filter(Boolean)
                .join(" / "),
          },
        }
      );
      updated++;
    }

    const doc = await Category.findOneAndUpdate(
      { key: "main" },
      { $set: { tree: cleaned } },
      { new: true, upsert: true }
    );

    res.json({
      message: "Category deleted.",
      deletedProducts: deleted,
      updatedProducts: updated,
      tree: doc.tree,
    });
  } catch (error) {
    console.error("Delete Category Error:", error);
    res.status(500).json({ message: "Unable to delete category." });
  }
});

module.exports = router;