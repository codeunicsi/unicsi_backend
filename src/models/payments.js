import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const Payment = sequelize.define(
  "payments",
  {
    payment_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    order_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    payment_mode: {
      type: DataTypes.ENUM("upi", "bank_transfer", "prepaid", "cod"),
      allowNull: false,
    },

    gateway: {
      type: DataTypes.STRING, // Razorpay, Stripe, Cashfree
      allowNull: true,
    },

    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    payment_status: {
      type: DataTypes.ENUM("initiated", "success", "failed", "refunded"),
      defaultValue: "initiated",
    },

    payment_screenshot_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    verification_status: {
      type: DataTypes.ENUM("pending", "verified", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },

    verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    verified_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    rejected_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    rejected_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    transaction_ref: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    underscored: true,
  },
);
