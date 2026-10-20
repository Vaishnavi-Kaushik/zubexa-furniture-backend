const Order = require("../models/Order");
const Product = require("../models/Product"); // apne Product model ka sahi path rakhna

const DELIVERY_CHARGES = 0; // baad me badal sakte ho

// Public: customer order place karega
exports.createOrder = async (req, res) => {
  try {
    const { customer, items } = req.body;

    if (!customer?.name || !customer?.whatsapp || !customer?.address || !customer?.city) {
      return res.status(400).json({
        message: "Name, WhatsApp, address and city are required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order must contain at least one product" });
    }

    // Price hamesha database se, frontend pe bharosa nahi
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: "One of the products was not found" });
      }

      const price = product.salePrice > 0 ? product.salePrice : product.price;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const lineTotal = price * quantity;

      subtotal += lineTotal;
      orderItems.push({
        productId: product._id,
        name: product.name,
        price,
        quantity,
        total: lineTotal,
      });
    }

    const order = await Order.create({
      orderNumber: `ZFT-${Date.now()}`,
      customer,
      items: orderItems,
      subtotal,
      deliveryCharges: DELIVERY_CHARGES,
      total: subtotal + DELIVERY_CHARGES,
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: saare orders
exports.getOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin: status update
exports.updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};