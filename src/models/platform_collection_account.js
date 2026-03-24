import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

/** Unicsi platform receiving account (UPI / bank) shown to suppliers for manual payments — not supplier payout details. */
export const PlatformCollectionAccount = sequelize.define(
    "platform_collection_account",
    {
        bank_id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        account_holder_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        account_number: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        ifsc_code: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        bank_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        branch_name: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        upi_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        qr_code: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        tableName: "platform_collection_account",
        timestamps: true,
        underscored: true,
    }
);
