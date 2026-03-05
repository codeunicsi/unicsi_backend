// import crypto from "crypto";

// export function verifyShopifyWebhook(req, res, next) {
//   try {
//     const hmac = req.headers["x-shopify-hmac-sha256"];

//     const hash = crypto
//       .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
//       .update(JSON.stringify(req.body), "utf8")
//       .digest("base64");

//     if (hash !== hmac) {
//       return res.status(401).send("Webhook HMAC validation failed");
//     }

//     next();
//   } catch (error) {
//     console.error("Webhook verification error:", error);
//     res.status(500).send("Webhook verification error");
//   }
// }

import crypto from "crypto";

export function verifyShopifyWebhook(req, res, next) {
  try {
    const hmacHeader = req.headers["x-shopify-hmac-sha256"];

    const generatedHash = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
      .update(req.body) // RAW BODY BUFFER
      .digest("base64");

    if (generatedHash !== hmacHeader) {
      return res.status(401).send("Webhook HMAC validation failed");
    }

    next();
  } catch (error) {
    console.error("Webhook verification error:", error);
    res.status(500).send("Webhook verification error");
  }
}