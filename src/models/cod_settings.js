import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const CodSettings = sequelize.define(
    "cod_settings",
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        scope: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: "global"
        },
        max_cod_limit_per_order: {
            type: DataTypes.DECIMAL(12, 2),
            allowNull: false,
        },
        cod_commission_pct: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
        },
        cod_fee_per_order: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        failed_cod_fee: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        chargeback_fee_pct: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
        },
    },
    {
        timestamps: true,
        underscored: true,
    }
);