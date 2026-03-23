import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

export const Order = sequelize.define(
  "orders",
  {
    order_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    reseller_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "resellers",
        key: "reseller_id",
      },
    },

    supplier_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    // product_id: {
    //   type: DataTypes.UUID,
    //   allowNull: true,
    // },

    order_type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "STANDARD",
    },

    quantity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // supplier_transfer_price: {
    //   type: DataTypes.DECIMAL(12, 2),
    //   allowNull: true,
    // },

    platform_margin_per_piece: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },

    platform_total_margin: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },

    supplier_payout_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },

    supplier_payout_status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "PENDING_DELIVERY",
    },

    supplier_payout_cycle: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    supplier_payout_due_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    supplier_payout_processed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // unit_bulk_price: {
    //   type: DataTypes.DECIMAL(12, 2),
    //   allowNull: true,
    // },

    subtotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },

    // gst_rate: {
    //   type: DataTypes.DECIMAL(5, 4),
    //   allowNull: true,
    // },

    gst_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },

    total_payable: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
    },

    shipping_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    },

    invoice_number: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },

    ssn_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    service_accounting_code: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    user_business_details: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    transaction_reference: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    payment_method: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "DIRECT_BANK_TRANSFER",
    },

    payment_verified_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    payment_verified_by: {
      type: DataTypes.UUID,
      allowNull: true,
    },

    orderDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
    },

    payment_status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "PENDING",
    },

    customer_name: DataTypes.STRING,
    customer_phone: DataTypes.STRING,
    shipping_address: DataTypes.TEXT,

    order_status: {
      type: DataTypes.ENUM(
        "PENDING",
        "CONFIRMED",
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "NDR",
        "RTO",
        "CANCELLED",
        "Pending Payment",
        "Confirmed",
        "Shipped",
        "Delivered",
        "Pending_Manual_Verification",
        "Paid",
      ),
      allowNull: false,
    },
    total_amount: DataTypes.DECIMAL(10, 2),
  },
  {
    timestamps: true,
  },
);
