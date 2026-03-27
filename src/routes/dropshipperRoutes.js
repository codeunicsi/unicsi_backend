import express from "express";
const router = express.Router();
import DropshipperController from "../controllers/dropshipperController.js";
import { auth, requireRole } from "../middlewares/auth.js";
import { verifyShopifyWebhook } from "../middlewares/shopifyWebhookVerify.js";
import upload from "../middlewares/uploadMiddleware.js";
import {
  validate,
  profileUpdateRules,
  bankDetailsRules,
  gstDetailsRules,
  validateWithJoi,
  bulkOrderSchema,
  dropshipperSourceRequestSchema,
} from "../utils/constant.js";

router.get(
  "/profile/personalDetails",
  auth,
  requireRole("RESELLER"),
  DropshipperController.getProfile,
);
router.put(
  "/profile/personalDetails",
  auth,
  requireRole("RESELLER"),
  validate(profileUpdateRules),
  DropshipperController.updateProfile,
);

router.get(
  "/stores/bankAccountDetails",
  auth,
  requireRole("RESELLER"),
  DropshipperController.getBankDetails,
);
router.post(
  "/stores/bankAccountDetails",
  auth,
  requireRole("RESELLER"),
  upload.fields([{ name: "bankDetailProof", maxCount: 1 }]),
  validate(bankDetailsRules),
  DropshipperController.saveBankDetails,
);
router.put(
  "/stores/bankAccountDetails",
  auth,
  requireRole("RESELLER"),
  upload.fields([{ name: "bankDetailProof", maxCount: 1 }]),
  validate(bankDetailsRules),
  DropshipperController.saveBankDetails,
);

router.get(
  "/stores/gstDetails",
  auth,
  requireRole("RESELLER"),
  DropshipperController.getGstDetails,
);
router.post(
  "/stores/gstDetails",
  auth,
  requireRole("RESELLER"),
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
  requireRole("RESELLER"),
  upload.fields([
    { name: "gstCertificate", maxCount: 1 },
    { name: "panCardNumberImage", maxCount: 1 },
  ]),
  validate(gstDetailsRules),
  DropshipperController.saveGstDetails,
);

router.get(
  "/shopify/connect",
  auth,
  requireRole("RESELLER"),
  DropshipperController.connectShopify,
);
router.get(
  "/shopify/callback",
  auth,
  requireRole("RESELLER"),
  DropshipperController.callbackShopify,
);
router.post(
  "/shopify/push-product",
  auth,
  requireRole("RESELLER"),
  DropshipperController.pushProductToShopify,
);
router.get(
  "/shopify/get-store",
  auth,
  requireRole("RESELLER"),
  DropshipperController.getShopifyStore,
);
router.get(
  "/shopify/get-products",
  auth,
  requireRole("RESELLER"),
  DropshipperController.getProducts,
);

router.post(
  "/bulk/orders",
  auth,
  upload.fields([{ name: "paymentScreenshot", maxCount: 1 }]),
  validateWithJoi(bulkOrderSchema),
  DropshipperController.createBulkOrder,
);

router.get(
  "/bulk/orders/bank-details/:productId",
  auth,
  DropshipperController.getBulkOrderBankDetails,
);

router.get(
  "/admin/bank-details",
  auth,
  requireRole("RESELLER"),
  DropshipperController.getAdminBankDetails,
);

router.post(
  "/source-requests",
  auth,
  requireRole("RESELLER"),
  upload.fields([{ name: "productImage", maxCount: 1 }]),
  validateWithJoi(dropshipperSourceRequestSchema),
  DropshipperController.submitSourceRequest,
);

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

router.get("/products",
  auth,
  requireRole("RESELLER"),
  DropshipperController.getAllDropshipperProducts
);

// Get products by category ID
router.get(
  "/products/category/:categoryId",
  auth,
  requireRole("RESELLER"),
  DropshipperController.getProductsByCategoryId
);

router.get("/products/:product_id",
  auth,
  requireRole("RESELLER"),
  DropshipperController.getDropshipperProductById
);

export default router;
