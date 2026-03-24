import express from "express";
import authRoutes from "./authRoutes.js";
import productRoutes from "./productRoutes.js";
import adminRoutes from "./adminRoutes.js";
import marketplaceRoutes from "./marketplaceRoutes.js";
import orderRoutes from "./orderRoutes.js";
import supplierRoutes from "./supplierRoutes.js";
import dropshipperRoutes from "./dropshipperRoutes.js";
import categoryRoutes from "./categoryRoutes.js";
// import shopifyRoute from "./shopifyAuth.js"
const router = express.Router();

router.use("/auth", authRoutes);
// router.use("/products", productRoutes);
// router.use("/admin", adminRoutes);
router.use("/marketplace", marketplaceRoutes);
// router.use("/orders", orderRoutes);

router.use("/suppliers", supplierRoutes);
router.use("/admin", adminRoutes);
router.use("/categories", categoryRoutes);

//dropshipper
router.use("/dropshipper", dropshipperRoutes);

export default router;
