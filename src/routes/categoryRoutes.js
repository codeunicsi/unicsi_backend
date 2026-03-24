import express from "express";
import { listCategories } from "../controllers/categoryController.js";

const router = express.Router();

// Public: list categories (default active only; ?active=false for admin view, ?withCount=true for product counts)
router.get("/", listCategories);

export default router;
