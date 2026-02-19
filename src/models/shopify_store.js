import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const ShopifyStore = sequelize.define("shopify_store", {
    storeId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },
    shop: {
        type: DataTypes.STRING,
        allowNull: false
    },
    store_url: {
        type: DataTypes.STRING,
        allowNull: false
    },
    access_token: {
        type: DataTypes.STRING,
        allowNull: false
    },
    scope: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
},
    { timestamps: true }
)