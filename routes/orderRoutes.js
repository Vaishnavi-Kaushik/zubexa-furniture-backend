const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Order = require("../models/Order");
const Product = require("../models/Product");

// =========================================================
// CREATE ORDER
// =========================================================

router.post("/", async (req, res) => {
  try {
    const {
      customer,
      items,
      deliveryCharges,
    } = req.body;

    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    if (!customer) {
      return res.status(400).json({
        message:
          "Customer details are required.",
      });
    }

    if (
      !customer.name?.trim() ||
      !customer.whatsapp?.trim() ||
      !customer.address?.trim() ||
      !customer.city?.trim()
    ) {
      return res.status(400).json({
        message:
          "Name, WhatsApp number, address and city are required.",
      });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "Your cart is empty.",
      });
    }

    // =====================================================
    // VERIFY PRODUCTS
    // =====================================================

    const verifiedItems = [];

    for (const item of items) {
      if (
        !mongoose.Types.ObjectId.isValid(
          item.productId
        )
      ) {
        return res.status(400).json({
          message:
            `Invalid product ID for ${item.name}.`,
        });
      }

      const product =
        await Product.findById(
          item.productId
        );

      if (!product) {
        return res.status(404).json({
          message:
            `Product "${item.name}" is no longer available.`,
        });
      }

      const requestedQuantity =
        Number(item.quantity);

      if (
        !Number.isInteger(
          requestedQuantity
        ) ||
        requestedQuantity <= 0
      ) {
        return res.status(400).json({
          message:
            `Invalid quantity for ${product.name}.`,
        });
      }

      if (
        Number(product.stock) <
        requestedQuantity
      ) {
        return res.status(400).json({
          message:
            `Only ${product.stock} item(s) of "${product.name}" are available.`,
        });
      }

      const productPrice =
        Number(product.price || 0);

      const itemTotal =
        productPrice *
        requestedQuantity;

      verifiedItems.push({
        productId:
          product._id,

        name:
          product.name,

        price:
          productPrice,

        quantity:
          requestedQuantity,

        total:
          itemTotal,
      });
    }

    // =====================================================
    // CALCULATE TOTALS FROM DATABASE
    // =====================================================

    const calculatedSubtotal =
      verifiedItems.reduce(
        (sum, item) =>
          sum + item.total,
        0
      );

    const calculatedDelivery =
      Number(deliveryCharges) || 0;

    const calculatedTotal =
      calculatedSubtotal +
      calculatedDelivery;

    // =====================================================
    // GENERATE ORDER NUMBER
    // =====================================================

    const orderNumber =
      `ZBX-${Date.now()}-${Math.floor(
        100 + Math.random() * 900
      )}`;

    // =====================================================
    // REDUCE STOCK SAFELY
    // =====================================================

    for (const item of verifiedItems) {
      const updatedProduct =
        await Product.findOneAndUpdate(
          {
            _id: item.productId,
            stock: {
              $gte: item.quantity,
            },
          },
          {
            $inc: {
              stock: -item.quantity,
            },
          },
          {
            new: true,
          }
        );

      if (!updatedProduct) {
        return res.status(400).json({
          message:
            `Stock changed for "${item.name}". Please review your cart and try again.`,
        });
      }
    }

    // =====================================================
    // CREATE ORDER
    // =====================================================

    const order =
      await Order.create({
        orderNumber,

        customer: {
          name:
            customer.name.trim(),

          whatsapp:
            customer.whatsapp.trim(),

          email:
            customer.email
              ? customer.email.trim()
              : "",

          address:
            customer.address.trim(),

          city:
            customer.city.trim(),

          notes:
            customer.notes
              ? customer.notes.trim()
              : "",
        },

        items:
          verifiedItems,

        subtotal:
          calculatedSubtotal,

        deliveryCharges:
          calculatedDelivery,

        total:
          calculatedTotal,

        status:
          "pending",
      });

    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(201).json({
      success: true,

      message:
        "Order placed successfully.",

      order: {
        _id:
          order._id,

        orderNumber:
          order.orderNumber,

        customer:
          order.customer,

        items:
          order.items,

        subtotal:
          order.subtotal,

        deliveryCharges:
          order.deliveryCharges,

        total:
          order.total,

        status:
          order.status,

        createdAt:
          order.createdAt,
      },
    });

  } catch (error) {
    console.error(
      "CREATE ORDER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to place order.",
      error:
        error.message,
    });
  }
});

// =========================================================
// GET ALL ORDERS
// =========================================================

router.get("/", async (req, res) => {
  try {
    const orders =
      await Order.find()
        .sort({
          createdAt: -1,
        })
        .populate(
          "items.productId"
        );

    return res.status(200).json(
      orders
    );

  } catch (error) {
    console.error(
      "GET ORDERS ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch orders.",
      error:
        error.message,
    });
  }
});

// =========================================================
// GET SINGLE ORDER
// =========================================================

router.get("/:id", async (req, res) => {
  try {
    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid order ID.",
      });
    }

    const order =
      await Order.findById(
        req.params.id
      ).populate(
        "items.productId"
      );

    if (!order) {
      return res.status(404).json({
        message:
          "Order not found.",
      });
    }

    return res.status(200).json(
      order
    );

  } catch (error) {
    console.error(
      "GET ORDER ERROR:",
      error
    );

    return res.status(500).json({
      message:
        "Failed to fetch order.",
      error:
        error.message,
    });
  }
});

// =========================================================
// UPDATE ORDER STATUS
// =========================================================

router.put(
  "/:id/status",
  async (req, res) => {
    try {
      const { status } =
        req.body;

      const allowedStatuses = [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ];

      if (
        !allowedStatuses.includes(
          status
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid order status.",
        });
      }

      const order =
        await Order.findByIdAndUpdate(
          req.params.id,
          {
            status,
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!order) {
        return res.status(404).json({
          message:
            "Order not found.",
        });
      }

      return res.status(200).json({
        success: true,
        message:
          "Order status updated successfully.",
        order,
      });

    } catch (error) {
      console.error(
        "UPDATE ORDER STATUS ERROR:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update order status.",
        error:
          error.message,
      });
    }
  }
);

module.exports = router;