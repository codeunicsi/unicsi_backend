import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const ProductOptionValue = sequelize.define("product_option_values", {

    value_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
  
    option_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  
  }, {
    timestamps: true,
    underscored: true,
  });
  