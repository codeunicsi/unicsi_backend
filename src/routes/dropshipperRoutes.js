import express from "express";
const router = express.Router();
import DropshipperController from "../controllers/dropshipperController.js";
import { auth } from "../middlewares/auth.js";
import { verifyShopifyWebhook } from "../middlewares/shopifyWebhookVerify.js";

router.get("/shopify/connect", auth, DropshipperController.connectShopify);
router.get("/shopify/callback", auth, DropshipperController.callbackShopify);
router.post("/shopify/push-product", auth, DropshipperController.pushProductToShopify);
router.get("/shopify/get-store", auth, DropshipperController.getShopifyStore);
router.get("/shopify/get-products", auth, DropshipperController.getProducts);

// shopify webhooks
router.post(
  "/shopify/webhooks",
  express.raw({ type: "application/json" }),
  verifyShopifyWebhook,
  async (req, res) => {
    const topic = req.headers["x-shopify-topic"]
    const shop = req.headers["x-shopify-shop-domain"]

    const payload = JSON.parse(req.body.toString())

    console.log("Webhook topic:", topic)
    console.log("Shop:", shop)

    if (topic === "customers/data_request") {
      console.log("Customer data request", payload)
    }

    if (topic === "customers/redact") {
      console.log("Customer redact request", payload)
    }

    if (topic === "shop/redact") {
      console.log("Shop redact request", payload)
    }

    res.status(200).send("OK")
  }
)

export default router;