import express from "express";
import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";
import {
  signup,
  login,
  sendOtpHandler,
  verifyOtpHandler,
  logout,
} from "../controllers/authController.js";
import { auth } from "../middlewares/auth.js";
import { User } from "../models/User.js";


dotenv.config();
const router = express.Router();

const API_KEY = process.env.SHOPIFY_API_KEY;
const API_SECRET = process.env.SHOPIFY_API_SECRET;
const SCOPES = process.env.SHOPIFY_SCOPES;
const REDIRECT_URI = process.env.SHOPIFY_REDIRECT_URI;

let storeSessions = {}; // replace with DB in production

/**
 * Route: POST /api/auth/send-otp
 * Purpose: Sends OTP to the provided email
 */
router.post("/send-otp", sendOtpHandler);

/**
 * Route: POST /api/auth/verify-otp
 * Purpose: Verifies OTP before allowing signup
 */
router.post("/verify-otp", verifyOtpHandler);

/**
 * Route: POST /api/auth/signup
 * Purpose: Creates new user after OTP verification
 */
router.post("/signup", signup);

/**
 * Route: POST /api/auth/login
 * Purpose: Authenticates user and returns JWT token
 */
router.post("/login", login);

router.post("/logout", logout);

router.get("/me", auth, async (req, res) => {
  console.log(req.user)
   const userDetails = await User.findOne({where: {user_id: req.user.userId}});
    res.json({success: true, message: "User details fetched successfully", data: userDetails});
})

export default router;
