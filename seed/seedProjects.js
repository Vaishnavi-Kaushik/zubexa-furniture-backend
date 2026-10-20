require("dotenv").config();
const mongoose = require("mongoose");
const Project = require("../models/Project");

const toSolutions = (titles) => titles.map((title) => ({ title, image: "" }));

const hotelSolutions = toSolutions([
  "Beds & Headboards",
  "Sofas & Lounge Seating",
  "Work Desks & Chairs",
  "Wardrobes & Storage",
  "Tables & Chairs",
  "TV Units & Loose Furniture",
]);

const staffSolutions = toSolutions([
  "Beds & Mattresses",
  "Wardrobes & Lockers",
  "Study & Work Tables",
  "Dining Sets",
  "Sofas & Seating",
  "Storage Units",
]);

const flatsSolutions = toSolutions([
  "Bedroom Furniture",
  "Living Room Sets",
  "Dining Sets",
  "Wardrobes & Storage",
  "Work Desks & Chairs",
  "Loose Furniture",
]);

const qatarOverview =
  "Staff accommodation furnishing project in Qatar covering both junior staff and senior staff accommodation. We supplied and installed complete furniture for staff living quarters including beds, wardrobes, tables, seating and storage units.\n\nOur team handled everything from planning and manufacturing to delivery and installation, ensuring on-time completion with durable, easy-to-maintain furniture.";

const uaeOverview =
  "Staff accommodation and furnishing project in the UAE, covering accommodation for junior staff, senior staff and managers. We supplied complete furniture packages with beds, wardrobes, desks, seating, dining and storage solutions, matched to each staff grade.\n\nFrom design development to manufacturing, delivery and installation, our team ensured a smooth and timely handover.";

const projects = [
  {
    title: "Hotel Furnishing [11283 ROOMS]",
    country: "KSA",
    year: "2019/2020",
    value: 42500000,
    category: "Hotel Furnishing",
    overview:
      "Large scale hotel furnishing project in KSA, covering 11,283 rooms. We supplied and installed complete furniture solutions including bedroom furniture, seating, work desks, storage units and loose furniture. The project was delivered with high quality, modern design and durable materials to meet hospitality standards.\n\nOur team managed the entire process from design development and manufacturing to supply and installation, ensuring timely delivery and a successful project completion.",
    solutions: hotelSolutions,
  },
  {
    title: "Hotel Furnishing [528 ROOMS]",
    country: "KSA",
    year: "2022/2023",
    value: 5600000,
    category: "Hotel Furnishing",
    overview:
      "Hotel furnishing project in KSA covering 528 rooms. We supplied and installed bedroom furniture, seating, work desks, wardrobes and loose furniture, designed to meet hospitality standards with durable, modern finishes.\n\nOur team handled design development, manufacturing, delivery and installation, completing the project on schedule.",
    solutions: hotelSolutions,
  },
  {
    title: "Staff Accommodation",
    country: "QATAR",
    year: "2023",
    value: 6700000,
    category: "Junior Staff / Senior Staff",
    overview: qatarOverview,
    solutions: staffSolutions,
  },
  {
    title: "Staff Accommodation",
    country: "QATAR",
    year: "2024",
    value: 7850000,
    category: "Junior Staff / Senior Staff",
    overview: qatarOverview,
    solutions: staffSolutions,
  },
  {
    title: "Flats Furnishing/Hospital Staff Furnishing",
    country: "KUWAIT",
    year: "2024",
    value: 980000,
    category: "Flats / Medical Staff",
    overview:
      "Furnishing project in Kuwait covering residential flats and hospital staff accommodation. We supplied and installed bedroom furniture, living and dining sets, work desks and storage solutions, built for comfort and everyday durability.\n\nOur team managed manufacturing, delivery and installation to meet the client's timeline.",
    solutions: flatsSolutions,
  },
  {
    title: "Staff Accommodation",
    country: "QATAR",
    year: "2025",
    value: 7200000,
    category: "Junior Staff / Senior Staff",
    overview: qatarOverview,
    solutions: staffSolutions,
  },
  {
    title: "Staff Accommodation",
    country: "QATAR",
    year: "2026 (up to August)",
    value: 5800000,
    category: "Junior Staff / Senior Staff",
    overview: qatarOverview,
    solutions: staffSolutions,
  },
  {
    title: "Staff Accommodation+Furnishing",
    country: "UAE",
    year: "2022",
    value: 1300000,
    category: "Junior Staff / Senior Staff / Managers",
    overview: uaeOverview,
    solutions: staffSolutions,
  },
  {
    title: "Staff Accommodation+Furnishing",
    country: "UAE",
    year: "2023",
    value: 4300000,
    category: "Junior Staff / Senior Staff / Managers",
    overview: uaeOverview,
    solutions: staffSolutions,
  },
  {
    title: "Staff Accommodation+Furnishing",
    country: "UAE",
    year: "2024",
    value: 23800000,
    category: "Junior Staff / Senior Staff / Managers",
    overview: uaeOverview,
    solutions: staffSolutions,
  },
  {
    title: "Staff Accommodation+Furnishing",
    country: "UAE",
    year: "2025",
    value: 28700000,
    category: "Junior Staff / Senior Staff / Managers",
    overview: uaeOverview,
    solutions: staffSolutions,
  },
  {
    title: "Staff Accommodation+Furnishing",
    country: "UAE",
    year: "2026 (up to August)",
    value: 24500000,
    category: "Junior Staff / Senior Staff / Managers",
    overview: uaeOverview,
    solutions: staffSolutions,
  },
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI); // 👈 apni .env ka variable name check karo

    if (process.argv.includes("--reset")) {
      await Project.deleteMany({});
      console.log("Old projects deleted.");
    }

    const count = await Project.countDocuments();
    if (count > 0) {
      console.log(`Projects already exist (${count}). Seed skipped.`);
    } else {
      await Project.insertMany(
        projects.map((p, i) => ({ ...p, projectNo: i + 1, status: "Completed" }))
      );
      console.log("12 projects seeded.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

run();