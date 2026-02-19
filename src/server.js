// Import dependencies and configuration
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize, { connectDB } from "./config/database.js";
import path from "path";
import { fileURLToPath } from "url";
import('../src/config/association.js')
import cookieParser from "cookie-parser";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import all routes
import routes from "./routes/index.js";

// Import models so Sequelize is aware of them
import User from "./models/User.js";
import OTP from "./models/OTP.js"; // NEW: include OTP model

// Initialize environment variables
dotenv.config();

// Initialize Express app
const app = express();

/* FIXED CORS CONFIGURATION:
   - Al
   lows frontend from localhost:5173 (Vite dev)
   - Allows deployed frontend from unicse.pages.dev (production)
   
*/


app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL1,
      process.env.FRONTEND_URL2, 
      process.env.FRONTEND_URL3,

    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// Enable JSON parsing for incoming requests
app.use(express.json());
app.use(cookieParser());

// Connect to PostgreSQL Database
connectDB();

// Sync models with the database
// `alter: true` updates tables automatically when models change
sequelize
  .sync({ alter: true })
  .then(() => console.log("✅ Models synced with database"))
  .catch((err) => console.error("❌ Error syncing models:", err.message));

// Mount routes (handles all /api/auth/... and other endpoints)
app.use("/api/v1/", routes);
app.use("/uploads", express.static("uploads"));

// Basic test route
app.get("/health", (req, res) => {
    res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Unicsi Backend API',
  })
});

//not found route
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  })
})

//error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  })
})

// Start Express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
