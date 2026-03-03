import express from "express";
const router = express.Router();
import upload from "../middlewares/uploadMiddleware.js";
import { auth } from "../middlewares/auth.js";

import supplierController from "../controllers/supplierController.js";

router.post("/send-otp", supplierController.supplier_send_otp);
router.post("/verify-otp", supplierController.supplier_verify_otp);
router.post("/register", supplierController.supplier_register);
router.post("/login", supplierController.supplier_login);
router.post("/logout", supplierController.supplier_logout);

// profile
router.get("/profile/personalDetails", auth, supplierController.supplier_profile);
router.put("/profile/personalDetails", auth, supplierController.supplier_personal_details);

//bank account
router.get("/stores/bankAccountDetails", auth, supplierController.get_bank_account_details);
router.post("/stores/bankAccountDetails", auth, supplierController.supplier_bank_account_details);
router.put("/stores/bankAccountDetails", auth, supplierController.update_bank_account_details);

//gst details
router.post("/stores/gstDetails",   upload.fields([
    { name: "gstCertificate", maxCount: 1 },
    { name: "panCardNumberImage", maxCount: 1 },
    { name: "adharCardNumberImage", maxCount: 1 },
  ]) , auth, supplierController.add_gst_details);
router.get("/stores/gstDetails", auth, supplierController.get_gst_details);


// supplier
router.get("/getAllSupplier", auth, supplierController.getAllSupplier);

//products
router.post("/stores/products", auth, upload.array("images", 10), supplierController.add_products);
router.get("/stores/products", auth, supplierController.get_products);
router.get("/stores/products/:product_id", auth, supplierController.get_single_product);
router.put("/stores/products/:product_id", auth, upload.array("images", 10), supplierController.update_product);

router.delete("/stores/products/:product_id", auth, supplierController.delete_product);
router.post("/stores/products/:product_id/variants", auth, upload.array("images", 10), supplierController.add_product_variants);
router.post("/stores/variants/:variant_id/images", upload.array("images", 10), auth, supplierController.add_product_images);

//warehouse
router.post("/stores/warehouses", auth, supplierController.create_warehouse);
router.put("/stores/warehouses/:warehouse_id", auth, supplierController.update_warehouse);
router.get("/stores/warehouses/:warehouse_id", supplierController.get_warehouse);
router.delete("/stores/warehouses/:warehouse_id", supplierController.delete_warehouse);

// inventory
router.post("/stores/inventory", auth, supplierController.create_inventory);
router.get("/stores/inventory/sku/:sku", auth, supplierController.get_inventory);
router.get("/stores/inventory", auth, supplierController.get_inventory_by_filter); //in-stock, out-of-stock, all,
router.put("/stores/inventory/:sku", auth, supplierController.update_inventory_stock);
router.delete("/stores/inventory/:sku", auth, supplierController.delete_inventory);

// router.post("/stores/uploadProducts", supplierController.supplier_products);




export default router;


// import express from "express";
// const router = express.Router();
// // import { auth, requireRole } from "../middlewares/auth";
// import supplierController from "../controllers/supplierController";
// // import supplierFnc from "../utils/supplierFnc";

// router.post("/send-otp", supplierController.supplier_send_otp);
// router.post("/verify-otp", supplierController.supplier_verify_otp);
// router.post("/signup", supplierController.supplier_signup);
// router.post("/login", supplierController.supplier_login);
// // router.get("/profile", auth, requireRole("supplier"), supplierController.supplier_profile);
// // router.put("/profile", auth, requireRole("supplier"), supplierController.supplier_update_profile);
// // router.put("/password", auth, requireRole("supplier"), supplierController.supplier_update_password);

// export default router;  
