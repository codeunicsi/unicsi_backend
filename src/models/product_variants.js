import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const ProductVariant = sequelize.define(
  "product_variants",
  {
    variant_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    sku: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    title: {
      type: DataTypes.STRING,
    },

    price: {
      type: DataTypes.DECIMAL,
      allowNull: false,
    },

    compare_at_price: {
      type: DataTypes.DECIMAL,
    },

    cost_price: {
      type: DataTypes.DECIMAL,
    },

    inventory_quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    inventory_management: {
      type: DataTypes.STRING,
      defaultValue: "shopify",
    },

    weight_grams: {
      type: DataTypes.INTEGER,
    },

    option1: DataTypes.STRING,
    option2: DataTypes.STRING,
    option3: DataTypes.STRING,

    shopify_variant_id: {
      type: DataTypes.STRING,
    },

    attributes: {
      type: DataTypes.JSONB,
    },

    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    dimension_cm: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      comment: "Product dimensions in cm: {height, width, length}",
    },
  },
  {
    timestamps: true,
    underscored: true,
  },
);
