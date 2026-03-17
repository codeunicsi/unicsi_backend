import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const PlatformSetting = sequelize.define(
  "platform_settings",
  {
    setting_key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    setting_value: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    timestamps: true,
    underscored: true,
  },
);
