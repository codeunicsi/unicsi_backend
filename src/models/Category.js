import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Category = sequelize.define("Category", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: { type: DataTypes.STRING, allowNull: false },
  slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  parent_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  image_url: { type: DataTypes.STRING, allowNull: true },
  sort_order: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  is_featured: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: "categories",
  timestamps: true,
  underscored: true,
});

export default Category;
