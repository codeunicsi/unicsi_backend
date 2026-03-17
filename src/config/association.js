import { Supplier, Product, ProductVariant, ProductImage, Warehouse, Inventory, SupplierPricing, Reseller, Order, NdrCase, supplier_gst_details, supplier_bank_details, SupplierKyc, CourierPartner, CourierServiceability, CourierRateCard, AwbPool } from "../models/index.js";
import User from "../models/User.js";

/* ===========================
    ASSOCIATIONS (MUST BE HERE)
    =========================== */

// Supplier core
// Supplier.hasOne(SupplierAuth, { foreignKey: "supplier_id" });
// Supplier.hasOne(SupplierKyc, { foreignKey: "supplier_id" });
// Supplier.hasMany(SupplierAddress, { foreignKey: "supplier_id" });
// Supplier.hasMany(SupplierToken, { foreignKey: "supplier_id" });

// SupplierAuth.belongsTo(Supplier);
// SupplierKyc.belongsTo(Supplier);
// SupplierAddress.belongsTo(Supplier);
// SupplierToken.belongsTo(Supplier);

// Supplier → Product
Supplier.hasMany(Product, { foreignKey: "supplier_id" },
    { as: "products" }
);
Product.belongsTo(Supplier, {
    foreignKey: "supplier_id",
    as: "supplier",
});

// Product → Variant
Product.hasMany(ProductVariant, {
    foreignKey: "product_id",
    as: "variants",
});
ProductVariant.belongsTo(Product, {
    foreignKey: "product_id",
    as: "product",
});

// Variant → Images
Product.hasMany(ProductImage, {
    foreignKey: "product_id",
    as: "images",
});
ProductImage.belongsTo(Product, {
    foreignKey: "product_id",
    as: "product",
});

// Supplier → Warehouse
Supplier.hasMany(Warehouse, { foreignKey: "supplier_id" });
Warehouse.belongsTo(Supplier, { foreignKey: "supplier_id" });

// Variant → Inventory
ProductVariant.hasMany(Inventory, {
    foreignKey: "variant_id",
    as: "inventory",
});
Inventory.belongsTo(ProductVariant, {
    foreignKey: "variant_id",
});

// Variant → Pricing
ProductVariant.hasOne(SupplierPricing, {
    foreignKey: "variant_id",
    as: "pricing",
});
SupplierPricing.belongsTo(ProductVariant, {
    foreignKey: "variant_id",
});


Reseller.hasMany(Order, { foreignKey: "reseller_id" });
Order.belongsTo(Reseller);

Reseller.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(Reseller, { foreignKey: "user_id" });

Supplier.hasOne(supplier_gst_details, { foreignKey: "supplier_id",
    as: "gst_details",
 });
Supplier.hasOne(supplier_bank_details, { foreignKey: "supplier_id", as: "bank_details" });
supplier_bank_details.belongsTo(Supplier, { foreignKey: "supplier_id" });

 Supplier.hasOne(SupplierKyc, {
  foreignKey: "supplier_id",
  as: "kyc_details",
})

supplier_gst_details.belongsTo(Supplier);
SupplierKyc.belongsTo(Supplier);

// User.hasOne(Supplier, { foreignKey: "user_id" });
// Supplier.belongsTo(User, { foreignKey: "user_id" });

CourierPartner.hasMany(CourierServiceability, { foreignKey: "courier_id", as: "serviceability" });
CourierServiceability.belongsTo(CourierPartner, { foreignKey: "courier_id", as: "courier" });

CourierPartner.hasMany(CourierRateCard, { foreignKey: "courier_id", as: "rate_cards" });
CourierRateCard.belongsTo(CourierPartner, { foreignKey: "courier_id", as: "courier" });

CourierPartner.hasMany(AwbPool, { foreignKey: "courier_id", as: "awb_pool" });
AwbPool.belongsTo(CourierPartner, { foreignKey: "courier_id", as: "courier" });




