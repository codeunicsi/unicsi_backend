import {
  ShopifyStore,
  User,
  Product,
  ProductVariant,
  ProductImage,
  reseller_bank_details,
  reseller_gst_details,
} from "../models/index.js";
import crypto from "crypto";
import axios from "axios";

const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const SCOPES = process.env.SHOPIFY_SCOPES;
const REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI;

class DropshipperController {
  userPhoneColumnExists = null;

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

      const {
        holderName,
        accountNumber,
        reAccountNumber,
        ifsc,
        bankName,
        branchName,
      } = req.body;

      // reAccountNumber cross-check (format already validated by middleware)
      if (reAccountNumber && reAccountNumber !== accountNumber) {
        return res.status(400).json({
          success: false,
          error: "Account number and reAccountNumber must match",
        });
      }

      const existingDetails = await reseller_bank_details.findOne({
        where: { user_id: user.user_id },
      });

      const bankProofUrl = this.buildFileUrl(req, "bankDetailProof");
      const payload = {
        user_id: user.user_id,
        account_holder_name: holderName,
        account_number: accountNumber,
        ifsc_code: ifsc,
        bank_name: bankName || existingDetails?.bank_name || null,
        branch_name: branchName || existingDetails?.branch_name || null,
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
        data,
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
        data,
        user_id: user.user_id,
        store_id: user.user_id,
      });
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

      const { gstName, gstNumber, panCardNumber } = req.body;
      // required-field and format checks are handled by validate(gstDetailsRules) middleware

      const existingDetails = await reseller_gst_details.findOne({
        where: { user_id: user.user_id },
      });

      const gstImage = this.buildFileUrl(req, "gstCertificate");
      const panImage = this.buildFileUrl(req, "panCardNumberImage");

      const payload = {
        user_id: user.user_id,
        gst_name: gstName,
        gst_number: gstNumber,
        pan_number: panCardNumber,
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
        data,
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
        data,
        user_id: user.user_id,
        store_id: user.user_id,
      });
    } catch (error) {
      console.error(error);
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

      const productRes = await axios.post(
        `https://${shop}/admin/api/2026-01/products.json`,
        productData,
        {
          headers: {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json",
          },
        },
      );

      return res.json(productRes.data);
    } catch (error) {
      console.error(error.response?.data || error);
      res.status(500).send("Failed to push product to Shopify");
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
}

export default new DropshipperController();
