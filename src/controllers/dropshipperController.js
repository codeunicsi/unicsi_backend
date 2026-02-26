import { ShopifyStore } from '../models/index.js'
import crypto from "crypto";
import axios from "axios";

const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const SCOPES = process.env.SHOPIFY_SCOPES;
const REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI;

class DropshipperController {



  // connect shopify
  connectShopify = async (req, res) => {
    try {
      const { shop } = req.query;

      if (!shop || !shop.endsWith(".myshopify.com")) {
        return res.status(400).json({ error: "Invalid shop domain" });
      }

      const state = crypto.randomBytes(16).toString("hex");

      req.session.state = state;

      const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${API_KEY}&scope=${encodeURIComponent(
        SCOPES
      )}&redirect_uri=${encodeURIComponent(
        REDIRECT_URI
      )}&state=${state}`;

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
        .map(key => `${key}=${Array.isArray(query[key]) ? query[key].join(',') : query[key]}`)
        .join('&');

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

      const { shop, code } = query;

      const tokenRes = await axios.post(
        `https://${shop}/admin/oauth/access_token`,
        {
          client_id: API_KEY,
          client_secret: API_SECRET,
          code,
        }
      );

      const { access_token, scope } = tokenRes.data;

      await ShopifyStore.upsert({
        store_name: shop,
        store_url: `https://${shop}`,
        access_token,
        scope,
        installed_at: new Date(),
        is_active: true
      }, {
        conflictFields: ['store_name']
      });

      res.redirect(`${process.env.FRONTEND_URL2}/partner/connect/success`);

    } catch (error) {
      console.error(error.response?.data || error);
      res.status(500).send("Shopify connection failed");
    }
  };

  pushProductToShopify = async (req, res) => {
    try {
      const { shop, access_token, productData } = req.body;
      console.log("shop", shop)
      console.log("accessToken", access_token)

      const productRes = await axios.post(
        `https://${shop}/admin/api/2026-01/products.json`,
        productData,
        {
          headers: {
            "X-Shopify-Access-Token": access_token,
            "Content-Type": "application/json"
          }
        }
      );

      return res.json(productRes.data);

    } catch (error) {
      console.error(error.response?.data || error);
      res.status(500).send("Failed to push product to Shopify");
    }
  };

}

export default new DropshipperController();