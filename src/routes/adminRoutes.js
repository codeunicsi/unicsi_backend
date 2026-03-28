import express from "express";
const router = express.Router();
import SuperAdminController from "../controllers/superAdminController.js";
import { auth, requireRole } from "../middlewares/auth.js";
import {
  validateWithJoi,
  bulkOrderConfigSchema,
  bulkOrderPaymentRejectSchema,
  adminBankDetailsCreateSchema,
  adminBankDetailsPatchSchema,
} from "../utils/constant.js";
import logisticsRoutes from "./logisticsRoutes.js";
import upload from "../middlewares/uploadMiddleware.js";
import {
  createCategory,
  updateCategory,
  deactivateCategory,
  deleteCategoryPermanent,
  uploadCategoryImage,
} from "../controllers/categoryController.js";

/** Multer wrapper so invalid file types return 400 JSON instead of 500 */
const uploadSingleCategoryImage = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || "Invalid file" });
    }
    next();
  });
};

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
  auth,
  requireRole("ADMIN"),
  SuperAdminController.getPendingProducts,
);
router.get(
  "/products/pending/stats",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.getPendingStats,
);
router.get(
  "/products/get-live-products",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.getLiveProducts,
);
router.get(
  "/products/live/stats",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.getLiveProductsStats,
);
router.get(
  "/products/rejected/stats",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.getRejectedStats,
);
router.get(
  "/products/rejected",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.getRejectedProducts,
);
router.get(
  "/products/:product_id",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.getProductById,
);
router.delete(
  "/products/:product_id",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.archiveLiveProduct,
);
router.delete(
  "/products/:product_id/rejected",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.deleteRejectedProduct,
);
router.post(
  "/products/:product_id/approve",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.approveProduct,
);
router.post(
  "/products/:product_id/reject",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.rejectProduct,
);
router.put(
  "/products/update-product",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.updateProduct,
);
router.put(
  "/products/:product_id/status",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.updateLiveProductStatus,
);
router.put(
  "/products/:product_id/modified/:variant_id",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.modifiedProducts,
);


// get all supplier
router.get(
  "/get-all-suppliers",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.getAllSupplier,
);

// supplier kyc verification
router.get(
  "/get-all-kyc-verifications",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.supplierKycVerification,
);

// supplier verify
router.post(
  "/supplier-verify",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.verifySupplier,
);

// supplier reject
router.post(
  "/supplier/kyc/reject",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.rejectSupplierProof,
);

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

router.post(
  "/bank-details",
  auth,
  requireRole("ADMIN"),
  validateWithJoi(adminBankDetailsCreateSchema),
  SuperAdminController.createAdminBankDetails,
);

router.patch(
  "/bank-details",
  auth,
  requireRole("ADMIN"),
  validateWithJoi(adminBankDetailsPatchSchema),
  SuperAdminController.updateAdminBankDetails,
);
// payouts - supplier
router.get("/payouts/suppliers/stats", SuperAdminController.getSupplierPayoutStats);
router.get("/payouts/suppliers", SuperAdminController.getSupplierPayoutList);

// payouts - partner (reseller)
router.get("/payouts/partners/stats", SuperAdminController.getPartnerPayoutStats);
router.get("/payouts/partners", SuperAdminController.getPartnerPayoutList);

// payouts - settlement reports
router.get("/payouts/settlements/stats", SuperAdminController.getSettlementStats);
router.get("/payouts/settlements", SuperAdminController.getSettlementList);

// payouts - transaction history
router.get("/payouts/transactions/stats", SuperAdminController.getTransactionStats);
router.get("/payouts/transactions", SuperAdminController.getTransactionList);

// payouts - wallet management
router.get("/payouts/wallet/stats", SuperAdminController.getWalletStats);
router.get("/payouts/wallet", SuperAdminController.getWalletList);

// Platform receiving account (UPI / bank + QR) — same row suppliers read via GET /suppliers/platform-payment-details
router.get(
  "/platform-collection-account",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.getPlatformCollectionAccount,
);
router.put(
  "/platform-collection-account",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.updatePlatformCollectionAccount,
);
router.delete(
  "/platform-collection-account",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.deletePlatformCollectionAccount,
);
router.post(
  "/platform-collection-account/qr",
  auth,
  requireRole("ADMIN"),
  upload.single("qrCode"),
  SuperAdminController.uploadPlatformCollectionQr,
);
router.delete(
  "/platform-collection-account/qr",
  auth,
  requireRole("ADMIN"),
  SuperAdminController.deletePlatformCollectionQr,
);

router.use("/logistics", logisticsRoutes);

// Categories (Super Admin only) — static paths before :id
router.post(
  "/categories/upload-image",
  auth,
  requireRole("ADMIN"),
  uploadSingleCategoryImage,
  uploadCategoryImage
);
router.post("/categories", auth, requireRole("ADMIN"), createCategory);
router.put("/categories/:id", auth, requireRole("ADMIN"), updateCategory);
router.delete("/categories/:id/permanent", auth, requireRole("ADMIN"), deleteCategoryPermanent);
router.delete("/categories/:id", auth, requireRole("ADMIN"), deactivateCategory);

export default router;
