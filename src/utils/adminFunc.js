import { Op } from "sequelize";
import {
  Supplier,
  ProductImage,
  Product,
  ProductVariant,
  Warehouse,
  Inventory,
  ProductReviewLog,
  supplier_gst_details,
  SupplierKyc,
  admin_bank_details,
} from "../models/index.js";

export const getPendingStats = async () => {
  try {
    const [awaiting_review, rejected, approved] = await Promise.all([
      Product.count({ where: { approval_status: "submitted" } }),
      Product.count({ where: { approval_status: "rejected" } }),
      Product.count({ where: { approval_status: "approved" } }),
    ]);
    return {
      success: true,
      data: {
        total: awaiting_review + rejected + approved,
        awaiting_review,
        needs_revision: rejected,
        approved,
        avg_review_time: 2.3,
      },
    };
  } catch (error) {
    console.error("Error fetching pending stats:", error);
    return { success: false, message: error.message };
  }
};

export const getPendingProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { approval_status: "submitted" },
      include: [
        {
          model: ProductVariant,
          as: "variants",
        },
        {
          model: ProductImage,
          as: "images",
        },
      ],
    });

    const plain = products.map((p) => p.get({ plain: true }));
    return {
      success: true,
      message: "Pending products fetched successfully",
      count: plain.length,
      data: plain,
    };
  } catch (error) {
    console.error("Error fetching pending products:", error);
    return {
      success: false,
      message: error.message,
    };
  }
};

export const getProductById = async (req) => {
  const productId = req.params.product_id;
  try {
    const product = await Product.findOne({
      where: {
        product_id: productId,
      },
      include: [
        {
          model: ProductVariant,
          as: "variants",
        },
        {
          model: ProductImage,
          as: "images",
        },
      ],
    });
    return { success: true, data: product };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const approveProduct = async (req) => {
  try {
    const { product_id } = req.params;

    const product = await Product.findByPk(product_id);

    if (!product) {
      return {
        success: false,
        message: "Product not found",
      };
    }

    await product.update({
      approval_status: "approved",
      lifecycle_status: "active", // optional: publish to marketplace
    });

    return {
      success: true,
      data: product,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

export const rejectProduct = async (req) => {
  try {
    const { product_id } = req.params;
    const { rejection_reason } = req.body || {};

    const product = await Product.findByPk(product_id);
    if (!product) {
      return {
        success: false,
        message: "Product not found",
      };
    }
    await product.update({
      approval_status: "rejected",
      lifecycle_status: "inactive",
      rejection_reason: rejection_reason || null,
      rejected_at: new Date(),
    });
    return { success: true, data: product };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateProduct = async (req) => {
  try {
    const { product_id, title, description, brand, variants } = req.body;

    if (!product_id) {
      return { success: false, error: "Product ID is required" };
    }

    const product = await Product.findByPk(product_id);
    if (!product) {
      return { success: false, error: "Product not found" };
    }

    const productUpdates = {};
    if (title !== undefined) productUpdates.title = title;
    if (description !== undefined) productUpdates.description = description;
    if (brand !== undefined) productUpdates.brand = brand;
    if (Object.keys(productUpdates).length > 0) {
      await product.update(productUpdates);
    }

    if (Array.isArray(variants) && variants.length > 0) {
      for (const v of variants) {
        if (!v.variant_id) continue;
        const allowed = {
          sku: v.sku,
          variant_name: v.variant_name,
          variant_price: v.variant_price,
          variant_stock: v.variant_stock,
          weight_grams: v.weight_grams,
          dimensions_cm: v.dimensions_cm,
          hsn_code: v.hsn_code,
          is_active: v.is_active,
        };
        const clean = Object.fromEntries(
          Object.entries(allowed).filter(([, val]) => val !== undefined),
        );
        if (Object.keys(clean).length > 0) {
          await ProductVariant.update(clean, {
            where: { variant_id: v.variant_id },
          });
        }
      }
    }

    const updated = await Product.findByPk(product_id, {
      include: [
        { model: ProductVariant, as: "variants" },
        { model: ProductImage, as: "images" },
      ],
    });
    return { success: true, data: updated };
  } catch (error) {
    console.error("[v0] Admin update product error:", error);
    return {
      success: false,
      error: error.message || "Failed to update product",
    };
  }
};

export const modifiedProducts = async (req) => {
  try {
    const { product_id, variant_id } = req.params;
    const { variant_price, dimensions_cm, weight_grams } = req.body;
    const variant = await ProductVariant.findByPk(variant_id);
    const product = await Product.findByPk(product_id);
    if (!product || !variant) {
      return {
        success: false,
        message: "Product not found",
      };
    }
    // Send back to review (no "modified" in approval_status enum)
    await product.update({
      approval_status: "submitted",
      lifecycle_status: "inactive",
    });
    const updates = {};
    if (variant_price !== undefined) updates.variant_price = variant_price;
    if (dimensions_cm !== undefined) updates.dimensions_cm = dimensions_cm;
    if (weight_grams !== undefined) updates.weight_grams = weight_grams;
    if (Object.keys(updates).length > 0) {
      await variant.update(updates);
    }
    return { success: true, data: variant };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAllSupplier = async (req) => {
  try {
    const suppliers = await Supplier.findAll();
    return {
      success: true,
      message: "Suppliers fetched successfully",
      count: suppliers.length,
      data: suppliers,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const supplierKycVerification = async (req) => {
  try {
    const suppliers = await Supplier.findAll({
      include: [
        {
          model: supplier_gst_details,
          as: "gst_details",
        },
        {
          model: SupplierKyc,
          as: "kyc_details",
        },
      ],
      exclude: [
        "gst_details.supplierSupplierId",
        "kyc_details.supplierSupplierId",
      ],
    });
    return {
      success: true,
      message: "Suppliers fetched successfully",
      count: suppliers.length,
      data: suppliers,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const verifySupplier = async (req) => {
  try {
    const { supplier_id, status } = req.body;

    // find supplier by id
    const supplier = await Supplier.findByPk(supplier_id);

    if (!supplier) {
      return {
        success: false,
        message: "Supplier not found",
      };
    }

    const kyc = await SupplierKyc.findOne({
      where: {
        supplier_id: supplier_id,
      },
    });

    if (!kyc) {
      return {
        success: false,
        message: "KYC not found",
      };
    }

    kyc.status = "verified";
    await kyc.save();

    supplier.account_status = "active";
    await supplier.save();

    return { success: true, data: supplier };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const rejectSupplierProof = async (req) => {
  try {
    const { supplier_id, rejection_reason, status } = req.body;

    // find supplier by id
    const supplier = await Supplier.findByPk(supplier_id);

    if (!supplier) {
      return {
        success: false,
        message: "Supplier not found",
      };
    }

    supplier.account_status = "suspended";
    await supplier.save();

    const kyc = await SupplierKyc.findOne({
      where: {
        supplier_id: supplier_id,
      },
    });

    if (!kyc) {
      return {
        success: false,
        message: "KYC not found",
      };
    }

    kyc.status = status;
    kyc.reason = rejection_reason;
    await kyc.save();

    return { success: true, data: supplier };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getLiveProducts = async (req) => {
  try {
    const product = await Product.findAll({
      where: {
        approval_status: "approved",
        lifecycle_status: { [Op.in]: ["active", "paused"] },
      },
      include: [
        {
          model: Supplier,
          as: "supplier",
        },
        {
          model: ProductVariant,
          as: "variants",
        },
        {
          model: ProductImage,
          as: "images",
        },
      ],
    });

    return {
      success: true,
      message: "Products fetched successfully",
      count: product.length,
      data: product,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateLiveProductStatus = async (req) => {
  try {
    const { product_id } = req.params;
    const { status } = req.body || {};
    if (!status || !["live", "out_of_stock"].includes(status)) {
      return {
        success: false,
        message: "Invalid status. Use 'live' or 'out_of_stock'",
      };
    }
    const product = await Product.findByPk(product_id);
    if (!product) {
      return { success: false, message: "Product not found" };
    }
    const lifecycle_status = status === "live" ? "active" : "paused";
    await product.update({ lifecycle_status });
    return { success: true, data: product };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const archiveLiveProduct = async (req) => {
  try {
    const { product_id } = req.params;
    const product = await Product.findByPk(product_id);
    if (!product) {
      return { success: false, message: "Product not found" };
    }
    await product.update({
      lifecycle_status: "archived",
      approval_status: product.approval_status,
    });
    return { success: true, data: product };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const getLiveProductsStats = async () => {
  try {
    const total_active = await Product.count({
      where: {
        approval_status: "approved",
        lifecycle_status: "active",
      },
    });
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const new_this_week = await Product.count({
      where: {
        approval_status: "approved",
        lifecycle_status: "active",
        created_at: { [Op.gte]: oneWeekAgo },
      },
    });
    return {
      success: true,
      data: {
        total_active: total_active || 0,
        total_gmv: 0,
        conversion_rate: 0,
        new_this_week: new_this_week || 0,
      },
    };
  } catch (error) {
    console.error("Error fetching live products stats:", error);
    return { success: false, message: error.message };
  }
};

export const getRejectedProducts = async (req) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );
    const offset = (page - 1) * limit;

    const { count, rows: products } = await Product.findAndCountAll({
      where: { approval_status: "rejected" },
      include: [
        {
          model: Supplier,
          as: "supplier",
          attributes: ["supplier_id", "name"],
        },
        { model: ProductVariant, as: "variants" },
        { model: ProductImage, as: "images" },
      ],
      limit,
      offset,
      order: [["rejected_at", "DESC"]],
    });

    const data = products.map((p) => {
      const plain = p.get({ plain: true });
      const firstVariant = plain.variants?.[0];
      return {
        id: plain.product_id,
        product_id: plain.product_id,
        supplier_id: plain.supplier_id,
        supplier_name: plain.supplier?.name ?? "",
        name: plain.title ?? "",
        description: plain.description ?? "",
        category: firstVariant?.category ?? plain.category_id ?? "",
        brand: plain.brand ?? "",
        sku: firstVariant?.sku ?? "",
        price: parseFloat(firstVariant?.variant_price ?? 0) || 0,
        images: (plain.images || [])
          .map((img) => img.image_url || img)
          .filter(Boolean),
        rejection_reason: plain.rejection_reason ?? "",
        rejection_details: plain.rejection_reason ?? "",
        rejected_at: plain.rejected_at
          ? new Date(plain.rejected_at).toISOString()
          : "",
        resubmit_count: 0,
        status: "rejected",
      };
    });

    return { success: true, data, total: count };
  } catch (error) {
    console.error("Error fetching rejected products:", error);
    return { success: false, message: error.message };
  }
};

export const getRejectedStats = async () => {
  try {
    const products = await Product.findAll({
      where: { approval_status: "rejected" },
      attributes: ["rejection_reason"],
    });
    const total_rejected = products.length;
    const rejection_reasons = {};
    products.forEach((p) => {
      const reason = p.rejection_reason?.trim() || "No reason provided";
      rejection_reasons[reason] = (rejection_reasons[reason] || 0) + 1;
    });
    return {
      success: true,
      data: {
        total_rejected,
        resubmitted: 0,
        avg_rejection_rate: total_rejected > 0 ? 100 : 0,
        rejection_reasons,
      },
    };
  } catch (error) {
    console.error("Error fetching rejected stats:", error);
    return { success: false, message: error.message };
  }
};

export const deleteOrResubmitRejectedProduct = async (req) => {
  try {
    const { product_id } = req.params;
    const product = await Product.findByPk(product_id);
    if (!product) {
      return { success: false, message: "Product not found" };
    }
    if (product.approval_status !== "rejected") {
      return { success: false, message: "Product is not rejected" };
    }
    await product.update({
      approval_status: "draft",
      lifecycle_status: "inactive",
      rejection_reason: null,
      rejected_at: null,
    });
    return { success: true, data: product };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const createAdminBankDetails = async (req) => {
  try {
    const existing = await admin_bank_details.findOne({
      where: { is_active: true },
    });

    if (existing) {
      return {
        success: false,
        message: "Admin bank details already exist. Use update API.",
      };
    }

    const payload = {
      account_holder_name: req.body.accountHolderName,
      account_number: req.body.accountNumber,
      ifsc_code: req.body.ifscCode,
      bank_name: req.body.bankName,
      upi_id: req.body.upiId,
      qr_code: req.body.qrCode || null,
      is_active: true,
    };

    const created = await admin_bank_details.create(payload);

    return {
      success: true,
      message: "Admin bank details created successfully",
      data: created,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const updateAdminBankDetails = async (req) => {
  try {
    const row = await admin_bank_details.findOne({
      where: { is_active: true },
    });

    if (!row) {
      return { success: false, message: "Admin bank details not found" };
    }

    const updates = {};
    if (req.body.accountHolderName !== undefined) {
      updates.account_holder_name = req.body.accountHolderName;
    }
    if (req.body.accountNumber !== undefined) {
      updates.account_number = req.body.accountNumber;
    }
    if (req.body.ifscCode !== undefined) {
      updates.ifsc_code = req.body.ifscCode;
    }
    if (req.body.bankName !== undefined) {
      updates.bank_name = req.body.bankName;
    }
    if (req.body.upiId !== undefined) {
      updates.upi_id = req.body.upiId;
    }
    if (req.body.qrCode !== undefined) {
      updates.qr_code = req.body.qrCode || null;
    }

    if (Object.keys(updates).length === 0) {
      return { success: false, message: "No fields provided to update" };
    }

    await row.update(updates);

    return {
      success: true,
      message: "Admin bank details updated successfully",
      data: row,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

export const getAdminBankDetailsForSupplier = async () => {
  try {
    const row = await admin_bank_details.findOne({
      where: { is_active: true },
      attributes: [
        "account_holder_name",
        "account_number",
        "ifsc_code",
        "bank_name",
        "upi_id",
        "qr_code",
      ],
    });

    if (!row) {
      return { success: false, message: "Admin bank details not found" };
    }

    return {
      success: true,
      message: "Admin bank details fetched successfully",
      data: row,
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
