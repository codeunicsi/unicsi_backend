import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const ShopifyStore = sequelize.define("shopify_store", {
    storeId: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
    },
    store_name: {
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
    installed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    uninstalled_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
},
    { timestamps: true }
)