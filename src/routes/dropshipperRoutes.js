import express from "express";
const router = express.Router();
import DropshipperController from "../controllers/dropshipperController.js";
import { auth } from "../middlewares/auth.js";

router.get("/shopify/connect", auth, DropshipperController.connectShopify);
router.get("/shopify/callback", auth, DropshipperController.callbackShopify);
router.post("/shopify/push-product", auth, DropshipperController.pushProductToShopify);
router.get("/shopify/get-store", auth, DropshipperController.getShopifyStore);

export default router;