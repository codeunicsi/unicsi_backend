import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const admin_bank_details = sequelize.define(
  "admin_bank_details",
  {
    admin_bank_details_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    account_holder_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    account_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ifsc_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    bank_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    upi_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    qr_code: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  { timestamps: true, underscored: true },
);
