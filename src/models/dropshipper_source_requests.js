import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const DropshipperSourceRequest = sequelize.define(
  "dropshipper_source_requests",
  {
    request_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    product_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    product_category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    product_image_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    product_url: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    },
    expected_price: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("PENDING", "IN_REVIEW", "FULFILLED", "REJECTED"),
      allowNull: false,
      defaultValue: "PENDING",
    },
  },
  {
    timestamps: true,
    underscored: true,
  },
);
