import {
  ShopifyStore,
  User,
  Product,
  ProductVariant,
  ProductImage,
  reseller_bank_details,
  reseller_gst_details,
  Order,
  Reseller,
  Payment,
  PlatformSetting,
  DropshipperSourceRequest,
  Category,
} from "../models/index.js";
import crypto from "crypto";
import axios from "axios";
import Decimal from "decimal.js";
import { getAdminBankDetailsForSupplier } from "../utils/adminFunc.js";
import { Op } from "sequelize";
import { mapToShopifyProduct } from "../utils/commonFunc.js"

const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const SCOPES = process.env.SHOPIFY_SCOPES;
const REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI;

class DropshipperController {
  userPhoneColumnExists = null;
  orderTableColumns = null;

  hasUnexpectedFields = (body, allowedFields) => {
    const keys = Object.keys(body || {});
    const unexpected = keys.filter((key) => !allowedFields.includes(key));
    return { hasUnexpected: unexpected.length > 0, unexpected };
  };

  formatBankDetails = (record) => ({
    holderName: record?.account_holder_name || null,
    accountNumber: record?.account_number || null,
    ifsc: record?.ifsc_code || null,
    bankDetailProof: record?.bank_detail_proof || null,
  });

  formatGstDetails = (record) => ({
    gstNumber: record?.gst_number || null,
    panCardNumber: record?.pan_number || null,
    gstCertificate: record?.gst_image || null,
    panCardNumberImage: record?.pan_image || null,
  });

  getUserProfileAttributes = async () => {
    const baseAttributes = [
      "user_id",
      "name",
      "email",
      "role",
      "status",
      "shopify_store",
    ];

    if (this.userPhoneColumnExists === null) {
      try {
        const tableName = User.getTableName();
        const table =
          typeof tableName === "string" ? tableName : tableName.tableName;
        const definition = await User.sequelize
          .getQueryInterface()
          .describeTable(table);
        this.userPhoneColumnExists = Boolean(definition?.phone_number);
      } catch (error) {
        this.userPhoneColumnExists = false;
      }
    }

    if (this.userPhoneColumnExists) {
      baseAttributes.push("phone_number");
    }

    return baseAttributes;
  };

  getAuthenticatedReseller = async (req) => {
    const { userId, role } = req.user || {};

    if (!userId || role !== "RESELLER") {
      return null;
    }

    const attributes = await this.getUserProfileAttributes();
    const user = await User.findOne({ where: { user_id: userId }, attributes });
    return user;
  };

  getAuthenticatedBuyer = async (
    req,
    allowedRoles = ["RESELLER", "CUSTOMER"],
  ) => {
    const { userId, role } = req.user || {};

    if (!userId || !allowedRoles.includes(role)) {
      return null;
    }

    const attributes = await this.getUserProfileAttributes();
    return User.findOne({ where: { user_id: userId }, attributes });
  };

  getBulkOrderConfig = async () => {
    const configRow = await PlatformSetting.findOne({
      where: { setting_key: "BULK_ORDER_CONFIG" },
    });

    if (!configRow?.setting_value) {
      throw new Error(
        "BULK_ORDER_CONFIG is not configured. Please configure it from admin panel.",
      );
    }

    return configRow.setting_value;
  };

  getOrderTableColumns = async () => {
    if (this.orderTableColumns) {
      return this.orderTableColumns;
    }

    try {
      const tableName = Order.getTableName();
      const table =
        typeof tableName === "string" ? tableName : tableName.tableName;
      const definition = await Order.sequelize
        .getQueryInterface()
        .describeTable(table);
      this.orderTableColumns = new Set(Object.keys(definition || {}));
    } catch (error) {
      this.orderTableColumns = new Set();
    }

    return this.orderTableColumns;
  };

  buildFileUrl = (req, fieldName) => {
    const file = req.files?.[fieldName]?.[0];

    if (!file?.filename) {
      return null;
    }

    const publicPath = `uploads/images/${file.filename}`.replace(/\\/g, "/");
    return `${req.protocol}://${req.get("host")}/${publicPath}`;
  };

  getProfile = async (req, res) => {
    try {
      const user = await this.getAuthenticatedReseller(req);

      if (!user) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      return res.status(200).json({
        success: true,
        data: {
          user_id: user.user_id,
          store_id: user.user_id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number || null,
          role: user.role,
          status: user.status,
          shopify_store: user.shopify_store,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  updateProfile = async (req, res) => {
    try {
      const user = await this.getAuthenticatedReseller(req);

      if (!user) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { name, email, phoneNumber, phone_number } = req.body;
      const nextEmail = email?.trim();

      if (nextEmail && nextEmail !== user.email) {
        const existingUser = await User.findOne({
          where: { email: nextEmail },
        });

        if (existingUser && existingUser.user_id !== user.user_id) {
          return res
            .status(400)
            .json({ success: false, error: "Email already in use" });
        }
      }

      user.name = name ?? user.name;
      user.email = nextEmail ?? user.email;
      if (this.userPhoneColumnExists) {
        user.phone_number = phoneNumber ?? phone_number ?? user.phone_number;
      }

      await user.save();

      return res.status(200).json({
        success: true,
        data: {
          user_id: user.user_id,
          store_id: user.user_id,
          name: user.name,
          email: user.email,
          phone_number: user.phone_number || null,
          role: user.role,
          status: user.status,
        },
        message: "Profile updated successfully",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  saveBankDetails = async (req, res) => {
    try {
      const user = await this.getAuthenticatedReseller(req);

      if (!user) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { hasUnexpected, unexpected } = this.hasUnexpectedFields(req.body, [
        "holderName",
        "accountNumber",
        "ifsc",
      ]);

      if (hasUnexpected) {
        return res.status(400).json({
          success: false,
          error: `Unexpected fields: ${unexpected.join(", ")}`,
        });
      }

      const { holderName, accountNumber, ifsc } = req.body;
      const normalizedHolderName = String(holderName || "").trim();
      const normalizedAccountNumber = String(accountNumber || "").trim();
      const normalizedIfsc = String(ifsc || "").trim();

      if (
        !normalizedHolderName ||
        !normalizedAccountNumber ||
        !normalizedIfsc
      ) {
        return res.status(400).json({
          success: false,
          error:
            "holderName, accountNumber and ifsc are required and cannot be null",
        });
      }

      const existingDetails = await reseller_bank_details.findOne({
        where: { user_id: user.user_id },
      });

      const bankProofUrl = this.buildFileUrl(req, "bankDetailProof");

      if (!bankProofUrl && !existingDetails?.bank_detail_proof) {
        return res.status(400).json({
          success: false,
          error: "bankDetailProof is required",
        });
      }

      const payload = {
        user_id: user.user_id,
        account_holder_name: normalizedHolderName,
        account_number: normalizedAccountNumber,
        ifsc_code: normalizedIfsc,
        bank_detail_proof:
          bankProofUrl || existingDetails?.bank_detail_proof || null,
        bank_details_status: true,
      };

      let data;

      if (existingDetails) {
        await existingDetails.update(payload);
        data = existingDetails;
      } else {
        data = await reseller_bank_details.create(payload);
      }

      return res.status(200).json({
        success: true,
        data: this.formatBankDetails(data),
        message: "Bank details saved successfully",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  getBankDetails = async (req, res) => {
    try {
      const user = await this.getAuthenticatedReseller(req);

      if (!user) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const data = await reseller_bank_details.findOne({
        where: { user_id: user.user_id },
      });

      return res.status(200).json({
        success: true,
        data: this.formatBankDetails(data),
        user_id: user.user_id,
        store_id: user.user_id,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  getAdminBankDetails = async (req, res) => {
    try {
      const user = await this.getAuthenticatedReseller(req);

      if (!user) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const result = await getAdminBankDetailsForSupplier();

      if (!result.success) {
        return res.status(404).json(result);
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  saveGstDetails = async (req, res) => {
    try {
      const user = await this.getAuthenticatedReseller(req);

      if (!user) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { hasUnexpected, unexpected } = this.hasUnexpectedFields(req.body, [
        "gstNumber",
        "panCardNumber",
      ]);

      if (hasUnexpected) {
        return res.status(400).json({
          success: false,
          error: `Unexpected fields: ${unexpected.join(", ")}`,
        });
      }

      const { gstNumber, panCardNumber } = req.body;
      const normalizedGstNumber = String(gstNumber || "").trim();
      const normalizedPanCardNumber = String(panCardNumber || "").trim();

      if (!normalizedGstNumber || !normalizedPanCardNumber) {
        return res.status(400).json({
          success: false,
          error: "gstNumber and panCardNumber are required and cannot be null",
        });
      }
      // required-field and format checks are handled by validate(gstDetailsRules) middleware

      const existingDetails = await reseller_gst_details.findOne({
        where: { user_id: user.user_id },
      });

      const gstImage = this.buildFileUrl(req, "gstCertificate");
      const panImage = this.buildFileUrl(req, "panCardNumberImage");

      if (!gstImage && !existingDetails?.gst_image) {
        return res.status(400).json({
          success: false,
          error: "gstCertificate is required",
        });
      }

      if (!panImage && !existingDetails?.pan_image) {
        return res.status(400).json({
          success: false,
          error: "panCardNumberImage is required",
        });
      }

      const payload = {
        user_id: user.user_id,
        gst_name: existingDetails?.gst_name || normalizedGstNumber,
        gst_number: normalizedGstNumber,
        pan_number: normalizedPanCardNumber,
        gst_validity: new Date(),
        gst_status: true,
        gst_image: gstImage || existingDetails?.gst_image || null,
        pan_image: panImage || existingDetails?.pan_image || null,
      };

      let data;

      if (existingDetails) {
        await existingDetails.update(payload);
        data = existingDetails;
      } else {
        data = await reseller_gst_details.create(payload);
      }

      return res.status(200).json({
        success: true,
        data: this.formatGstDetails(data),
        message: "GST details saved successfully",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  getGstDetails = async (req, res) => {
    try {
      const user = await this.getAuthenticatedReseller(req);

      if (!user) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const data = await reseller_gst_details.findOne({
        where: { user_id: user.user_id },
      });

      return res.status(200).json({
        success: true,
        data: this.formatGstDetails(data),
        user_id: user.user_id,
        store_id: user.user_id,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  generateInvoiceNumber = () => {
    const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
    return `INV-BULK-${Date.now()}-${rand}`;
  };

  getPlatformPaymentAccountDetails = async () => {
    const config = await this.getBulkOrderConfig();
    const paymentAccount = config?.paymentAccount;

    if (!paymentAccount) {
      throw new Error("paymentAccount is missing in BULK_ORDER_CONFIG");
    }

    return paymentAccount;
  };

  createBulkOrder = async (req, res) => {
    try {
      const config = await this.getBulkOrderConfig();
      const allowedRoles = config.allowRoles || ["RESELLER", "CUSTOMER"];
      const buyerUser = await this.getAuthenticatedBuyer(req, allowedRoles);

      if (!buyerUser) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const {
        productId,
        quantity,
        customerName,
        customerPhone,
        customerEmail,
        deliveryAddress,
        transactionReference,
        paymentMode,
        amount,
        notes,
      } = req.body;

      const paymentScreenshot = this.buildFileUrl(req, "paymentScreenshot");
      if (!paymentScreenshot) {
        return res.status(400).json({
          success: false,
          error: "paymentScreenshot is required",
        });
      }

      const product = await Product.findOne({
        where: { product_id: productId },
      });

      if (!product) {
        return res
          .status(404)
          .json({ success: false, error: "Product not found" });
      }

      // SUPPLIER-LEVEL SETTINGS: Fetch from product (set by supplier)
      // minOrderQty: from product.minimum_order_quantity (supplier sets per product)
      const productMinOrderQty = Number(product.minimum_order_quantity || 10);

      if (Number(quantity) < productMinOrderQty) {
        return res.status(400).json({
          success: false,
          error: `Minimum order quantity is ${productMinOrderQty}`,
        });
      }

      // ADMIN-LEVEL SETTINGS: Fetch from platform config
      const defaultMarginPerPiece = new Decimal(
        config.defaultMarginPerPiece || 0,
      );

      if (
        (product.bulk_price === null || product.bulk_price === undefined) &&
        (product.transfer_price === null ||
          product.transfer_price === undefined)
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Pricing is not configured for this product. Provide bulk_price or transfer_price.",
        });
      }

      const unitBulkPrice =
        product.bulk_price !== null && product.bulk_price !== undefined
          ? new Decimal(product.bulk_price)
          : new Decimal(product.transfer_price).plus(defaultMarginPerPiece);

      const unitTransferPrice =
        product.transfer_price !== null && product.transfer_price !== undefined
          ? new Decimal(product.transfer_price)
          : Decimal.max(unitBulkPrice.minus(defaultMarginPerPiece), 0);

      const qty = new Decimal(quantity);

      // SUPPLIER-LEVEL SETTINGS: Get GST rate from product (set by supplier)
      const applicableGstRate = new Decimal(product.gst_rate ?? 0.18);

      // SUPPLIER-LEVEL SETTINGS: Get shipping charge from supplier profile (supplier sets globally or per product)
      // TODO: Add default_shipping_charge field to suppliers table or fetch from product custom field
      const shippingAmount = new Decimal(50); // Temporary default; should come from supplier profile
      const platformMarginPerPiece = Decimal.max(
        unitBulkPrice.minus(unitTransferPrice),
        0,
      ).toDecimalPlaces(2);
      const platformTotalMargin = platformMarginPerPiece
        .mul(qty)
        .toDecimalPlaces(2);
      const supplierPayoutAmount = unitTransferPrice
        .mul(qty)
        .toDecimalPlaces(2);

      const [resellerRecord] = await Reseller.findOrCreate({
        where: { user_id: buyerUser.user_id },
        defaults: {
          user_id: buyerUser.user_id,
          status: "active",
        },
      });

      const subtotal = unitBulkPrice.mul(qty).toDecimalPlaces(2);
      const gstAmount = subtotal.mul(applicableGstRate).toDecimalPlaces(2);
      const totalPayable = subtotal
        .plus(gstAmount)
        .plus(shippingAmount)
        .toDecimalPlaces(2);

      const invoiceNumber = this.generateInvoiceNumber();
      const pendingPaymentStatus =
        config?.statusFlow?.pendingPayment || "Pending Payment";

      const orderPayload = {
        reseller_id: resellerRecord.reseller_id,
        // product_id: product.product_id,
        order_type: "BULK",
        quantity: quantity,
        // unit_bulk_price: unitBulkPrice.toFixed(2),
        subtotal: subtotal.toFixed(2),
        shipping_amount: shippingAmount.toFixed(2),
        // gst_rate: applicableGstRate.toFixed(4),
        gst_amount: gstAmount.toFixed(2),
        total_payable: totalPayable.toFixed(2),
        total_amount: totalPayable.toFixed(2),
        invoice_number: invoiceNumber,
        user_business_details: {
          customerEmail: customerEmail || null,
          notes: notes || null,
        },
        customer_name: customerName,
        customer_phone: customerPhone,
        shipping_address: deliveryAddress,
        // supplier_transfer_price: unitTransferPrice.toFixed(2),
        platform_margin_per_piece: platformMarginPerPiece.toFixed(2),
        platform_total_margin: platformTotalMargin.toFixed(2),
        supplier_payout_amount: supplierPayoutAmount.toFixed(2),
        supplier_payout_status: "PENDING_DELIVERY",
        supplier_payout_cycle: config?.settlement?.cycle || null,
        payment_method: paymentMode === "upi" ? "UPI" : "DIRECT_BANK_TRANSFER",
        payment_status: "PROOF_SUBMITTED",
        transaction_reference: transactionReference,
        order_status: pendingPaymentStatus,
        orderDetails: [product],
      };

      const orderColumns = await this.getOrderTableColumns();
      if (orderColumns.has("supplier_id")) {
        orderPayload.supplier_id = product.supplier_id;
      }

      const order = await Order.create(orderPayload);

      const payableAmount = new Decimal(
        amount ?? Number(order.total_payable || order.total_amount || 0),
      ).toDecimalPlaces(2);

      const payment = await Payment.create({
        order_id: order.order_id,
        payment_mode: paymentMode,
        amount: Number(payableAmount.toString()),
        payment_status: "initiated",
        transaction_ref: transactionReference,
        payment_screenshot_url: paymentScreenshot,
        verification_status: "pending",
        gateway: notes || null,
      });

      const companyBankDetails = await this.getPlatformPaymentAccountDetails();
      const productPlain = product.get({ plain: true });
      const productDetails = {
        ...productPlain,
        productId: productPlain.product_id,
        supplierId: productPlain.supplier_id,
        categoryId: productPlain.category_id,
        bulkPrice: productPlain.bulk_price,
        transferPrice: productPlain.transfer_price,
        gstRate: productPlain.gst_rate,
        minimumOrderQuantity: productPlain.minimum_order_quantity,
        bulkPriceRefreshDays: productPlain.bulk_price_refresh_days,
        approvalStatus: productPlain.approval_status,
        lifecycleStatus: productPlain.lifecycle_status,
      };

      return res.status(201).json({
        success: true,
        message:
          "Bulk order submitted with payment proof. Awaiting admin verification.",
        data: {
          orderId: order.order_id,
          invoiceNumber: order.invoice_number,
          productDetails: [productDetails],
          quantity: order.quantity,
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
          customerEmail: customerEmail || null,
          deliveryAddress: order.shipping_address,
          unitBulkPrice: order.unit_bulk_price,
          subtotal: order.subtotal,
          shippingAmount: order.shipping_amount,
          gstRate: order.gst_rate,
          gstAmount: order.gst_amount,
          totalPayable: order.total_payable,
          orderStatus: order.order_status,
          paymentStatus: order.payment_status,
          transactionReference: order.transaction_reference,
          paymentProof: {
            paymentId: payment.payment_id,
            paymentMode: payment.payment_mode,
            amount: payment.amount,
            screenshotUrl: payment.payment_screenshot_url,
            verificationStatus: payment.verification_status,
          },
          companyBankDetails,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  getBulkOrderBankDetails = async (req, res) => {
    try {
      const config = await this.getBulkOrderConfig();
      const allowedRoles = config.allowRoles || ["RESELLER", "CUSTOMER"];
      const buyerUser = await this.getAuthenticatedBuyer(req, allowedRoles);

      if (!buyerUser) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { productId } = req.params;
      const product = await Product.findOne({
        where: { product_id: productId },
      });

      if (!product) {
        return res
          .status(404)
          .json({ success: false, error: "Product not found" });
      }

      const companyBankDetails = await this.getPlatformPaymentAccountDetails();

      return res.status(200).json({
        success: true,
        data: {
          productId,
          supplierId: product.supplier_id,
          minOrderQty: Number(product.minimum_order_quantity || 10),
          companyBankDetails,
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  submitSourceRequest = async (req, res) => {
    try {
      const user = await this.getAuthenticatedReseller(req);

      if (!user) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const { productName, productCategory, productImageUrl, expectedPrice } =
        req.body;

      const uploadedImageUrl = this.buildFileUrl(req, "productImage");
      const directImageUrl =
        productImageUrl && String(productImageUrl).trim()
          ? String(productImageUrl).trim()
          : null;
      const hasUploadedImage = Boolean(uploadedImageUrl);
      const hasDirectImageUrl = Boolean(directImageUrl);

      if (!hasUploadedImage && !hasDirectImageUrl) {
        return res.status(400).json({
          success: false,
          error: "Either productImage upload or productImageUrl is required",
        });
      }

      if (hasUploadedImage && hasDirectImageUrl) {
        return res.status(400).json({
          success: false,
          error:
            "Provide either productImage upload or productImageUrl, not both",
        });
      }

      const sourceRequest = await DropshipperSourceRequest.create({
        user_id: user.user_id,
        product_name: productName,
        product_category: productCategory,
        product_image_url: uploadedImageUrl || directImageUrl,
        product_url: null,
        expected_price: expectedPrice,
        status: "IN_REVIEW",
      });

      return res.status(201).json({
        success: true,
        message: "Product sourcing request submitted successfully",
        data: {
          requestId: sourceRequest.request_id,
          productName: sourceRequest.product_name,
          productCategory: sourceRequest.product_category,
          productImageUrl: sourceRequest.product_image_url,
          expectedPrice: sourceRequest.expected_price,
          status: sourceRequest.status,
          createdAt: sourceRequest.created_at,
        },
      });
    } catch (error) {
      console.error("Error submitting source request:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  };

  // connect shopify
  connectShopify = async (req, res) => {
    try {
      const { shop } = req.query;

      if (!shop || !shop.endsWith(".myshopify.com")) {
        return res.status(400).json({ error: "Invalid shop domain" });
      }

      console.log("req.user==>26", req.user);

      // Create secure state payload
      const statePayload = {
        userId: req.user.userId,
        nonce: crypto.randomBytes(8).toString("hex"),
      };

      const state = Buffer.from(JSON.stringify(statePayload)).toString(
        "base64",
      );

      const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${API_KEY}&scope=${encodeURIComponent(
        SCOPES,
      )}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}`;

      res.json({ installUrl });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to connect Shopify" });
    }
  };

  // callback shopify
  callbackShopify = async (req, res) => {
    try {
      const { hmac, signature, ...query } = req.query;

      const map = Object.keys(query)
        .sort()
        .map(
          (key) =>
            `${key}=${Array.isArray(query[key]) ? query[key].join(",") : query[key]}`,
        )
        .join("&");

      // const userId = req.user.userId;

      const generatedHash = crypto
        .createHmac("sha256", API_SECRET)
        .update(map)
        .digest("hex");

      if (generatedHash !== hmac) {
        console.log("Generated:", generatedHash);
        console.log("Shopify:", hmac);
        console.log("Message:", map);
        return res.status(400).send("HMAC validation failed");
      }

      const { shop, code, state } = query;

      const decodedState = JSON.parse(
        Buffer.from(state, "base64").toString("utf8"),
      );

      const userId = decodedState.userId;

      const tokenRes = await axios.post(
        `https://${shop}/admin/oauth/access_token`,
        {
          client_id: API_KEY,
          client_secret: API_SECRET,
          code,
        },
      );

      const { access_token, scope } = tokenRes.data;

      await ShopifyStore.upsert(
        {
          store_name: shop,
          store_url: `https://${shop}`,
          access_token,
          scope,
          installed_at: new Date(),
          is_active: true,
        },
        {
          conflictFields: ["store_name"],
        },
      );

      await User.update(
        {
          shopify_store: `https://${shop}`,
          shopify_access_token: access_token,
        },
        {
          where: { user_id: userId },
        },
      );

      res.redirect(`${process.env.FRONTEND_URL2}/marketplace/connect/success`);
    } catch (error) {
      console.error(error.response?.data || error);
      res.status(500).send("Shopify connection failed");
    }
  };


  pushProductToShopify = async (req, res) => {
    try {
      const { shop, access_token, productData } = req.body;
      console.log("shop", shop);
      console.log("accessToken", access_token);

      const shopifyPayload = mapToShopifyProduct(productData);

      const productRes = await axios.post(
        `https://${shop}/admin/api/2026-01/products.json`,
        shopifyPayload,
        {
          headers: {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
          },
        },
      );

      res.json({
      success: true,
      shopify_product_id: response.data.product.id,
      data: response.data,
      });

    } catch (error) {
      console.error(error.response?.data || error);
      res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
    }
  };

  // get shopify store
  getShopifyStore = async (req, res) => {
    try {
      const { shop } = req.query;
      const shopifyStore = await ShopifyStore.findOne({
        where: { store_name: shop },
      });
      return res.json(shopifyStore);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to get Shopify store" });
    }
  };

  getProducts = async (req, res) => {
    try {
      const getProducts = await Product.findAll({
        include: [
          { model: ProductVariant, as: "variants" },
          { model: ProductImage, as: "images" },
        ],
      });
      return res.json({
        success: true,
        message: "Products fetched successfully",
        count: getProducts.length,
        data: getProducts,
      });
    } catch (error) {
      console.error(error.response?.data || error);
      return res.status(500).json({
        success: false,
        message: "Failed to get products from Shopify",
        error: error.message,
      });
    }
  };

  webhookCustomersDataRequest = async (req, res) => {
    console.log("customers/data_request webhook received");
    console.log(req.body);
    res.status(200).send("OK");
  };

  webhookCustomersRedact = async (req, res) => {
    console.log("customers/redact webhook received");
    res.status(200).send("OK");
  };

  webhookShopRedact = async (req, res) => {
    console.log("shop/redact webhook received");
    res.status(200).send("OK");
  };

  // GET all active & approved products for dropshipper
getAllDropshipperProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: {
        approval_status: "approved",
        lifecycle_status: "active",
      },
      include: [
        {
          model: ProductVariant,
          as: "variants",
          where: { is_active: true },
          required: true,
        },
        { model: ProductImage, as: "images" },
        { model: Category, as: "category" },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET single product details for dropshipper
getDropshipperProductById = async (req, res) => {
  try {
    const { product_id } = req.params;
    const product = await Product.findOne({
      where: {
        product_id,
        approval_status: "approved",
        lifecycle_status: "active",
      },
      include: [
        {
          model: ProductVariant,
          as: "variants",
          where: { is_active: true },
          required: false,
        },
        { model: ProductImage, as: "images" },
        { model: Category, as: "category" },
      ],
    });
    if (!product) {
      return res.status(404).json({ success: false, error: "Product not found" });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
}

export default new DropshipperController();
