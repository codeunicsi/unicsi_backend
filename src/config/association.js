import {
  Supplier,
  Product,
  ProductVariant,
  ProductImage,
  Warehouse,
  Inventory,
  SupplierPricing,
  Reseller,
  Order,
  supplier_gst_details,
  supplier_bank_details,
  SupplierKyc,
  CourierPartner,
  CourierServiceability,
  CourierRateCard,
  AwbPool,
  Category,
  reseller_bank_details,
  reseller_gst_details
} from "../models/index.js";

import User from "../models/User.js";

/* =========================
   SUPPLIER RELATIONS
========================= */

// Supplier → Product
Supplier.hasMany(Product, {
  foreignKey: "supplier_id",
  as: "products",
});
Product.belongsTo(Supplier, {
  foreignKey: "supplier_id",
  as: "supplier",
});

// Supplier → Warehouse
Supplier.hasMany(Warehouse, {
  foreignKey: "supplier_id",
  as: "warehouses",
});
Warehouse.belongsTo(Supplier, {
  foreignKey: "supplier_id",
  as: "supplier",
});

// Supplier → GST
Supplier.hasOne(supplier_gst_details, {
  foreignKey: "supplier_id",
  as: "gst_details",
});
supplier_gst_details.belongsTo(Supplier, {
  foreignKey: "supplier_id",
});

// Supplier → Bank
Supplier.hasOne(supplier_bank_details, {
  foreignKey: "supplier_id",
  as: "bank_details",
});
supplier_bank_details.belongsTo(Supplier, {
  foreignKey: "supplier_id",
});

// Supplier → KYC
Supplier.hasOne(SupplierKyc, {
  foreignKey: "supplier_id",
  as: "kyc_details",
});
SupplierKyc.belongsTo(Supplier, {
  foreignKey: "supplier_id",
});


/* =========================
   PRODUCT RELATIONS
========================= */

// Product → Category
Product.belongsTo(Category, {
  foreignKey: "category_id",
  as: "category",
  targetKey: "id",
  constraints: false,
});
Category.hasMany(Product, {
  foreignKey: "category_id",
  as: "products",
  constraints: false,
});

// Category self relation
Category.belongsTo(Category, {
  as: "parent",
  foreignKey: "parent_id",
});
Category.hasMany(Category, {
  as: "children",
  foreignKey: "parent_id",
});

// Product → Variants
Product.hasMany(ProductVariant, {
  foreignKey: "product_id",
  as: "variants",
});
ProductVariant.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});

// Product → Images
Product.hasMany(ProductImage, {
  foreignKey: "product_id",
  as: "images",
});
ProductImage.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
});


/* =========================
   VARIANT RELATIONS
========================= */

// Variant → Inventory
ProductVariant.hasMany(Inventory, {
  foreignKey: "variant_id",
  as: "inventory",
});
Inventory.belongsTo(ProductVariant, {
  foreignKey: "variant_id",
  as: "variant",
});

// Variant → Pricing
ProductVariant.hasOne(SupplierPricing, {
  foreignKey: "variant_id",
  as: "pricing",
});
SupplierPricing.belongsTo(ProductVariant, {
  foreignKey: "variant_id",
  as: "variant",
});


/* =========================
   USER & RESELLER
========================= */

// User ↔ Reseller
User.hasMany(Reseller, {
  foreignKey: "user_id",
  as: "resellers",
});
Reseller.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// Reseller → Orders
Reseller.hasMany(Order, {
  foreignKey: "reseller_id",
  as: "orders",
});
Order.belongsTo(Reseller, {
  foreignKey: "reseller_id",
  as: "reseller",
});

// User → Reseller Bank
User.hasOne(reseller_bank_details, {
  foreignKey: "user_id",
  as: "bank_details",
});
reseller_bank_details.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// User → Reseller GST
User.hasOne(reseller_gst_details, {
  foreignKey: "user_id",
  as: "gst_details",
});
reseller_gst_details.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});


/* =========================
   COURIER SYSTEM
========================= */

// Courier → Serviceability
CourierPartner.hasMany(CourierServiceability, {
  foreignKey: "courier_id",
  as: "serviceability",
});
CourierServiceability.belongsTo(CourierPartner, {
  foreignKey: "courier_id",
  as: "courier",
});

// Courier → Rate Cards
CourierPartner.hasMany(CourierRateCard, {
  foreignKey: "courier_id",
  as: "rate_cards",
});
CourierRateCard.belongsTo(CourierPartner, {
  foreignKey: "courier_id",
  as: "courier",
});

// Courier → AWB Pool
CourierPartner.hasMany(AwbPool, {
  foreignKey: "courier_id",
  as: "awb_pool",
});
AwbPool.belongsTo(CourierPartner, {
  foreignKey: "courier_id",
  as: "courier",
});