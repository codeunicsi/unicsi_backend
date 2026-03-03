import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const auth = (req, res, next) => {
  let token = null;

  // 1️⃣ First check Authorization header
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    token = header.slice(7);
  }

  // 2️⃣ If not found, check cookies
  if (!token && req.cookies?.access_token) {
    token = req.cookies.access_token;
  }

  console.log("token", req.cookies?.access_token);

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (e) {
    return res.status(401).json({ message: e.message });
  }
};

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
