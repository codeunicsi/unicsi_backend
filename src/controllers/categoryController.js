import { Category, Product } from "../models/index.js";
import { Op } from "sequelize";

/**
 * GET /categories
 * Query: active (default true) — set active=false for admin to list all including inactive.
 * Returns: id, name, slug, parent_id, image_url, sort_order, is_featured, is_active.
 * Optionally productCount when requested.
 */
export const listCategories = async (req, res) => {
  try {
    const active = req.query.active !== "false";
    const withCount = req.query.withCount === "true";

    const where = {};
    if (active) where.is_active = true;

    const categories = await Category.findAll({
      where,
      order: [
        ["sort_order", "ASC"],
        ["name", "ASC"],
      ],
      attributes: [
        "id",
        "name",
        "slug",
        "parent_id",
        "image_url",
        "sort_order",
        "is_featured",
        "is_active",
      ],
    });

    if (withCount) {
      const counts = await Product.findAll({
        attributes: [
          "category_id",
          [Product.sequelize.fn("COUNT", Product.sequelize.col("product_id")), "count"],
        ],
        where: { category_id: { [Op.ne]: null } },
        group: ["category_id"],
        raw: true,
      });
      const countMap = Object.fromEntries(counts.map((c) => [c.category_id, parseInt(c.count, 10)]));
      const list = categories.map((c) => ({
        ...c.toJSON(),
        productCount: countMap[c.id] ?? 0,
      }));
      return res.json({ success: true, data: list });
    }

    res.json({ success: true, data: categories });
  } catch (e) {
    console.error("[categoryController.listCategories]", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * POST /admin/categories — Super Admin only
 * Body: name, slug (required); image_url, sort_order, is_featured, parent_id (optional)
 */
export const createCategory = async (req, res) => {
  try {
    const { name, slug, image_url, sort_order, is_featured, parent_id } = req.body;
    if (!name || !slug || !String(slug).trim()) {
      return res.status(400).json({ success: false, message: "name and slug are required" });
    }
    const slugNorm = String(slug).trim().toLowerCase();
    const existing = await Category.findOne({ where: { slug: slugNorm } });
    if (existing) {
      return res.status(400).json({ success: false, message: "slug already exists" });
    }
    const sortOrderNum = sort_order != null ? Number(sort_order) : 0;
    const category = await Category.create({
      name: String(name).trim(),
      slug: slugNorm,
      image_url: image_url || null,
      sort_order: typeof sortOrderNum === "number" && !Number.isNaN(sortOrderNum) ? Math.max(0, sortOrderNum) : 0,
      is_featured: Boolean(is_featured),
      parent_id: parent_id || null,
      is_active: true,
    });
    res.status(201).json({ success: true, data: category });
  } catch (e) {
    console.error("[categoryController.createCategory]", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * PUT /admin/categories/:id — Super Admin only
 */
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, image_url, sort_order, is_featured, is_active, parent_id } = req.body;
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    if (name !== undefined) category.name = String(name).trim();
    if (slug !== undefined) {
      const slugNorm = String(slug).trim().toLowerCase();
      const existing = await Category.findOne({ where: { slug: slugNorm } });
      if (existing && existing.id !== id) {
        return res.status(400).json({ success: false, message: "slug already exists" });
      }
      category.slug = slugNorm;
    }
    if (image_url !== undefined) category.image_url = image_url || null;
    if (sort_order !== undefined) {
      const n = Number(sort_order);
      category.sort_order = typeof n === "number" && !Number.isNaN(n) ? Math.max(0, n) : 0;
    }
    if (is_featured !== undefined) category.is_featured = Boolean(is_featured);
    if (is_active !== undefined) category.is_active = Boolean(is_active);
    if (parent_id !== undefined) category.parent_id = parent_id || null;
    await category.save();
    res.json({ success: true, data: category });
  } catch (e) {
    console.error("[categoryController.updateCategory]", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * DELETE /admin/categories/:id — Soft delete: set is_active = false
 */
export const deactivateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    category.is_active = false;
    await category.save();
    res.json({ success: true, data: category });
  } catch (e) {
    console.error("[categoryController.deactivateCategory]", e);
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * DELETE /admin/categories/:id/permanent — Hard delete: unlink products and children then destroy category
 */
/**
 * POST /admin/categories/upload-image — same disk storage as supplier product images (uploads/images)
 */
export const uploadCategoryImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file" });
    }
    const proto = req.get("x-forwarded-proto") || req.protocol;
    const host = req.get("host");
    const url = `${proto}://${host}/uploads/images/${req.file.filename}`;
    return res.json({ success: true, url });
  } catch (e) {
    console.error("[categoryController.uploadCategoryImage]", e);
    return res.status(500).json({ success: false, message: e.message });
  }
};

export const deleteCategoryPermanent = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }
    await Category.update({ parent_id: null }, { where: { parent_id: id } });
    await Product.update({ category_id: null }, { where: { category_id: id } });
    await category.destroy();
    res.json({ success: true, message: "Category deleted" });
  } catch (e) {
    console.error("[categoryController.deleteCategoryPermanent]", e);
    res.status(500).json({ success: false, message: e.message });
  }
};
