import crypto from "crypto"

export const verifyShopifyWebhook = (req, res, next) => {
  try {
    const hmac = req.headers["x-shopify-hmac-sha256"]

    const hash = crypto
      .createHmac("sha256", process.env.SHOPIFY_API_SECRET)
      .update(req.body)
      .digest("base64")

    if (hash !== hmac) {
      return res.status(401).send("Webhook verification failed")
    }

    next()
  } catch (error) {
    console.error("Webhook verification error:", error)
    res.status(500).send("Error verifying webhook")
  }
}