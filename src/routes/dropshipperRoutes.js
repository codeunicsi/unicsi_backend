import express from "express";
const router = express.Router();
import DropshipperController from "../controllers/dropshipperController.js";
import { auth } from "../middlewares/auth.js";

router.get("/shopify/connect", auth, DropshipperController.connectShopify);
router.get("/shopify/callback", auth, DropshipperController.callbackShopify);
router.post("/shopify/push-product", auth, DropshipperController.pushProductToShopify);
router.get("/shopify/get-store", auth, DropshipperController.getShopifyStore);
router.get("/shopify/get-products", auth, DropshipperController.getProducts);

// shopify webhooks
router.post("/shopify/webhooks/customers/data_request", DropshipperController.webhookCustomersDataRequest);
router.post("/shopify/webhooks/customers/redact", DropshipperController.webhookCustomersRedact);
router.post("/shopify/webhooks/shop/redact", DropshipperController.webhookShopRedact);

export default router;