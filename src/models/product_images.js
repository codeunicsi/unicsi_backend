import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const ProductImage = sequelize.define("product_images", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },

  variant_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },

  image_url: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  shopify_image_id: {
    type: DataTypes.STRING,
  },

  alt_text: {
    type: DataTypes.STRING,
  },

  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },

}, {
  timestamps: true,
  underscored: true,
});
