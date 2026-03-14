import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const Product = sequelize.define("products", {
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

  handle: {
    type: DataTypes.STRING,
    unique: true,
  },

  description: {
    type: DataTypes.TEXT,
  },

  brand: {
    type: DataTypes.STRING,
  },

  category_id: {
    type: DataTypes.INTEGER,
  },

  tags: {
    type: DataTypes.STRING,
  },

  product_type: {
    type: DataTypes.STRING,
  },

  // Shopify sync fields
  shopify_product_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // 🔹 Approval workflow
  approval_status: {
    type: DataTypes.ENUM(
      "draft",
      "submitted",
      "approved",
      "rejected"
    ),
    defaultValue: "draft",
  },

  lifecycle_status: {
    type: DataTypes.ENUM(
      "inactive",
      "active",
      "paused",
      "archived"
    ),
    defaultValue: "inactive",
  },

  approved_by: {
    type: DataTypes.UUID,
    allowNull: true,
  },

  approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  }

}, {
  timestamps: true,
  underscored: true,
});
