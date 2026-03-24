import { Op } from "sequelize";
import { Product, ProductImage, ProductVariant } from "../models/index.js";
import Category from "../models/Category.js";
import SellerListing from "../models/SellerListing.js";

// Public marketplace (approved products)
export const listMarketplaceProducts = async (req, res) => {
  const { q, categoryId, page = 1, limit = 20 } = req.query;
  const where = { approval_status: "approved" };
  if (q) where.title = { [Op.iLike]: `%${q}%` };
  if (categoryId) {
    const category = await Category.findOne({
      where: { id: categoryId, is_active: true },
    });
    if (!category) {
      return res.json({ success: true, rows: [], count: 0 });
    }
    where.category_id = categoryId;
  }

  const data = await Product.findAndCountAll({
    where,
    include: [
      { model: ProductImage, as: "images" },
      { model: Category, as: "category" },
      { model: ProductVariant, as: "variants", attributes: ["variant_id", "variant_price"] },
    ],
    limit: +limit,
    offset: (+page - 1) * +limit,
    order: [["createdAt", "DESC"]],
  });
  res.json({ success: true, ...data });
};

// Seller creates a listing with a chosen sellingPrice
export const createListing = async (req, res) => {
  const sellerId = req.user.id;
  const { productId, sellingPrice } = req.body;

  const product = await Product.findByPk(productId);
  if (!product || product.status !== "approved") {
    return res.status(400).json({ message: "Product not available" });
  }
  // optional guard rails against admin min/max
  if (product.minPrice && +sellingPrice < +product.minPrice)
    return res.status(400).json({ message: "Below min price" });
  if (product.maxPrice && +sellingPrice > +product.maxPrice)
    return res.status(400).json({ message: "Above max price" });

  const listing = await SellerListing.create({
    sellerId,
    productId,
    sellingPrice,
  });
  res.status(201).json({ success: true, data: listing });
};

export const myListings = async (req, res) => {
  const sellerId = req.user.id;
  const listings = await SellerListing.findAll({
    where: { sellerId },
    include: [
      { model: Product, include: [{ model: ProductImage, as: "images" }] },
    ],
  });
  res.json({ success: true, data: listings });
};

export const updateListing = async (req, res) => {
  const sellerId = req.user.id;
  const { id } = req.params;
  const { sellingPrice, isActive } = req.body;

  const listing = await SellerListing.findOne({
    where: { id, sellerId },
    include: [{ model: Product }],
  });
  if (!listing) return res.status(404).json({ message: "Not found" });

  if (sellingPrice !== undefined) {
    const p = listing.Product;
    if (p.minPrice && +sellingPrice < +p.minPrice)
      return res.status(400).json({ message: "Below min price" });
    if (p.maxPrice && +sellingPrice > +p.maxPrice)
      return res.status(400).json({ message: "Above max price" });
    listing.sellingPrice = sellingPrice;
  }
  if (isActive !== undefined) listing.isActive = !!isActive;

  await listing.save();
  res.json({ success: true, data: listing });
};
