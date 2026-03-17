import { getPendingProducts, getPendingStats, getProductById, approveProduct as approveProductFn, rejectProduct as rejectProductFn, modifiedProducts as modifiedProductsFn, updateProduct as updateProductAdmin, getAllSupplier, supplierKycVerification, verifySupplier, rejectSupplierProof, getLiveProducts, getLiveProductsStats, updateLiveProductStatus as updateLiveProductStatusFn, archiveLiveProduct, getRejectedProducts, getRejectedStats, deleteOrResubmitRejectedProduct, getSupplierPayoutStats, getSupplierPayoutList, getPartnerPayoutStats, getPartnerPayoutList, getSettlementStats, getSettlementList, getTransactionStats, getTransactionList, getWalletStats, getWalletList } from "../utils/adminFunc.js";



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

    getPendingStats = async (_req, res) => {
        try {
            const result = await getPendingStats();
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching pending stats:", error);
            res.status(500).json({ error: "Failed to fetch pending stats" });
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
            const result = await approveProductFn(req);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.status(200).json(result);
        } catch (error) {
            console.error("Error approving product:", error);
            res.status(500).json({ error: "Failed to approve product" });
        }
    };

    rejectProduct = async (req, res) => {
        try {
            const result = await rejectProductFn(req);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.status(200).json(result);
        } catch (error) {
            console.error("Error rejecting product:", error);
            res.status(500).json({ error: "Failed to reject product" });
        }
    };

    modifiedProducts = async (req, res) => {
        try {
            const result = await modifiedProductsFn(req);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error modifying product:", error);
            res.status(500).json({ error: "Failed to modify product" });
        }
    };

    updateProduct = async (req, res) => {
        try {
            const result = await updateProductAdmin(req);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.status(200).json(result);
        } catch (error) {
            console.error("Error updating product:", error);
            res.status(500).json({ error: "Failed to update product" });
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

    getLiveProductsStats = async (_req, res) => {
        try {
            const result = await getLiveProductsStats();
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching live products stats:", error);
            res.status(500).json({ error: "Failed to fetch live products stats" });
        }
    };

    updateLiveProductStatus = async (req, res) => {
        try {
            const result = await updateLiveProductStatusFn(req);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.status(200).json(result);
        } catch (error) {
            console.error("Error updating live product status:", error);
            res.status(500).json({ error: "Failed to update product status" });
        }
    };

    archiveLiveProduct = async (req, res) => {
        try {
            const result = await archiveLiveProduct(req);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.status(200).json(result);
        } catch (error) {
            console.error("Error archiving live product:", error);
            res.status(500).json({ error: "Failed to archive product" });
        }
    };

    getRejectedProducts = async (req, res) => {
        try {
            const result = await getRejectedProducts(req);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching rejected products:", error);
            res.status(500).json({ error: "Failed to fetch rejected products" });
        }
    };

    getRejectedStats = async (_req, res) => {
        try {
            const result = await getRejectedStats();
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching rejected stats:", error);
            res.status(500).json({ error: "Failed to fetch rejected stats" });
        }
    };

    deleteRejectedProduct = async (req, res) => {
        try {
            const result = await deleteOrResubmitRejectedProduct(req);
            if (!result.success) {
                return res.status(400).json(result);
            }
            res.status(200).json(result);
        } catch (error) {
            console.error("Error deleting/resubmitting rejected product:", error);
            res.status(500).json({ error: "Failed to delete rejected product" });
        }
    };

    getSupplierPayoutStats = async (_req, res) => {
        try {
            const result = await getSupplierPayoutStats();
            if (!result.success) return res.status(400).json(result);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching supplier payout stats:", error);
            res.status(500).json({ error: "Failed to fetch payout stats" });
        }
    };

    getSupplierPayoutList = async (_req, res) => {
        try {
            const result = await getSupplierPayoutList();
            if (!result.success) return res.status(400).json(result);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching supplier payout list:", error);
            res.status(500).json({ error: "Failed to fetch payout list" });
        }
    };

    getPartnerPayoutStats = async (_req, res) => {
        try {
            const result = await getPartnerPayoutStats();
            if (!result.success) return res.status(400).json(result);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching partner payout stats:", error);
            res.status(500).json({ error: "Failed to fetch payout stats" });
        }
    };

    getPartnerPayoutList = async (_req, res) => {
        try {
            const result = await getPartnerPayoutList();
            if (!result.success) return res.status(400).json(result);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching partner payout list:", error);
            res.status(500).json({ error: "Failed to fetch payout list" });
        }
    };

    getSettlementStats = async (_req, res) => {
        try {
            const result = await getSettlementStats();
            if (!result.success) return res.status(400).json(result);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching settlement stats:", error);
            res.status(500).json({ error: "Failed to fetch settlement stats" });
        }
    };

    getSettlementList = async (req, res) => {
        try {
            const result = await getSettlementList(req);
            if (!result.success) return res.status(400).json(result);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching settlement list:", error);
            res.status(500).json({ error: "Failed to fetch settlement list" });
        }
    };

    getTransactionStats = async (_req, res) => {
        try {
            const result = await getTransactionStats();
            if (!result.success) return res.status(400).json(result);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching transaction stats:", error);
            res.status(500).json({ error: "Failed to fetch transaction stats" });
        }
    };

    getTransactionList = async (req, res) => {
        try {
            const result = await getTransactionList(req);
            if (!result.success) return res.status(400).json(result);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching transaction list:", error);
            res.status(500).json({ error: "Failed to fetch transaction list" });
        }
    };

    getWalletStats = async (_req, res) => {
        try {
            const result = await getWalletStats();
            if (!result.success) return res.status(400).json(result);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching wallet stats:", error);
            res.status(500).json({ error: "Failed to fetch wallet stats" });
        }
    };

    getWalletList = async (_req, res) => {
        try {
            const result = await getWalletList();
            if (!result.success) return res.status(400).json(result);
            res.status(200).json(result);
        } catch (error) {
            console.error("Error fetching wallet list:", error);
            res.status(500).json({ error: "Failed to fetch wallet list" });
        }
    };
}

export default new SuperAdminController();
