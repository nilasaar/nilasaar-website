const products = require("./_products.json");
const { createOrder, truncate } = require("./_lib/razorpay");

const MAX_LINE_ITEMS = 20;
const MAX_QTY_PER_ITEM = 20;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { items, customer } = req.body || {};

    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINE_ITEMS) {
      res.status(400).json({ error: "Cart is empty or invalid." });
      return;
    }
    if (!customer || !customer.name || !customer.phone || !customer.address) {
      res.status(400).json({ error: "Name, phone, and address are required." });
      return;
    }

    let amount = 0;
    const lineSummaries = [];

    for (const item of items) {
      const product = products[item.slug];
      const qty = Number(item.qty);
      if (!product || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM) {
        res.status(400).json({ error: `Invalid item: ${item.slug}` });
        return;
      }
      amount += product.price * qty * 100; // paise, price comes from the server-side manifest, never the client
      lineSummaries.push(`${product.title} x${qty}`);
    }

    const receipt = `nilasaar_${Date.now()}`;
    const order = await createOrder({
      amount,
      currency: "INR",
      receipt,
      notes: {
        customer_name: truncate(customer.name, 256),
        customer_phone: truncate(customer.phone, 256),
        customer_email: truncate(customer.email || "", 256),
        customer_address: truncate(customer.address, 256),
        items: truncate(lineSummaries.join(", "), 256),
      },
    });

    res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create order." });
  }
};
