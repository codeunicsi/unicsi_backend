import express from "express";
const router = express.Router();
import DropshipperController from "../controllers/dropshipperController.js";
import { auth } from "../middlewares/auth.js";

router.get("/shopify/connect", DropshipperController.connectShopify);
router.get("/shopify/callback", DropshipperController.callbackShopify);

export default router;