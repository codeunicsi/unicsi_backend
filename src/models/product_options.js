import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const ProductOption = sequelize.define("product_options", {

    option_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
  
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
  
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  
    position: {
      type: DataTypes.INTEGER,
    }
  
  }, {
    timestamps: true,
    underscored: true,
  });
  