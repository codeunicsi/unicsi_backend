import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const ShopifyStore = sequelize.define("shopify_store", {
  storeId: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4,
  },

  store_name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },

  store_url: {
    type: DataTypes.STRING,
    allowNull: false
  },

  access_token: {
    type: DataTypes.TEXT,
    allowNull: false
  },

  scope: {
    type: DataTypes.TEXT,
    allowNull: false
  },

  userId: {
    type: DataTypes.UUID,
    allowNull: true
  },

  installed_at: {
    type: DataTypes.DATE
  },

  uninstalled_at: {
    type: DataTypes.DATE
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, { timestamps: true });