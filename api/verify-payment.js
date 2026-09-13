const { verifyPaymentSignature } = require("./_lib/razorpay");

// Called right after Razorpay Checkout closes with a success response.
// This only confirms authenticity so the browser can show a confirmation
// screen immediately — the webhook (api/webhook.js) is the durable record
// or the order and is what actually triggers the notification email, since
// it comes from Razorpay's servers rather than a browser that might close
// the tab before this request finishes.
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ verified: false });
    return;
  }

  const verified = verifyPaymentSignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  res.status(200).json({ verified });
};
