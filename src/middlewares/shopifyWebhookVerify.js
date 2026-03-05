import crypto from "crypto";

function verifyShopifyWebhook(req, res, next) {
  try {

    const hmac = req.headers["x-shopify-hmac-sha256"];

    const generatedHash = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
      .update(req.body) // RAW BODY
      .digest("base64");

    if (generatedHash !== hmac) {
      console.log("Webhook HMAC validation failed");
      return res.status(401).send("Invalid webhook");
    }

    req.body = JSON.parse(req.body.toString());

    next();

  } catch (error) {
    console.error("Webhook verification error:", error);
    res.status(500).send("Webhook error");
  }
}

export default verifyShopifyWebhook;