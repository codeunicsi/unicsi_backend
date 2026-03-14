import express from "express";
const router = express.Router();
import DropshipperController from "../controllers/dropshipperController.js";
import { auth } from "../middlewares/auth.js";
import { verifyShopifyWebhook } from "../middlewares/shopifyWebhookVerify.js";
import upload from "../middlewares/uploadMiddleware.js";
import {
  validate,
  profileUpdateRules,
  bankDetailsRules,
  gstDetailsRules,
} from "../utils/constant.js";

router.get("/profile/personalDetails", auth, DropshipperController.getProfile);
router.put(
  "/profile/personalDetails",
  auth,
  validate(profileUpdateRules),
  DropshipperController.updateProfile,
);

router.get(
  "/stores/bankAccountDetails",
  auth,
  DropshipperController.getBankDetails,
);
router.post(
  "/stores/bankAccountDetails",
  auth,
  upload.fields([{ name: "bankDetailProof", maxCount: 1 }]),
  validate(bankDetailsRules),
  DropshipperController.saveBankDetails,
);
router.put(
  "/stores/bankAccountDetails",
  auth,
  upload.fields([{ name: "bankDetailProof", maxCount: 1 }]),
  validate(bankDetailsRules),
  DropshipperController.saveBankDetails,
);

router.get("/stores/gstDetails", auth, DropshipperController.getGstDetails);
router.post(
  "/stores/gstDetails",
  auth,
  upload.fields([
    { name: "gstCertificate", maxCount: 1 },
    { name: "panCardNumberImage", maxCount: 1 },
  ]),
  validate(gstDetailsRules),
  DropshipperController.saveGstDetails,
);
router.put(
  "/stores/gstDetails",
  auth,
  upload.fields([
    { name: "gstCertificate", maxCount: 1 },
    { name: "panCardNumberImage", maxCount: 1 },
  ]),
  validate(gstDetailsRules),
  DropshipperController.saveGstDetails,
);

router.get("/shopify/connect", auth, DropshipperController.connectShopify);
router.get("/shopify/callback", auth, DropshipperController.callbackShopify);
router.post(
  "/shopify/push-product",
  auth,
  DropshipperController.pushProductToShopify,
);
router.get("/shopify/get-store", auth, DropshipperController.getShopifyStore);
router.get("/shopify/get-products", auth, DropshipperController.getProducts);

// shopify webhooks
router.post("/shopify/webhooks", verifyShopifyWebhook, async (req, res) => {
  const topic = req.headers["x-shopify-topic"];
  const shop = req.headers["x-shopify-shop-domain"];

  const payload = JSON.parse(req.body.toString());

  console.log("Webhook topic:", topic);
  console.log("Shop:", shop);

  if (topic === "customers/data_request") {
    console.log("Customer data request", payload);
  }

  if (topic === "customers/redact") {
    console.log("Customer redact request", payload);
  }

  if (topic === "shop/redact") {
    console.log("Shop redact request", payload);
  }

  res.status(200).send("OK");
});

export default router;
