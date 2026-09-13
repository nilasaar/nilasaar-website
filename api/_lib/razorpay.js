const crypto = require("crypto");

const RAZORPAY_API = "https://api.razorpay.com/v1";

function authHeader() {
  const key = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) {
    throw new Error("RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are not set");
  }
  return "Basic " + Buffer.from(`${key}:${secret}`).toString("base64");
}

async function createOrder({ amount, currency, receipt, notes }) {
  const res = await fetch(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
    },
    body: JSON.stringify({ amount, currency, receipt, notes }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Razorpay order creation failed (${res.status}): ${body}`);
  }
  return res.json();
}

// Verifies the signature Razorpay's Checkout returns to the browser after
// a successful payment (order_id + "|" + payment_id, HMAC-SHA256 with the
// key secret).
function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return timingSafeEqualHex(expected, signature);
}

// Verifies a webhook request body against the separate webhook secret
// configured in the Razorpay Dashboard (Settings -> Webhooks).
function verifyWebhookSignature({ rawBody, signature }) {
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return timingSafeEqualHex(expected, signature);
}

function timingSafeEqualHex(a, b) {
  if (typeof b !== "string" || b.length !== a.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function truncate(value, maxLength) {
  const str = String(value ?? "");
  return str.length > maxLength ? str.slice(0, maxLength) : str;
}

module.exports = { createOrder, verifyPaymentSignature, verifyWebhookSignature, truncate };
