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
      const { shop, code, state, hmac, ...rest } = req.query;

      const stateStore = req.session?.state;

      if (!stateStore || stateStore !== state) {
        return res.status(400).send("Invalid state");
      }

      const message = Object.keys(rest)
        .sort()
        .map(key => `${key}=${rest[key]}`)
        .join("&");

      const generatedHash = crypto
        .createHmac("sha256", API_SECRET)
        .update(message)
        .digest("hex");

      if (generatedHash !== hmac) {
        return res.status(400).send("HMAC validation failed");
      }

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
        shop_name: shop,
        access_token,
        scope,
      });

      res.redirect(`${process.env.FRONTEND_URL2}/partner/connect/success`);

    } catch (error) {
      console.error(error.response?.data || error);
      res.status(500).send("Shopify connection failed");
    }
  };

}

export default new DropshipperController();