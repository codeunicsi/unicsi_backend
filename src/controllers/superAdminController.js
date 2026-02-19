import { getPendingProducts, getProductById, approveProduct, rejectProduct, modifiedProducts, getAllSupplier, supplierKycVerification, verifySupplier, rejectSupplierProof, getLiveProducts } from "../utils/adminFunc.js";



class SuperAdminController {
    getPendingProducts = async (req, res) => {
        try {
            const result = await getPendingProducts(req);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching pending products:", error);
            res.status(500).json({ error: "Failed to fetch pending products" });
        }
    };

    getProductById = async (req, res) => {
        try {
            const result = await getProductById(req);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching product by ID:", error);
            res.status(500).json({ error: "Failed to fetch product by ID" });
        }
    };

    approveProduct = async (req, res) => {
        try {
            const product = await approveProduct(req);
            res.status(200).json(product);
        } catch (error) {
            console.error("Error approving product:", error);
            res.status(500).json({ error: "Failed to approve product" });
        }
    };

    rejectProduct = async (req, res) => {
        try {
            const result = await rejectProduct(req);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error rejecting product:", error);
            res.status(500).json({ error: "Failed to reject product" });
        }
    };

    modifiedProducts = async (req, res) => {
        try {
            const result = await modifiedProducts(req);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error modifying product:", error);
            res.status(500).json({ error: "Failed to modify product" });
        }
    };

    getAllSupplier = async (req, res) => {
        try {
            const result = await getAllSupplier(req);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching all suppliers:", error);
            res.status(500).json({ error: "Failed to fetch all suppliers" });
        }
    };

    supplierKycVerification = async (req, res) => {
        try {
            const result = await supplierKycVerification(req);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching all suppliers:", error);
            res.status(500).json({ error: "Failed to fetch all suppliers" });
        }
    };

    verifySupplier = async (req, res) => {
        try {
            const result = await verifySupplier(req);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching all suppliers:", error);
            res.status(500).json({ error: "Failed to fetch all suppliers" });
        }
    };

    rejectSupplierProof = async (req, res) => {
        try {
            const result = await rejectSupplierProof(req);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching all suppliers:", error);
            res.status(500).json({ error: "Failed to fetch all suppliers" });
        }
    };

    getLiveProducts = async (req, res) => {
        try {
            const result = await getLiveProducts(req);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching live products:", error);
            res.status(500).json({ error: "Failed to fetch live products" });
        }
    };

}

export default new SuperAdminController();
