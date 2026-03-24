import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const Product = sequelize.define(
  "products",
  {
    product_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    supplier_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    category_id: {
        type: DataTypes.UUID,
        allowNull: true,
    },

    brand: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    mrp: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: null,
    },

    bulk_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: null,
    },

    transfer_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: null,
    },

    gst_rate: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      defaultValue: 0.18,
    },

    minimum_order_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
    },

    bulk_price_refresh_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 20,
    },

    bulk_price_updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    bulk_price_last_reminded_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // 🔹 Approval workflow (ADMIN)
    approval_status: {
      type: DataTypes.ENUM(
        "draft", // supplier editing
        "submitted", // sent for admin review
        "approved", // admin approved
        "rejected", // admin rejected
      ),
      defaultValue: "draft",
    },

    // 🔹 Marketplace visibility (SYSTEM)
    lifecycle_status: {
      type: DataTypes.ENUM(
        "inactive", // not live
        "active", // live
        "paused", // temp disabled
        "archived", // permanently removed
      ),
      defaultValue: "inactive",
    },

    approved_by: {
      type: DataTypes.UUID,
      allowNull: true,
      defaultValue: DataTypes.UUIDV4,
    },

    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    timestamps: true,
    underscored: true,
  },
);
