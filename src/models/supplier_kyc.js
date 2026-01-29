
import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";


export const SupplierKyc = sequelize.define("supplier_kyc", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },

    supplier_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },

    reason: {
        type: DataTypes.STRING,
        allowNull: true,
    },

    status: {
        type: DataTypes.ENUM("pending", "verified", "rejected"),
        defaultValue: "pending",
    },
}, {
    timestamps: true,
    underscored: true,
});
