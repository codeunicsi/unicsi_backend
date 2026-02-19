import express from "express";
import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const SCOPES = process.env.SHOPIFY_SCOPES;
const REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI;

let storeSessions = {}; // replace with DB in production

// ============================================
// STEP 1: Redirect user to Shopify install
// ============================================
router.get("/auth/shopify", async (req, res) => {
  const { shop } = req.query;

  if (!shop) return res.send("Shop parameter missing");

  const state = crypto.randomBytes(16).toString("hex");

  const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${API_KEY}&scope=${SCOPES}&redirect_uri=${REDIRECT_URI}&state=${state}`;

  res.redirect(installUrl);
});


// ============================================
// STEP 2: Callback from Shopify
// ============================================
router.get("/auth/shopify/callback", async (req, res) => {
  try {
    const { shop, code } = req.query;

    if (!shop || !code) return res.send("Missing shop or code");

    // exchange code for access token
    const response = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: API_KEY,
        client_secret: API_SECRET,
        code,
      }
    );

    const accessToken = response.data.access_token;

    // save in DB (important)
    storeSessions[shop] = accessToken;

    console.log("✅ Store Connected:", shop);
    console.log("🔑 Token:", accessToken);

    res.send("Shopify store connected successfully 🎉");

  } catch (error) {
    console.log(error.response?.data || error.message);
    res.send("Error connecting store");
  }
});

export default router;
