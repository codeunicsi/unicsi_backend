import {
  Supplier,
  ProductImage,
  Product,
  ProductVariant,
  Warehouse,
  Inventory,
  supplier_bank_details,
  supplier_gst_details,
  ProductOption,
  ProductOptionValue,
  Category,
  PlatformSetting,
  DropshipperSourceRequest,
} from "../models/index.js";
import { Op } from "sequelize";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import upload from "../middlewares/uploadMiddleware.js";
import sequelize from "../config/database.js";

const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;
const catch_error_msg = "Something went wrong!";

const otp_fns = {
  getOTP: async () => Math.floor(100000 + Math.random() * 900000).toString(),
};

const constant = {
  get_ip_device: (req) => ({
    ip: req.ip || req.headers["x-forwarded-for"] || null,
    device: req.headers["user-agent"] || null,
    device_browser: req.headers["user-agent"] || null,
  }),
};

const suppliers_login_history = {
  create: async () => null,
};

const getBulkOrderConfig = async () => {
  const config = await PlatformSetting.findOne({
    where: { setting_key: "BULK_ORDER_CONFIG" },
  });

  return config?.setting_value || null;
};

const getBulkPriceRefreshMeta = (product, refreshDays) => {
  if (!refreshDays) {
    return {
      refreshDays: null,
      lastUpdatedAt: product.bulk_price_updated_at || null,
      nextRefreshDueAt: null,
      daysUntilDue: null,
      shouldRemind: false,
      isOverdue: false,
    };
  }

  const lastUpdatedAt = product.bulk_price_updated_at
    ? new Date(product.bulk_price_updated_at)
    : product.updatedAt
      ? new Date(product.updatedAt)
      : null;

  if (!lastUpdatedAt) {
    return {
      refreshDays,
      lastUpdatedAt: null,
      nextRefreshDueAt: null,
      daysUntilDue: null,
      shouldRemind: true,
      isOverdue: true,
    };
  }

  const nextRefreshDueAt = new Date(
    lastUpdatedAt.getTime() + refreshDays * MILLISECONDS_IN_A_DAY,
  );
  const remainingMs = nextRefreshDueAt.getTime() - Date.now();
  const daysUntilDue = Math.ceil(remainingMs / MILLISECONDS_IN_A_DAY);
  const isOverdue = remainingMs <= 0;

  return {
    refreshDays,
    lastUpdatedAt,
    nextRefreshDueAt,
    daysUntilDue,
    shouldRemind: isOverdue,
    isOverdue,
  };
};

const attachBulkPriceRefreshMeta = (products, refreshDays) => {
  return products.map((product) => {
    const plainProduct =
      typeof product.toJSON === "function" ? product.toJSON() : product;

    return {
      ...plainProduct,
      bulkPriceRefresh: getBulkPriceRefreshMeta(plainProduct, refreshDays),
    };
  });
};

const parseJSONField = (value, fallbackValue, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return fallbackValue;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`Invalid JSON format for ${fieldName}`);
    }
  }

  return value;
};

const normalizeDimensionCm = (input = {}) => {
  if (Object.prototype.hasOwnProperty.call(input, "dimension_cm")) {
    return input.dimension_cm;
  }
  if (Object.prototype.hasOwnProperty.call(input, "dimensions_cm")) {
    return input.dimensions_cm;
  }
  return undefined;
};

const validateDimensionCm = (dimensionCm) => {
  if (dimensionCm === undefined || dimensionCm === null) {
    return { isValid: true };
  }

  if (
    typeof dimensionCm !== "object" ||
    Array.isArray(dimensionCm) ||
    dimensionCm === null
  ) {
    return {
      isValid: false,
      error: "dimension_cm must be an object with keys: height, width, length",
    };
  }

  const allowedKeys = new Set(["height", "width", "length"]);
  const keys = Object.keys(dimensionCm);

  for (const key of keys) {
    if (!allowedKeys.has(key)) {
      return {
        isValid: false,
        error: `Invalid key in dimension_cm: ${key}`,
      };
    }

    const value = Number(dimensionCm[key]);
    if (!Number.isFinite(value) || value < 0) {
      return {
        isValid: false,
        error: `dimension_cm.${key} must be a non-negative number`,
      };
    }
  }

  return { isValid: true };
};

export const signup_send_otp = async (req) => {
  try {
    const { number } = req.query;
    console.log("number==> 9220774381");
    if (!number) {
      return { status: "failure", msg: "Invalid Number!" };
    }
    // console.log("from seller_const")
    // const number = req.user.number;
    // var otp = await otp_fns.getOTP();
    let otp = 123456;
    // const data = await sellers.update({ otp }, { where: { number } })
    const supplier_exist = await Supplier.findOne({ where: { number } });
    if (supplier_exist) {
      return { status: "success", msg: "Already Registered!" };
    } else {
      const update_supplier = await Supplier.create({
        otp: otp,
        number: number,
      });
      if (update_supplier) {
        return { status: "success", msg: "OTP Sent!" };
      } else {
        return { status: "failure", msg: "Something went wrong!" };
      }
    }
  } catch (e) {
    console.log(e);
    return {
      status: "failure",
      msg: "Something went wrong!",
    };
  }
};

export const signup = async (req) => {
  try {
    const { otp, email, password, number } = req.body;

    if (!otp || !email || !password || !number) {
      return { success: false, error: "All fields are required!" };
    }

    const verify_otp = await Supplier.findOne({ where: { number, otp } });

    if (!verify_otp) {
      return { success: false, error: "Invalid OTP!" };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await Supplier.update(
      { email, password: hashedPassword },
      { where: { number } },
    );
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const signup_verify_otp = async (req, number, login_from) => {
  try {
    if (!req.body.OTP) {
      return { status: "failure", msg: "Invalid OTP!" };
    }
    const error_otp = await otp_fns.getOTP();
    const supplier_exist = await Supplier.findOne({ where: { number } });
    if (supplier_exist) {
      if (req.body.OTP == supplier_exist.otp) {
        const ot = await otp_fns.getOTP();
        const update_supplier = await Supplier.update(
          { signup_otp_status: true, verified: true, otp: ot },
          {
            where: {
              number,
            },
          },
        );
        if (update_supplier[0]) {
          if (login_from !== null) {
            const ip_dt = constant.get_ip_device(req);
            await suppliers_login_history.create({
              supplier_id: supplier_exist.supplier_id,
              login_from: login_from,
              ip: ip_dt.ip,
              device: ip_dt.device,
              browser: ip_dt.device_browser,
            });
            return { status: "success" };
          } else {
            return {
              status: "success",
              supplier_id: supplier_exist.supplier_id,
            };
          }
        } else {
          await Supplier.update({ otp: error_otp }, { where: { number } });
          return { status: "failure", msg: "Something went wrong!" };
        }
      } else {
        await Supplier.update({ otp: error_otp }, { where: { number } });
        return { status: "failure", msg: "Incorrect OTP!" };
      }
    } else {
      return { status: "failure", msg: "Supplier Not Exist!" };
    }
  } catch (e) {
    console.log(e);
    return {
      status: "failure",
      msg: catch_error_msg,
    };
  }
};

export const get_bulk_price_refresh_reminders = async (req) => {
  try {
    const supplierId = req.user.supplierId;
    const role = req.user.role;

    if (!supplierId) {
      return { success: false, error: "Supplier ID is required!" };
    }

    if (role !== "SUPPLIER") {
      return { success: false, error: "Unauthorized!" };
    }

    const bulkConfig = await getBulkOrderConfig();
    const refreshDays = bulkConfig?.supplierBulkPriceRefreshDays || null;

    if (!refreshDays) {
      return {
        success: false,
        error: "supplierBulkPriceRefreshDays is not configured",
      };
    }

    const products = await Product.findAll({
      where: { supplier_id: supplierId },
      order: [["updatedAt", "DESC"]],
    });

    const productsWithRefresh = attachBulkPriceRefreshMeta(
      products,
      refreshDays,
    );
    const dueProducts = productsWithRefresh.filter(
      (product) => product.bulkPriceRefresh?.shouldRemind,
    );

    return {
      success: true,
      data: {
        refreshDays,
        count: dueProducts.length,
        products: dueProducts,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const get_submitted_source_requests = async (req) => {
  try {
    const supplierId = req.user.supplierId;
    const role = req.user.role;

    if (!supplierId) {
      return { success: false, error: "Supplier ID is required!" };
    }

    if (role !== "SUPPLIER") {
      return { success: false, error: "Unauthorized!" };
    }

    const requests = await DropshipperSourceRequest.findAll({
      where: { status: "IN_REVIEW" },
      order: [["createdAt", "DESC"]],
    });

    const data = requests.map((request) => {
      const plain = request.toJSON();

      return {
        requestId: plain.request_id,
        productName: plain.product_name,
        productCategory: plain.product_category,
        productImageUrl: plain.product_image_url,
        expectedPrice: plain.expected_price,
        status: plain.status,
        submittedAt: plain.createdAt,
      };
    });

    return {
      success: true,
      data: {
        count: data.length,
        requests: data,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const get_supplier_bulk_orders = async (req) => {
  try {
    const supplierId = req.user.supplierId;
    const role = req.user.role;

    if (!supplierId) {
      return { success: false, error: "Supplier ID is required!" };
    }

    if (role !== "SUPPLIER") {
      return { success: false, error: "Unauthorized!" };
    }

    const orders = await Order.findAll({
      where: {
        supplier_id: supplierId,
        order_type: "BULK",
        payment_status: "VERIFIED",
      },
      order: [["createdAt", "DESC"]],
    });

    const orderIds = orders.map((order) => order.order_id);
    const productIds = [
      ...new Set(orders.map((order) => order.product_id).filter(Boolean)),
    ];
    const payments = orderIds.length
      ? await Payment.findAll({
          where: { order_id: orderIds },
          order: [["created_at", "DESC"]],
        })
      : [];

    const products = productIds.length
      ? await Product.findAll({
          where: { product_id: productIds },
          attributes: ["product_id", "title"],
        })
      : [];

    const productTitleById = new Map(
      products.map((product) => [product.product_id, product.title]),
    );

    const latestPaymentByOrder = new Map();
    for (const payment of payments) {
      if (!latestPaymentByOrder.has(payment.order_id)) {
        latestPaymentByOrder.set(payment.order_id, payment);
      }
    }

    const data = orders.map((order) => {
      const plain = order.toJSON();
      const latestPayment = latestPaymentByOrder.get(plain.order_id);

      return {
        orderId: plain.order_id,
        invoiceNumber: plain.invoice_number,
        productId: plain.product_id,
        productTitle: productTitleById.get(plain.product_id) || null,
        quantity: plain.quantity,
        customerName: plain.customer_name,
        customerPhone: plain.customer_phone,
        customerEmail: plain.user_business_details?.customerEmail || null,
        deliveryAddress: plain.shipping_address,
        unitBulkPrice: plain.unit_bulk_price,
        totalPayable: plain.total_payable,
        supplierPayoutAmount: plain.supplier_payout_amount,
        supplierPayoutStatus: plain.supplier_payout_status,
        orderStatus: plain.order_status,
        paymentStatus: plain.payment_status,
        transactionReference:
          plain.transaction_reference || latestPayment?.transaction_ref || null,
        submittedAt: plain.createdAt,
      };
    });

    return {
      success: true,
      data: {
        count: data.length,
        orders: data,
      },
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const login = async (req, res) => {
  try {
    const { emailOrNumber, password } = req.body;
    console.log(req.body);

    const supplier = await Supplier.findOne({
      where: {
        [Op.or]: [{ email: emailOrNumber }, { number: emailOrNumber }],
      },
    });
    console.log(supplier.password);

    const isMatch = await bcrypt.compare(password, supplier.password);

    if (!isMatch) {
      return { success: false, error: "Invalid Credentials!" };
    }

    // 🔑 Tokens
    const accessToken = jwt.sign(
      { supplierId: supplier.supplier_id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "15m" },
    );

    const refreshToken = jwt.sign(
      { supplierId: supplier.supplier_id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" },
    );

    // 🍪 Cookies
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { success: true, data: supplier };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const logout = async (req, res) => {
  try {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    return { success: true, message: "Logged out successfully" };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const profile = async (req) => {
  try {
    // get supplier id from token
    const { supplierId, role } = req.user;

    console.log(supplierId, role);

    if (!supplierId || !role) {
      return { success: false, error: "Unauthorized" };
    }

    if (role !== "SUPPLIER") {
      return { success: false, error: "Unauthorized" };
    }

    // get supplier details
    const supplier = await Supplier.findOne({
      where: { supplier_id: supplierId },
    });

    // check if supplier exists
    if (!supplier) {
      return { success: false, error: "Supplier not found" };
    }
    return { success: true, data: supplier };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateProfile = async (req) => {
  try {
    const { supplierId, role } = req.user;

    if (role !== "supplier") {
      return { success: false, error: "Unauthorized" };
    }

    const supplier = await Supplier.update(req.body, {
      where: { supplier_id: supplierId },
    });
    return { success: true, data: supplier };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updatePassword = async (req) => {
  try {
    const { supplierId, role } = req.user;

    if (role !== "supplier") {
      return { success: false, error: "Unauthorized" };
    }

    const supplier = await Supplier.update(req.body, {
      where: { supplier_id: supplierId },
    });
    return { success: true, data: supplier };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const add_bank_details = async (req) => {
  try {
    const { supplierId, role } = req.user;

    if (role !== "SUPPLIER") {
      return { success: false, error: "Unauthorized" };
    }

    if (!supplierId) {
      return { success: false, error: "Unauthorized" };
    }

    if (
      !req.body.holderName ||
      !req.body.accountNumber ||
      !req.body.reAccountNumber ||
      !req.body.ifsc
    ) {
      return { success: false, error: "All fields are required!" };
    }

    const { holderName, accountNumber, reAccountNumber, ifsc } = req.body;

    const payload = {
      account_number: accountNumber,
      ifsc_code: ifsc,
      account_holder_name: holderName,
      bank_name: "",
      supplier_id: supplierId,
      branch_name: "",
    };

    // const is_exist = await supplier_bank_details.findOne({ where: { supplier_id: supplierId } });

    console.log(payload);

    const data = await supplier_bank_details.create(payload);
    if (data) {
      return { success: true, data: data };
    } else {
      return { success: false, msg: "Bank Details not added!" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const add_gst_details = async (req) => {
  try {
    const { supplierId, role } = req.user;

    if (role !== "SUPPLIER") {
      return { success: false, error: "Unauthorized" };
    }

    const { gstName, gstNumber, panCardNumber, adharCardNumber } = req.body;
    console.log("");

    if (!gstName || !gstNumber || !panCardNumber) {
      return { success: false, error: "All fields are required!" };
    }

    // const publicPath = `uploads/images/${file.filename}`.replace(/\\/g, "/");

    // Get Files safely
    const gstCertificate = `uploads/images/${req.files?.gstCertificate?.[0]?.filename}`;

    //   req.files?.gstCertificate?.[0]?.path || null;
    //   publicPath;
    const panCardNumberImage = `uploads/images/${req.files?.panCardNumberImage?.[0]?.filename}`;
    const adharCardNumberImage = `uploads/images/${req.files?.adharCardNumberImage?.[0]?.filename}`;

    // const is_exist = await supplier_gst_details.findOne({
    //   where: { supplier_id: supplierId },
    // });

    console.log("gstCertificate", gstCertificate);
    console.log("panCardNumberImage", panCardNumberImage);
    console.log("adharCardNumberImage", adharCardNumberImage);

    const gstPayload = {
      gst_number: gstNumber,
      gst_name: gstName,
      pan_number: panCardNumber,
      andhar_number: adharCardNumber,
      gst_image: `${req.protocol}://${req.get("host")}/${gstCertificate}`,
      pan_image: `${req.protocol}://${req.get("host")}/${panCardNumberImage}`,
      andhar_image: `${req.protocol}://${req.get("host")}/${adharCardNumberImage}`,
      supplier_id: supplierId,
    };

    // return { success: true, data:  gstPayload};

    // if (is_exist) {
    //   return res.json({ success: false, msg: "GST Details exist!" });
    // }

    const data = await supplier_gst_details.create(gstPayload);

    await supplier_gst_details.update(
      { gst_validity: new Date(), gst_details_status: true },
      { where: { supplier_id: supplierId } },
    );

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAllSupplier = async () => {
  try {
    const result = await Supplier.findAll();
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const add_products = async (req) => {
  const transaction = await sequelize.transaction();

  try {
    const { supplierId, role } = req.user || {};

    /**
     * AUTH VALIDATION
     */
    if (!supplierId || role !== "SUPPLIER") {
      await transaction.rollback();
      return {
        success: false,
        error: "Unauthorized - Only suppliers can add products",
      };
    }

    let { title, description, brand, approval_status, options, variants } =
      req.body;
    const categoryId = req.body.category_id ?? req.body.categoryId;

    options = parseJSONField(options, [], "options");
    variants = parseJSONField(variants, [], "variants");

    /**
     * CATEGORY VALIDATION (when provided)
     */
    if (categoryId != null && categoryId !== "") {
      const category = await Category.findOne({
        where: { id: categoryId, is_active: true },
      });
      if (!category) {
        await transaction.rollback();
        return {
          success: false,
          error:
            "Invalid or inactive category. Please choose an active category.",
        };
      }
    }

    /**
     * BASIC VALIDATION
     */
    if (!title || !description || !brand || !approval_status) {
      await transaction.rollback();
      return {
        success: false,
        error: "title, description, brand, approval_status are required",
      };
    }

    if (!Array.isArray(variants) || variants.length === 0) {
      await transaction.rollback();
      return {
        success: false,
        error: "At least one variant is required",
      };
    }

    if (title.length > 100) {
      await transaction.rollback();
      return {
        success: false,
        error: "Title must be less than 100 characters",
      };
    }

    if (description.length > 10000) {
      await transaction.rollback();
      return {
        success: false,
        error: "Description too long",
      };
    }

    /**
     * CREATE PRODUCT
     */

    // Create product with all relevant fields
    const product = await Product.create(
      {
        supplier_id: supplierId,
        title,
        description,
        brand,
        approval_status,
        category_id: categoryId || null,
        mrp: req.body.mrp,
        bulk_price: req.body.bulk_price,
        transfer_price: req.body.transfer_price,
        gst_rate: req.body.gst_rate,
        minimum_order_quantity: req.body.minimum_order_quantity,
        bulk_price_refresh_days: req.body.bulk_price_refresh_days,
      },
      { transaction },
    );

    const productId = product.product_id;

    /**
     * SAVE PRODUCT IMAGES
     */
    let imagesCount = 0;
    if (req.files && req.files.length) {
      const imagesPayload = req.files.map((file, index) => ({
        product_id: productId,
        image_url: `https://${req.get("host")}/uploads/images/${file.filename}`,
        sort_order: index,
      }));
      await ProductImage.bulkCreate(imagesPayload, { transaction });
      imagesCount = imagesPayload.length;
    }

    /**
     * CREATE PRODUCT OPTIONS
     */
    const optionMap = {};
    let optionsCount = 0;

    if (Array.isArray(options) && options.length > 0) {
      for (const option of options) {
        if (!option.name) {
          throw new Error("Option name is required");
        }

        const createdOption = await ProductOption.create(
          {
            product_id: productId,
            name: option.name,
            position: option.position || 1,
          },
          { transaction },
        );

        optionMap[option.name] = createdOption.option_id;

        optionsCount++;

        /**
         * CREATE OPTION VALUES
         */
        if (Array.isArray(option.values) && option.values.length > 0) {
          const valuesPayload = option.values.map((value) => ({
            option_id: createdOption.option_id,
            value,
          }));

          await ProductOptionValue.bulkCreate(valuesPayload, {
            transaction,
          });
        }
      }
    }

    /**
     * CREATE VARIANTS
     */
    const createdVariants = [];

    for (const variant of variants) {
      if (!variant.sku) {
        throw new Error("Variant SKU is required");
      }

      const variantPrice =
        variant.price !== undefined ? variant.price : variant.variant_price;
      const inventoryQuantity =
        variant.inventory_quantity !== undefined
          ? variant.inventory_quantity
          : (variant.variant_stock ?? 0);
      const dimensionCm = normalizeDimensionCm(variant);
      const dimensionValidation = validateDimensionCm(dimensionCm);

      if (variantPrice === undefined || variantPrice === null) {
        throw new Error("Variant price is required");
      }

      if (dimensionCm === undefined || dimensionCm === null) {
        throw new Error("dimension_cm is required for each variant");
      }

      if (!dimensionValidation.isValid) {
        throw new Error(dimensionValidation.error);
      }

      const existingSku = await ProductVariant.findOne({
        where: { sku: variant.sku },
      });

      if (existingSku) {
        throw new Error(`SKU already exists: ${variant.sku}`);
      }

      const variantRecord = await ProductVariant.create(
        {
          product_id: productId,
          sku: variant.sku,
          title: variant.title ?? variant.variant_name,
          price: variantPrice,
          compare_at_price: variant.compare_at_price,
          inventory_quantity: inventoryQuantity,
          weight_grams: variant.weight_grams,
          option1: variant.option1,
          option2: variant.option2,
          option3: variant.option3,
          attributes: variant.attributes || {},
          dimension_cm: dimensionCm,
        },
        { transaction },
      );

      /**
       * INVENTORY RECORD
       */
      await Inventory.create(
        {
          product_id: productId,
          variant_id: variantRecord.variant_id,
          sku: variant.sku,
          available_stock: inventoryQuantity,
        },
        { transaction },
      );

      createdVariants.push(variantRecord);
    }

    /**
     * COMMIT TRANSACTION
     */
    await transaction.commit();

    // Fetch full product details with associations
    const fullProduct = await Product.findOne({
      where: { product_id: productId },
      include: [
        { model: ProductVariant, as: "variants" },
        { model: ProductImage, as: "images" },
      ],
      attributes: {
        include: [
          [
            sequelize.literal(
              `(SELECT COUNT(*) FROM product_images WHERE product_images.product_id = products.product_id)`
            ),
            "imageCount",
          ],
        ],
      },
    });

    // Attach bulk price refresh meta if needed
    const bulkConfig = await getBulkOrderConfig();
    const refreshDays = bulkConfig?.supplierBulkPriceRefreshDays || null;
    const [productWithRefresh] = attachBulkPriceRefreshMeta([fullProduct], refreshDays);

    return {
      success: true,
      message: "Product created successfully",
      data: productWithRefresh,
    };
  } catch (error) {
    await transaction.rollback();

    console.error("Add product error:", error);

    return {
      success: false,
      error: error.message || "Failed to create product",
    };
  }
};

export const get_products = async (req) => {
  try {
    const bulkConfig = await getBulkOrderConfig();
    const refreshDays = bulkConfig?.supplierBulkPriceRefreshDays || null;

    const products = await Product.findAll({
      where: { supplier_id: req.user.supplierId },
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
      attributes: {
        include: [
          [
            sequelize.literal(
              `(SELECT COUNT(*) FROM product_images WHERE product_images.product_id = products.product_id)`,
            ),
            "imageCount",
          ],
        ],
      },
    });

    // const productImages = await ProductImage.findAll({
    //     where: {product_id: products.map(product => product.product_id)}
    // });

    // const productVariants = await ProductVariant.findAll({
    //     where: {product_id: products.map(product => product.product_id)}
    // });

    // const inventory = await Inventory.findAll({
    //     where: {product_id: products.map(product => product.product_id)}
    // });

    return {
      success: true,
      data: {
        products: attachBulkPriceRefreshMeta(products, refreshDays),
      },
    };
  } catch (error) {
    console.error("[v0] Get products error:", error);
    return { success: false, error: error.message || "Failed to get products" };
  }
};

export const update_product = async (req) => {
  const t = await sequelize.transaction();
  try {
    const product_id = req.params.product_id;
    const supplier_id = req.user.supplierId;
    const role = req.user.role;

    if (!supplier_id) {
      return { success: false, error: "Supplier ID is required!" };
    }

    if (role !== "SUPPLIER") {
      return { success: false, error: "Unauthorized!" };
    }

    if (!product_id) {
      return { success: false, error: "Product ID is required!" };
    }

    const {
      title,
      description,
      brand,
      images = [],
      category_id: bodyCategoryId,
    } = req.body;
    const categoryId = bodyCategoryId ?? req.body.categoryId;
    const variants = parseJSONField(req.body.variants, [], "variants");

    const product = await Product.findByPk(product_id);

    if (!product) {
      return { success: false, error: "Product not found!" };
    }

    if (categoryId != null && categoryId !== "") {
      const category = await Category.findOne({
        where: { id: categoryId, is_active: true },
      });
      if (!category) {
        return {
          success: false,
          error:
            "Invalid or inactive category. Please choose an active category.",
        };
      }
    }

    const updatePayload = { title, description, brand };
    if (categoryId !== undefined)
      updatePayload.category_id = categoryId || null;
    await product.update(updatePayload);

    if (req.body.bulk_price !== undefined && req.body.bulk_price !== product.bulk_price) {
      updatePayload.bulk_price = req.body.bulk_price;
      updatePayload.bulk_price_updated_at = new Date();
      updatePayload.bulk_price_last_reminded_at = null;
    }

    if (req.body.transfer_price !== undefined) {
      updatePayload.transfer_price = req.body.transfer_price;
    }

    if (req.body.mrp !== undefined) {
      updatePayload.mrp = req.body.mrp;
    }

    if (req.body.gst_rate !== undefined) {
      updatePayload.gst_rate = req.body.gst_rate;
    }

    if (req.body.minimum_order_quantity !== undefined) {
      updatePayload.minimum_order_quantity = req.body.minimum_order_quantity;
    }

    if (req.body.bulk_price_refresh_days !== undefined) {
      updatePayload.bulk_price_refresh_days = req.body.bulk_price_refresh_days;
    }

    await product.update(updatePayload);

    for (const variant of variants) {
      if (!variant?.variant_id) {
        continue;
      }

      const dimensionCm = normalizeDimensionCm(variant);
      const dimensionValidation = validateDimensionCm(dimensionCm);
      if (!dimensionValidation.isValid) {
        throw new Error(dimensionValidation.error);
      }

      const updateVariantPayload = {
        sku: variant.sku,
        title: variant.title ?? variant.variant_name,
        price:
          variant.price !== undefined ? variant.price : variant.variant_price,
        compare_at_price: variant.compare_at_price,
        cost_price: variant.cost_price,
        inventory_quantity:
          variant.inventory_quantity !== undefined
            ? variant.inventory_quantity
            : variant.variant_stock,
        inventory_management: variant.inventory_management,
        weight_grams: variant.weight_grams,
        option1: variant.option1,
        option2: variant.option2,
        option3: variant.option3,
        shopify_variant_id: variant.shopify_variant_id,
        attributes: variant.attributes,
        is_active: variant.is_active,
      };

      if (dimensionCm !== undefined) {
        updateVariantPayload.dimension_cm = dimensionCm;
      }

      const cleanPayload = Object.fromEntries(
        Object.entries(updateVariantPayload).filter(
          ([, val]) => val !== undefined,
        ),
      );

      if (Object.keys(cleanPayload).length > 0) {
        await ProductVariant.update(cleanPayload, {
          where: { variant_id: variant.variant_id, product_id },
          transaction: t,
        });
      }

      if (cleanPayload.inventory_quantity !== undefined) {
        await Inventory.update(
          { available_stock: cleanPayload.inventory_quantity },
          {
            where: { variant_id: variant.variant_id, product_id },
            transaction: t,
          },
        );
      }
    }

    await t.commit();
    return { success: true, data: product };
  } catch (error) {
    console.error("[v0] Update product error:", error);
    await t.rollback();
    return {
      success: false,
      error: error.message || "Failed to update product",
    };
  }
};

export const get_single_product = async (req) => {
  try {
    const bulkConfig = await getBulkOrderConfig();
    const refreshDays = bulkConfig?.supplierBulkPriceRefreshDays || null;

    const supplier_id = req.user.supplierId;
    const role = req.user.role;
    const product_id = req.params.product_id;

    if (!product_id) {
      return { success: false, error: "Product ID is required!" };
    }

    if (!supplier_id) {
      return { success: false, error: "Supplier ID is required!" };
    }

    if (role !== "SUPPLIER") {
      return { success: false, error: "Unauthorized!" };
    }

    const product = await Product.findOne({
      where: { product_id, supplier_id },
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
      attributes: {
        include: [
          [
            sequelize.literal(
              `(SELECT COUNT(*) FROM product_images WHERE product_images.product_id = products.product_id)`,
            ),
            "imageCount",
          ],
        ],
      },
    });
    if (product) {
      const [productWithRefresh] = attachBulkPriceRefreshMeta(
        [product],
        refreshDays,
      );
      return { success: true, data: productWithRefresh };
    } else {
      return { success: false, error: "Product not found!" };
    }
  } catch (error) {
    console.error("[v0] Get single product error:", error);
    return {
      success: false,
      error: error.message || "Failed to get single product",
    };
  }
};

export const add_product_variants = async (req) => {
  const t = await sequelize.transaction();
  try {
    const product_id = req.params.product_id;
    const supplierId = req.user?.supplierId;
    const role = req.user?.role;

    if (!supplierId || role !== "SUPPLIER") {
      await t.rollback();
      return { success: false, error: "Unauthorized!" };
    }

    const sku = req.body.sku;
    const title = req.body.title ?? req.body.variant_name;
    const price =
      req.body.price !== undefined ? req.body.price : req.body.variant_price;
    const inventoryQuantity =
      req.body.inventory_quantity !== undefined
        ? req.body.inventory_quantity
        : req.body.variant_stock;
    const dimensionCm = normalizeDimensionCm(req.body);
    const dimensionValidation = validateDimensionCm(dimensionCm);

    if (
      !product_id ||
      !sku ||
      price === undefined ||
      inventoryQuantity === undefined
    ) {
      await t.rollback();
      return {
        success: false,
        error: "product_id, sku, price, inventory_quantity are required",
      };
    }

    if (dimensionCm === undefined || dimensionCm === null) {
      await t.rollback();
      return { success: false, error: "dimension_cm is required" };
    }

    if (!dimensionValidation.isValid) {
      await t.rollback();
      return { success: false, error: dimensionValidation.error };
    }

    const product = await Product.findOne({
      where: { product_id, supplier_id: supplierId },
      transaction: t,
    });

    if (!product) {
      await t.rollback();
      return { success: false, error: "Product not found!" };
    }

    const existingSku = await ProductVariant.findOne({
      where: { sku },
      transaction: t,
    });

    if (existingSku) {
      await t.rollback();
      return { success: false, error: `SKU already exists: ${sku}` };
    }

    const data = await ProductVariant.create(
      {
        product_id,
        sku,
        title,
        price,
        compare_at_price: req.body.compare_at_price,
        cost_price: req.body.cost_price,
        inventory_quantity: inventoryQuantity,
        inventory_management: req.body.inventory_management,
        weight_grams: req.body.weight_grams,
        option1: req.body.option1,
        option2: req.body.option2,
        option3: req.body.option3,
        shopify_variant_id: req.body.shopify_variant_id,
        attributes: req.body.attributes || {},
        is_active: req.body.is_active,
        dimension_cm: dimensionCm,
      },
      { transaction: t },
    );

    await Inventory.create(
      {
        product_id,
        variant_id: data.variant_id,
        sku,
        available_stock: inventoryQuantity,
      },
      { transaction: t },
    );

    await t.commit();

    if (data) {
      return { success: true, data: data };
    } else {
      return { success: false, msg: "Product Variant not added!" };
    }
  } catch (error) {
    await t.rollback();
    return { success: false, error: error.message };
  }
};

export const add_product_images = async (req) => {
  try {
    const { variant_id } = req.params;

    if (!variant_id) {
      return { success: false, error: "variant_id is required" };
    }

    if (!req.files || req.files.length === 0) {
      return { success: false, error: "No images uploaded" };
    }

    // Build image records
    const imagesPayload = req.files.map((file, index) => {
      const publicPath = `uploads/images/${file.filename}`.replace(/\\/g, "/");

      return {
        variant_id,
        image_url: `${req.protocol}://${req.get("host")}/${publicPath}`,
        sort_order: index,
      };
    });

    await ProductImage.bulkCreate(imagesPayload);

    return {
      success: true,
      data: imagesPayload,
    };
  } catch (error) {
    console.error(error);
    return { success: false, error: error.message };
  }
};

export const get_gst_details = async (req) => {
  try {
    const { supplierId, role } = req.user;

    if (role !== "SUPPLIER") {
      return { success: false, error: "Unauthorized!" };
    }

    if (!supplierId) {
      return { success: false, error: "supplier_id is required" };
    }

    const data = await supplier_gst_details.findOne({
      where: { supplier_id: supplierId },
    });
    if (data) {
      return { success: true, data: data };
    } else {
      return { success: false, msg: "GST Details not found!" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const create_warehouse = async (req) => {
  try {
    const { supplier_id, name, address, city, state, pincode } = req.body;
    const data = await Warehouse.create({
      supplier_id,
      name,
      address,
      city,
      state,
      pincode,
    });
    if (data) {
      return { success: true, data: data };
    } else {
      return { success: false, msg: "Warehouse not added!" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const update_warehouse = async (req) => {
  try {
    const { warehouse_id } = req.params;
    const { name, address, city, state, pincode } = req.body;
    // fetch data updated
    const data = await Warehouse.updateandFetch(
      { name, address, city, state, pincode },
      { where: { warehouse_id } },
    );
    if (data) {
      return { success: true, data: data };
    } else {
      return { success: false, msg: "Warehouse not updated!" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const get_warehouse = async (req) => {
  try {
    const { warehouse_id } = req.params;
    const data = await Warehouse.findAll({ where: { warehouse_id } });
    if (data) {
      return { success: true, data: data };
    } else {
      return { success: false, msg: "Warehouse not found!" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const delete_warehouse = async (req) => {
  try {
    const { warehouse_id } = req.params;
    // soft delete
    const data = await Warehouse.update(
      { is_active: false },
      { where: { warehouse_id } },
    );
    if (data) {
      return { success: true, data: data };
    } else {
      return { success: false, msg: "Warehouse not deleted!" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const create_inventory = async (req) => {
  try {
    const { sku, warehouse_id, available_stock, reserved_stock } = req.body;
    const data = await Inventory.create({
      sku,
      warehouse_id,
      available_stock,
      reserved_stock,
    });
    if (data) {
      return { success: true, data: data };
    } else {
      return { success: false, msg: "Inventory not added!" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const update_inventory_stock = async (req) => {
  const t = await sequelize.transaction();
  console.log("transaction", req.body);
  try {
    const { sku } = req.params;
    const { quantity, action } = req.body;
    const { supplierId, role } = req.user;

    if (!sku) throw new Error("SKU is required");
    if (!supplierId) throw new Error("supplier_id is required");
    if (role !== "SUPPLIER") throw new Error("Unauthorized!");
    if (!quantity || quantity <= 0) throw new Error("Quantity must be > 0");
    if (!["add", "deduct"].includes(action)) throw new Error("Invalid action");

    const inventory = await Inventory.findOne({
      where: { sku },
      transaction: t,
      lock: t.LOCK.UPDATE, // 🔒 prevents race conditions
    });

    if (!inventory) throw new Error("Inventory not found");

    const variant = await ProductVariant.findOne({
      where: { sku: inventory.sku },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!variant) throw new Error("Variant not found");

    if (action === "deduct" && inventory.available_stock < quantity) {
      throw new Error("Not enough stock!");
    }

    if (action === "add") {
      inventory.available_stock += quantity;
      variant.inventory_quantity += quantity;
    } else {
      inventory.available_stock -= quantity;
      variant.inventory_quantity -= quantity;
    }

    await inventory.save({ transaction: t });
    await variant.save({ transaction: t });

    await t.commit();

    return { success: true, msg: "Inventory updated successfully!" };
  } catch (error) {
    if (!t.finished) {
      await t.rollback();
    }

    return { success: false, error: error.message };
  }
};

export const get_inventory = async (req) => {
  try {
    const { sku } = req.params;
    const data = await Inventory.findAll({ where: { sku } });
    if (data) {
      return { success: true, data: data };
    } else {
      return { success: false, msg: "Inventory not found!" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const delete_inventory = async (req) => {
  try {
    const { sku } = req.params;
    // soft delete
    const data = await Inventory.update(
      { is_active: false },
      { where: { sku } },
    );
    if (data) {
      return { success: true, data: data };
    } else {
      return { success: false, msg: "Inventory not deleted!" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const get_inventory_by_filter = async (req) => {
  try {
    const { filter } = req.query;
    console.log(filter);
    //in-stock(> 0)
    //out-of-stock(= 0)
    //Inactive(is_active = false)
    //All
    //search sku
    //low stock(< 10)
    const filterData = {
      is_active: true,
    };
    if (filter === "in-stock") {
      filterData.available_stock = { [Op.gt]: 0 };
    } else if (filter === "out-of-stock") {
      filterData.available_stock = { [Op.eq]: 0 };
    } else if (filter === "inactive") {
      filterData.is_active = false;
    } else if (filter === "all") {
      filterData.is_active = true;
    }

    if (req.query.search) {
      filterData.sku = { [Op.like]: `%${req.query.search}%` };
    }
    if (req.query.low_stock) {
      filterData.available_stock = { [Op.lt]: 10 };
    }
    console.log(filterData);
    const data = await Inventory.findAll({ where: filterData });
    if (data) {
      return { success: true, data: data };
    } else {
      return { success: false, msg: "Inventory not found!" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updatePersonalDetails = async (req) => {
  try {
    console.log("JWT Data:", req.user);

    // For all users
    const { supplierId, role } = req.user;
    const { phoneNumber, storeName, storeEmail } = req.body;

    console.log("Supplier ID:", supplierId);
    console.log("Role:", role);
    console.log("Phone Number:", phoneNumber);
    console.log("Store Name:", storeName);
    console.log("Store Email:", storeEmail);

    // For suppliers only
    // const { phoneNumber, storeName, storeEmail } = req.user;

    if (role === "SUPPLIER" && supplierId) {
      // const [updatedRows] = await Supplier.update(req.body, {
      //     where: { supplier_id: supplierId }
      // });

      const supplier = await Supplier.findOne({
        where: { supplier_id: supplierId },
      });

      if (!supplier) {
        return { success: false, msg: "Supplier not found!" };
      }

      supplier.number = phoneNumber;
      supplier.name = storeName;
      supplier.email = storeEmail;

      const updatedSupplier = await supplier.save();

      return { success: true, data: updatedSupplier };
    }

    return { success: false, error: "Not a supplier" };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

//bank details
export const get_bank_account_details = async (req) => {
  try {
    const { supplierId, role } = req.user;
    if (role !== "SUPPLIER") {
      return { success: false, error: "Not a supplier" };
    }

    if (!supplierId) {
      return { success: false, error: "Supplier ID is required" };
    }
    const bankDetails = await supplier_bank_details.findOne({
      where: { supplier_id: supplierId },
    });
    if (!bankDetails) {
      return { success: false, msg: "Bank details not found!" };
    }
    return { success: true, data: bankDetails };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const update_bank_details = async (req) => {
  try {
    const { supplierId, role } = req.user;

    // for supplier only
    if (role !== "SUPPLIER") {
      return { success: false, error: "Not a supplier" };
    }

    const { accountNumber, ifsc, holderName } = req.body;
    console.log("hello");

    if (!supplierId) {
      return { success: false, error: "Supplier ID is required" };
    }
    const bankDetails = await supplier_bank_details.findOne({
      where: { supplier_id: supplierId },
    });
    if (!bankDetails) {
      return { success: false, msg: "Bank details not found!" };
    }
    bankDetails.account_number = accountNumber;
    bankDetails.ifsc_code = ifsc;
    bankDetails.account_holder_name = holderName;
    await bankDetails.save();

    return { success: true, data: bankDetails };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
