import express from "express";
const router = express.Router();
import SuperAdminController from "../controllers/superAdminController.js";
import logisticsRoutes from "./logisticsRoutes.js";
import { auth, requireRole } from "../middlewares/auth.js";
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

router.get("/products/get-pending-products", SuperAdminController.getPendingProducts);
router.get("/products/pending/stats", SuperAdminController.getPendingStats);
router.get("/products/get-live-products", SuperAdminController.getLiveProducts);
router.get("/products/live/stats", SuperAdminController.getLiveProductsStats);
router.get("/products/rejected/stats", SuperAdminController.getRejectedStats);
router.get("/products/rejected", SuperAdminController.getRejectedProducts);
router.get("/products/:product_id", SuperAdminController.getProductById);
router.delete("/products/:product_id", SuperAdminController.archiveLiveProduct);
router.delete("/products/:product_id/rejected", SuperAdminController.deleteRejectedProduct);
router.post("/products/:product_id/approve", SuperAdminController.approveProduct);
router.post("/products/:product_id/reject", SuperAdminController.rejectProduct);
router.put("/products/update-product", SuperAdminController.updateProduct);
router.put("/products/:product_id/status", SuperAdminController.updateLiveProductStatus);
router.put("/products/:product_id/modified/:variant_id", SuperAdminController.modifiedProducts);



// get all supplier
router.get("/get-all-suppliers", SuperAdminController.getAllSupplier);

// supplier kyc verification
router.get("/get-all-kyc-verifications", SuperAdminController.supplierKycVerification);

// supplier verify
router.post("/supplier-verify", SuperAdminController.verifySupplier);

// supplier reject
router.post("/supplier/kyc/reject", SuperAdminController.rejectSupplierProof);

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
