import {
  getPendingProducts,
  getPendingStats,
  getProductById,
  approveProduct as approveProductFn,
  rejectProduct as rejectProductFn,
  modifiedProducts as modifiedProductsFn,
  updateProduct as updateProductAdmin,
  getAllSupplier,
  supplierKycVerification,
  verifySupplier,
  rejectSupplierProof,
  getLiveProducts,
  getLiveProductsStats,
  updateLiveProductStatus as updateLiveProductStatusFn,
  archiveLiveProduct,
  getRejectedProducts,
  getRejectedStats,
  deleteOrResubmitRejectedProduct,
} from "../utils/adminFunc.js";
import { Order, Payment, PlatformSetting } from "../models/index.js";

class SuperAdminController {
  getBulkOrderConfig = async (_req, res) => {
    try {
      const config = await PlatformSetting.findOne({
        where: { setting_key: "BULK_ORDER_CONFIG" },
      });

      return res.status(200).json({
        success: true,
        data: config?.setting_value || null,
      });
    } catch (error) {
      console.error("Error fetching bulk config:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch bulk order configuration",
      });
    }
  };

  upsertBulkOrderConfig = async (req, res) => {
    try {
      const [config] = await PlatformSetting.upsert(
        {
          setting_key: "BULK_ORDER_CONFIG",
          setting_value: req.body,
          description: "Dynamic configuration for bulk order lifecycle",
        },
        { returning: true },
      );

      return res.status(200).json({
        success: true,
        message: "Bulk order configuration updated successfully",
        data: config?.setting_value || req.body,
      });
    } catch (error) {
      console.error("Error saving bulk config:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to update bulk order configuration",
      });
    }
  };

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

  verifyBulkOrderPayment = async (req, res) => {
    try {
      const { order_id } = req.params;
      const { transactionReference } = req.body;

      const bulkConfig = await PlatformSetting.findOne({
        where: { setting_key: "BULK_ORDER_CONFIG" },
      });
      const statusFlow = bulkConfig?.setting_value?.statusFlow || {};
      const pendingPaymentStatus =
        statusFlow.pendingPayment || "Pending Payment";
      const confirmedStatus = statusFlow.confirmed || "Confirmed";

      const order = await Order.findOne({
        where: {
          order_id,
          order_type: "BULK",
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: "Bulk order not found",
        });
      }

      if (
        order.payment_status === "VERIFIED" ||
        order.payment_verified_at ||
        order.payment_verified_by
      ) {
        return res.status(409).json({
          success: false,
          error: "Bulk order payment has already been verified",
        });
      }

      if (order.order_status !== pendingPaymentStatus) {
        return res.status(400).json({
          success: false,
          error: "Only bulk orders pending payment can be marked as confirmed",
        });
      }

      const payment = await Payment.findOne({
        where: {
          order_id,
          verification_status: "pending",
        },
        order: [["created_at", "DESC"]],
      });

      if (!payment) {
        return res.status(400).json({
          success: false,
          error: "No pending payment proof found for this order",
        });
      }

      if (transactionReference) {
        payment.transaction_ref = transactionReference;
        order.transaction_reference = transactionReference;
      }

      payment.verification_status = "verified";
      payment.payment_status = "success";
      payment.verified_at = new Date();
      payment.verified_by = req.user?.userId || null;

      order.order_status = confirmedStatus;
      order.payment_status = "VERIFIED";
      order.payment_verified_at = new Date();
      order.payment_verified_by = req.user?.userId || null;

      await payment.save();
      await order.save();

      return res.status(200).json({
        success: true,
        message: "Bulk order payment verified and order confirmed successfully",
        data: {
          orderId: order.order_id,
          orderStatus: order.order_status,
          paymentStatus: order.payment_status,
          transactionReference: order.transaction_reference,
          paymentVerifiedAt: order.payment_verified_at,
          paymentVerifiedBy: order.payment_verified_by,
          paymentProof: {
            paymentId: payment.payment_id,
            paymentMode: payment.payment_mode,
            screenshotUrl: payment.payment_screenshot_url,
            verificationStatus: payment.verification_status,
          },
        },
      });
    } catch (error) {
      console.error("Error verifying bulk order payment:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to verify bulk order payment",
      });
    }
  };

  rejectBulkOrderPayment = async (req, res) => {
    try {
      const { order_id } = req.params;
      const { reason } = req.body;

      const bulkConfig = await PlatformSetting.findOne({
        where: { setting_key: "BULK_ORDER_CONFIG" },
      });
      const statusFlow = bulkConfig?.setting_value?.statusFlow || {};
      const pendingPaymentStatus =
        statusFlow.pendingPayment || "Pending Payment";

      const order = await Order.findOne({
        where: {
          order_id,
          order_type: "BULK",
        },
      });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: "Bulk order not found",
        });
      }

      if (
        order.payment_status === "VERIFIED" ||
        order.payment_verified_at ||
        order.payment_verified_by
      ) {
        return res.status(400).json({
          success: false,
          error: "Verified bulk order payments cannot be rejected",
        });
      }

      if (order.order_status !== pendingPaymentStatus) {
        return res.status(400).json({
          success: false,
          error: "Only bulk orders pending payment can be rejected",
        });
      }

      const payment = await Payment.findOne({
        where: {
          order_id,
          verification_status: "pending",
        },
        order: [["created_at", "DESC"]],
      });

      if (!payment) {
        return res.status(400).json({
          success: false,
          error: "No pending payment proof found for this order",
        });
      }

      payment.verification_status = "rejected";
      payment.payment_status = "failed";
      payment.rejected_at = new Date();
      payment.rejected_by = req.user?.userId || null;
      payment.rejection_reason = reason;

      order.payment_status = "REJECTED";
      order.order_status = pendingPaymentStatus;

      await payment.save();
      await order.save();

      return res.status(200).json({
        success: true,
        message: "Bulk order payment proof rejected successfully",
        data: {
          orderId: order.order_id,
          orderStatus: order.order_status,
          paymentStatus: order.payment_status,
          reason,
          rejectedAt: payment.rejected_at,
          rejectedBy: payment.rejected_by,
        },
      });
    } catch (error) {
      console.error("Error rejecting bulk order payment:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to reject bulk order payment",
      });
    }
  };
}

export default new SuperAdminController();
