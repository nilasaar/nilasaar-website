const { verifyWebhookSignature } = require("./_lib/razorpay");

// Configured in Razorpay Dashboard -> Settings -> Webhooks, pointed at
// https://nilasaar.in/api/webhook with the "payment.captured" event enabled.
// This is the authoritative record of a paid order — it comes straight from
// Razorpay's servers, so it fires even if the customer closed the tab right
// after paying. It's what actually sends the order notification email.
async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end();
    return;
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers["x-razorpay-signature"];

  if (!signature || !verifyWebhookSignature({ rawBody, signature })) {
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  const event = JSON.parse(rawBody);

  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    await sendOrderEmail(payment);
  }

  res.status(200).json({ received: true });
}

handler.config = { api: { bodyParser: false } };
module.exports = handler;

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function sendOrderEmail(payment) {
  if (!process.env.RESEND_API_KEY) {
    console.log("RESEND_API_KEY not set — skipping order email. Check the Razorpay Dashboard for order details.");
    return;
  }

  const notes = payment.notes || {};
  const amountRupees = (payment.amount / 100).toFixed(2);

  const text = [
    `New paid order — ₹${amountRupees}`,
    ``,
    `Items: ${notes.items || "(not recorded)"}`,
    `Customer: ${notes.customer_name || "-"}`,
    `Phone: ${notes.customer_phone || "-"}`,
    `Email: ${notes.customer_email || "-"}`,
    `Address: ${notes.customer_address || "-"}`,
    ``,
    `Razorpay payment ID: ${payment.id}`,
    `Razorpay order ID: ${payment.order_id}`,
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.ORDER_EMAIL_FROM,
      to: process.env.ORDER_EMAIL_TO,
      subject: `Nilasaar order — ₹${amountRupees} from ${notes.customer_name || "a customer"}`,
      text,
    }),
  });

  if (!res.ok) {
    console.error("Failed to send order email:", await res.text());
  }
}
