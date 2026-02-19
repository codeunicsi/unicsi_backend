import express from "express";
const router = express.Router();
import SuperAdminController from "../controllers/superAdminController.js";

router.get("/products/get-pending-products", SuperAdminController.getPendingProducts);
router.get("/products/get-live-products", SuperAdminController.getLiveProducts);
router.get('/products/:product_id', SuperAdminController.getProductById);
router.post("/products/:product_id/approve", SuperAdminController.approveProduct);
router.post("/products/:product_id/reject", SuperAdminController.rejectProduct);
router.put("/products/:product_id/modified/:variant_id", SuperAdminController.modifiedProducts);


// get all supplier
router.get("/get-all-suppliers", SuperAdminController.getAllSupplier);

// supplier kyc verification
router.get("/get-all-kyc-verifications", SuperAdminController.supplierKycVerification);

// supplier verify
router.post("/supplier-verify", SuperAdminController.verifySupplier);

// supplier reject
router.post("/supplier/kyc/reject", SuperAdminController.rejectSupplierProof);

export default router;
