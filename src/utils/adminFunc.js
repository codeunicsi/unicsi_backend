import { Supplier, ProductImage, Product, ProductVariant, Warehouse, Inventory, ProductReviewLog, supplier_gst_details, SupplierKyc } from "../models/index.js";

export const getPendingProducts = async (req, res) => {
    try {
        const products = await Product.findAll({
            where: { approval_status: "submitted" },
            include: [
                {
                    model: ProductVariant,
                    as: "variants",
                    include: [
                        {
                            model: ProductImage,
                            as: "images",
                        },
                    ],
                },
            ],
        });

        return {
            success: true,
            data: products,
        }

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
                product_id: productId
            },
            include: [
                {
                    model: ProductVariant,
                    as: "variants",
                    include: [
                        {
                            model: ProductImage,
                            as: "images",
                        },
                    ],
                },
            ],
        });
        return { success: true, data: product };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

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

        const product = await Product.findByPk(product_id);
        if (!product) {
            return {
                success: false,
                message: "Product not found",
            };
        }
        await product.update({
            approval_status: "rejected",
            lifecycle_status: "inactive", // optional: publish to marketplace
        });
        return { success: true, data: product };
    } catch (error) {
        return { success: false, error: error.message };
    }
}


export const modifiedProducts = async (req) => {
    try {
        const { product_id, variant_id } = req.params;

        console.log("variant-data-id",product_id, variant_id);

        const { price, dimensions_cm, weight_kg, } = req.body;
        const variant = await ProductVariant.findByPk(variant_id);
        const product = await Product.findByPk(product_id);
        if (!product || !variant) {
            return {
                success: false,
                message: "Product not found",
            };
        }
        await product.update({
            approval_status: "modified",
            lifecycle_status: "inactive", // optional: publish to marketplace           

        });
        await variant.update({
            price,
            dimensions_cm,
            weight_kg,
        });
        return { success: true, data: variant };
    } catch (error) {
        return { success: false, error: error.message };
    }
}


export const getAllSupplier = async (req) => {
    try {
        const suppliers = await Supplier.findAll();
        return { success: true, message: "Suppliers fetched successfully", count: suppliers.length, data: suppliers };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

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
            }
           ],
           exclude: ["gst_details.supplierSupplierId", "kyc_details.supplierSupplierId"],
        });
        return { success: true, message: "Suppliers fetched successfully", count: suppliers.length, data: suppliers };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

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
}

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
}


