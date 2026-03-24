import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const CourierServiceability = sequelize.define("courier_serviceability", {
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
    pincode: {
        type: DataTypes.STRING(10),
        allowNull: false,
    },
    state: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    is_serviceable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    cod_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: "courier_serviceability",
    timestamps: true,
    underscored: true,
    indexes: [
        { unique: true, fields: ["courier_id", "pincode"] },
        { fields: ["pincode"] },
        { fields: ["courier_id"] },
        { fields: ["state"] },
    ],
});