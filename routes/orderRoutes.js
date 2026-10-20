const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Order = require("../models/Order");
const Product = require("../models/Product");

const { protect, adminOnly } = require("../middleware/authMiddleware");

const DELIVERY_CHARGES = 0;

const ALLOWED_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

// =======================================================
// PLACE ORDER
// PUBLIC
// =======================================================

router.post("/", async (req, res) => {
  const decremented = [];

  const restoreStock = async () => {
    for (const d of decremented) {
      await Product.updateOne(
        { _id: d.productId },
        { $inc: { stock: d.quantity } }
      );
    }
  };

  try {
    const { customer, items } = req.body;

    if (!customer) {
      return res.status(400).json({
        message: "Customer details are required.",
      });
    }

    if (
      !customer.name?.trim() ||
      !customer.whatsapp?.trim() ||
      !customer.address?.trim() ||
      !customer.city?.trim()
    ) {
      return res.status(400).json({
        message: "Name, WhatsApp number, address and city are required.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Your cart is empty.",
      });
    }

    const verifiedItems = [];

    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        return res.status(400).json({
          message: `Invalid product ID for ${item.name}.`,
        });
      }

      const product = await Product.findById(item.productId);

      if (!product) {
        return res.status(404).json({
          message: `Product "${item.name}" is no longer available.`,
        });
      }

      const requestedQuantity = Number(item.quantity);

      if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
        return res.status(400).json({
          message: `Invalid quantity for ${product.name}.`,
        });
      }

      if (Number(product.stock) < requestedQuantity) {
        return res.status(400).json({
          message: `Only ${product.stock} item(s) of "${product.name}" are available.`,
        });
      }

      const productPrice =
        Number(product.salePrice) > 0
          ? Number(product.salePrice)
          : Number(product.price || 0);

      verifiedItems.push({
        productId: product._id,
        name: product.name,
        price: productPrice,
        quantity: requestedQuantity,
        total: productPrice * requestedQuantity,
      });
    }

    const calculatedSubtotal = verifiedItems.reduce(
      (sum, item) => sum + item.total,
      0
    );

    const calculatedTotal = calculatedSubtotal + DELIVERY_CHARGES;

    const orderNumber = `ZBX-${Date.now()}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    // ===================================================
    // REDUCE STOCK
    // ===================================================

    for (const item of verifiedItems) {
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          stock: { $gte: item.quantity },
        },
        {
          $inc: { stock: -item.quantity },
        },
        { new: true }
      );

      if (!updatedProduct) {
        await restoreStock();

        return res.status(400).json({
          message: `Stock changed for "${item.name}". Please review your cart and try again.`,
        });
      }

      decremented.push(item);
    }

    // ===================================================
    // CREATE ORDER
    // ===================================================

    let order;

    try {
      order = await Order.create({
        orderNumber,

        customer: {
          name: customer.name.trim(),
          whatsapp: customer.whatsapp.trim(),
          email: customer.email ? customer.email.trim() : "",
          address: customer.address.trim(),
          city: customer.city.trim(),
          notes: customer.notes ? customer.notes.trim() : "",
        },

        items: verifiedItems,

        subtotal: calculatedSubtotal,

        deliveryCharges: DELIVERY_CHARGES,

        total: calculatedTotal,

        status: "pending",
      });
    } catch (createError) {
      await restoreStock();
      throw createError;
    }

    return res.status(201).json({
      success: true,

      message: "Order placed successfully.",

      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        customer: order.customer,
        items: order.items,
        subtotal: order.subtotal,
        deliveryCharges: order.deliveryCharges,
        total: order.total,
        status: order.status,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error("CREATE ORDER ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to place order.",
      error: error.message,
    });
  }
});

// =======================================================
// MY ORDERS
// LOGGED-IN USER
// IMPORTANT:
// This route MUST be before /:id
// =======================================================

router.get("/my-orders", protect, async (req, res) => {
  try {
    const email = req.user.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: "User email not found.",
      });
    }

    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const orders = await Order.find({
      "customer.email": {
        $regex: `^${escapedEmail}$`,
        $options: "i",
      },
    })
      .sort({ createdAt: -1 })
      .populate("items.productId");

    return res.status(200).json(orders);
  } catch (error) {
    console.error("GET MY ORDERS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch your orders.",
      error: error.message,
    });
  }
});

// =======================================================
// GET ALL ORDERS
// ADMIN ONLY
// =======================================================

router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("items.productId");

    return res.status(200).json(orders);
  } catch (error) {
    console.error("GET ORDERS ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch orders.",
      error: error.message,
    });
  }
});

// =======================================================
// GET SINGLE ORDER
// ADMIN ONLY
// =======================================================

router.get("/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    const order = await Order.findById(req.params.id).populate(
      "items.productId"
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    return res.status(200).json(order);
  } catch (error) {
    console.error("GET ORDER ERROR:", error);

    return res.status(500).json({
      message: "Failed to fetch order.",
      error: error.message,
    });
  }
});

// =======================================================
// UPDATE ORDER STATUS
// ADMIN ONLY
// =======================================================

router.put("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid order ID.",
      });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        message: "Invalid order status.",
      });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!order) {
      return res.status(404).json({
        message: "Order not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully.",
      order,
    });
  } catch (error) {
    console.error("UPDATE ORDER STATUS ERROR:", error);

    return res.status(500).json({
      message: "Failed to update order status.",
      error: error.message,
    });
  }
});

// =======================================================
// EXPORT ROUTER
// =======================================================

module.exports = router;