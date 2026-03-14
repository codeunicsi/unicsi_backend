import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const reseller_gst_details = sequelize.define(
  "reseller_gst_details",
  {
    reseller_gst_info_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
    },
    gst_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gst_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    gst_validity: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    gst_status: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    gst_image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pan_image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    pan_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: true,
    underscored: true,
  },
);
