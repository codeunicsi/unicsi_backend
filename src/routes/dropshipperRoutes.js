import express from "express";
const router = express.Router();
import DropshipperController from "../controllers/dropshipperController.js";
import { auth } from "../middlewares/auth.js";

router.get("/shopify/connect", DropshipperController.connectShopify);
router.get("/shopify/callback", DropshipperController.callbackShopify);
router.post("/shopify/push-product", DropshipperController.pushProductToShopify);
router.get("/shopify/get-store", DropshipperController.getShopifyStore);

export default router;