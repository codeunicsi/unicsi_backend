import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendOTP, verifyOTP } from "../services/otpService.js";
import { User } from "../models/User.js";
import { Supplier } from "../models/index.js";
import { SupplierKyc } from "../models/index.js";

/**
 * Step 1: Send OTP to a user's email for verification
 */
export const sendOtpHandler = async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email using regex pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Send OTP using service
    await sendOTP(email);

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("OTP Send Error:", error);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};

/**
 * Step 2: Verify OTP sent to email
 */
export const verifyOtpHandler = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validate the OTP using service
    const valid = await verifyOTP(email, otp);
    if (!valid) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    return res.status(200).json({ message: "OTP verified successfully" });
  } catch (error) {
    console.error("OTP Verification Error:", error);
    return res.status(500).json({ message: "Failed to verify OTP" });
  }
};

/**
 * Step 3: User Signup (only after OTP verified)
 */
export const signup = async (req, res) => {
  try {
    const { name, email, password, role, otpVerified } = req.body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // ✅ Step 1: Check if frontend confirmed OTP verification
    if(role === "SUPPLIER"){
      if (!otpVerified) {
        return res
          .status(400)
          .json({ message: "Email not verified or invalid OTP" });
      }
    }

    // ✅ Step 2: Ensure email not already used
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // ✅ Step 3: Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Step 4: Create new user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    if (role === "SUPPLIER") {
      const supplier = await Supplier.create({
        name: name,
        email: email,
        password: hashedPassword,
        account_status: "pending",
      });

      await SupplierKyc.create({
        supplier_id: supplier.supplier_id,
      });
    }

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Step 4: User Login (existing flow)
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    let supplier = null;
    let payload = { role: user.role };

    if (user.role === "SUPPLIER") {
      supplier = await Supplier.findOne({ where: { email } });
      payload.supplierId = supplier.supplier_id;
    }

    if (user.role === "ADMIN") {
      payload.userId = user.user_id;
    }

    if (user.role === "RESELLER") {
      payload.userId = user.user_id;
    }

    const accessToken = jwt.sign(
      payload,
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "7d" }
    );

    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // const cookieOptions = {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    //   sameSite: "lax",
    //   domain: ".unicsi.com",   // ⭐⭐⭐ MUST ADD
    //   path: "/"
    // };

    // const cookieOptions = {
    //   httpOnly: true,
    //   secure: true,
    //   sameSite: "none",
    //   domain: "localhost",
    //   path: "/"
    // };

    const isProd = process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true,
      secure: isProd,                 // true only in HTTPS
      sameSite: isProd ? "none" : "lax",
      path: "/",
    };

    // Only set domain in production
    if (isProd) {
      cookieOptions.domain = ".unicsi.com";
    }


    // 🍪 Set access_token cookie
    res.cookie("access_token", accessToken, cookieOptions,
      {
        maxAge: 7 * 24 * 60 * 60 * 1000
      }
    );

    // 🍪 Set refresh_token cookie
    res.cookie("refresh_token", refreshToken, cookieOptions,
      {
        maxAge: 7 * 24 * 60 * 60 * 1000
      }
    );

    // ⭐ ADD THIS: Set user_role cookie
    res.cookie("user_role", user.role.toLowerCase(), cookieOptions,
      {
        maxAge: 7 * 24 * 60 * 60 * 1000
      }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token: accessToken,
      refreshToken: refreshToken,
      data: {
        id: user.user_id,
        supplier_id: user.role === "SUPPLIER" ? supplier.supplier_id : null,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


export const logout = async (req, res) => {
  try {
    const isProd = process.env.NODE_ENV === "production";

    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      domain: isProd ? ".unicsi.com" : "localhost"
    };

    res.clearCookie("access_token", cookieOptions);
    res.clearCookie("refresh_token", cookieOptions);
    res.clearCookie("user_role", cookieOptions);

    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};




