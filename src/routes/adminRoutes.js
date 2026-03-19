import express from "express";
const router = express.Router();
import SuperAdminController from "../controllers/superAdminController.js";
import { auth, requireRole } from "../middlewares/auth.js";
import {
  validateWithJoi,
  bulkOrderConfigSchema,
  bulkOrderPaymentRejectSchema,
} from "../utils/constant.js";

router.get(
  "/config/bulk-order",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.getBulkOrderConfig,
);

router.put(
  "/config/bulk-order",
  auth,
  requireRole("ADMIN"),
  validateWithJoi(bulkOrderConfigSchema),
  SuperAdminController.upsertBulkOrderConfig,
);

router.get(
  "/products/get-pending-products",
  SuperAdminController.getPendingProducts,
);
router.get("/products/pending/stats", SuperAdminController.getPendingStats);
router.get("/products/get-live-products", SuperAdminController.getLiveProducts);
router.get("/products/live/stats", SuperAdminController.getLiveProductsStats);
router.get("/products/rejected/stats", SuperAdminController.getRejectedStats);
router.get("/products/rejected", SuperAdminController.getRejectedProducts);
router.get("/products/:product_id", SuperAdminController.getProductById);
router.delete("/products/:product_id", SuperAdminController.archiveLiveProduct);
router.delete(
  "/products/:product_id/rejected",
  SuperAdminController.deleteRejectedProduct,
);
router.post(
  "/products/:product_id/approve",
  SuperAdminController.approveProduct,
);
router.post("/products/:product_id/reject", SuperAdminController.rejectProduct);
router.put("/products/update-product", SuperAdminController.updateProduct);
router.put(
  "/products/:product_id/status",
  SuperAdminController.updateLiveProductStatus,
);
router.put(
  "/products/:product_id/modified/:variant_id",
  SuperAdminController.modifiedProducts,
);

// get all supplier
router.get("/get-all-suppliers", SuperAdminController.getAllSupplier);

// supplier kyc verification
router.get(
  "/get-all-kyc-verifications",
  SuperAdminController.supplierKycVerification,
);

// supplier verify
router.post("/supplier-verify", SuperAdminController.verifySupplier);

// supplier reject
router.post("/supplier/kyc/reject", SuperAdminController.rejectSupplierProof);

router.patch(
  "/bulk-orders/:order_id/verify-payment",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.verifyBulkOrderPayment,
);

router.patch(
  "/bulk-orders/:order_id/reject-payment",
  auth,
  requireRole("ADMIN"),
  validateWithJoi(bulkOrderPaymentRejectSchema),
  SuperAdminController.rejectBulkOrderPayment,
);

router.get(
  "/bulk-orders",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.getAllBulkOrders,
);

export default router;
