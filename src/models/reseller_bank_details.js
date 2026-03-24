import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const reseller_bank_details = sequelize.define(
  "reseller_bank_details",
  {
    reseller_bank_info_id: {
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
    bank_name: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    account_holder_name: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    account_number: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    ifsc_code: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    branch_name: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    bank_detail_proof: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    bank_details_status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    timestamps: true,
    underscored: true,
  },
);
