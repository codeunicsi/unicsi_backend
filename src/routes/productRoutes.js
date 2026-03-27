import express from "express";
import multer from "multer";
import { auth, requireRole } from "../middlewares/auth.js";
import upload from "../middlewares/uploadMiddleware.js";
import {
  createProduct,
  myProducts,
  updateProduct,
  updateStock,
  vendorSetStatus,
  bulkUpload,
  bulkUploadZip,
  cloneProduct,
} from "../controllers/productController.js";

// const upload = multer({ dest: "uploads/" });
const router = express.Router();

// ✅ Create single product (images/videos optional)
router.post(
  "/",
  auth,
  requireRole("vendor"),
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "videos", maxCount: 5 },
  ]),
  createProduct,
);

router.post("/", auth, requireRole("vendor"), createProduct);
router.get("/mine", auth, requireRole("vendor"), myProducts);
// ✅ Update single product
router.put("/:id", auth, requireRole("vendor"), updateProduct);
router.put("/:id/stock", auth, requireRole("vendor"), updateStock);
router.put("/:id/status", auth, requireRole("vendor"), vendorSetStatus);
router.post(
  "/bulk",
  auth,
  requireRole("vendor"),
  upload.single("file"),
  bulkUpload,
);
router.post(
  "/bulk-zip",
  auth,
  requireRole("vendor"),
  upload.single("file"),
  bulkUploadZip,
);

// ✅ Clone product (supplier only)
router.post("/:id/clone", auth, requireRole("vendor"), cloneProduct);

export default router;
