import { Sequelize } from "sequelize";
import dotenv from "dotenv";
import fs from "fs";



dotenv.config();
const sslValue = fs.readFileSync("./ca.pem");

// console.log("sslValue", sslValue)

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    port: process.env.DB_PORT,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Render requires this to avoid self-signed certificate errors
        ca: sslValue,
      },
    },
    logging: false,
  }
);

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ PostgreSQL connected successfully!");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

export default sequelize;
