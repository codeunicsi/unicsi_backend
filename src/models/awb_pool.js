import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const AWB_STATUS = ["available", "assigned", "used"];

export const AwbPool = sequelize.define(
    "awb_pool",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        courier_id: {
            type: DataTypes.UUID,
            allowNull: false,
            references: { model: "courier_partners", key: "courier_id" },
        },
        awb_number: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true,
        },
        status: {
            type: DataTypes.ENUM(...AWB_STATUS),
            allowNull: false,
            defaultValue: "available",
        },
        fulfillment_id: {
            type: DataTypes.UUID,
            allowNull: true,
        },
        assigned_at: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        tableName: "awb_pool",
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ["courier_id"] },
            { fields: ["status"] },
            { fields: ["awb_number"] },
        ],
    }
);