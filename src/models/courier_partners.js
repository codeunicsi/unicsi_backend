import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const CourierPartner = sequelize.define("courier_partners", {
    courier_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    support_cod: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    coverage_type: {
        type: DataTypes.ENUM("metro", "regional", "pan_india"),
        allowNull: true,
    },
}, {
    timestamps: true,
    underscored: true,
});