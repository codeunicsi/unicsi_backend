import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const ZONES = ["metro", "tier1", "regional", "remote"];

export const CourierRateCard = sequelize.define(
    "courier_rate_cards",
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
        zone: {
            type: DataTypes.ENUM(...ZONES),
            allowNull: false,
        },
        weight_slab_min_kg: {
            type: DataTypes.DECIMAL(10, 3),
            allowNull: false,
        },
        weight_slab_max_kg: {
            type: DataTypes.DECIMAL(10, 3),
            allowNull: false,
        },
        prepaid_rate: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        cod_rate: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        effective_from: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
        effective_to: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },
    },
    {
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ["courier_id"] },
            { fields: ["zone"] },
            { unique: true, fields: ["courier_id", "zone", "weight_slab_min_kg"] },
        ],
    }
);
