import { CourierPartner, CourierServiceability, CourierRateCard, CodSettings, AwbPool } from "../models/index.js";
import { Op } from "sequelize";
import crypto from "crypto";

const RATE_ZONES = ["metro", "tier1", "regional", "remote"];

const PINCODE_REGEX = /^\d{6}$/;

/** Normalize and validate Indian pincode: trim, string, remove spaces; must be exactly 6 digits. Returns normalized string or null if invalid. */
function normalizePincode(value) {
    if (value == null) return null;
    const s = String(value).trim().replace(/\s/g, "");
    return PINCODE_REGEX.test(s) ? s : null;
}

/** Convert CSV/API values to boolean: "true", "1", "yes" -> true; "false", "0", "no", "" -> false. */
function toBoolean(value) {
    if (value === true || value === 1) return true;
    if (value === false || value === 0) return false;
    if (value == null || value === "") return false;
    const s = String(value).trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
    return false;
}

export const getCourierPartners = async (query = {}) => {
    try {
        const { active_only, search } = query;
        const where = {};
        if (active_only === "true" || active_only === true) {
            where.is_active = true;
        }
        if (search && typeof search === "string" && search.trim()) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search.trim()}%` } },
                { code: { [Op.iLike]: `%${search.trim()}%` } },
            ];
        }
        const partners = await CourierPartner.findAll({
            where,
            order: [["name", "ASC"]],
        });
        return { success: true, data: partners.map((p) => p.get({ plain: true })) };
    } catch (error) {
        console.error("getCourierPartners error:", error);
        return { success: false, message: error.message };
    }
};

export const getCourierPartnerById = async (courierId) => {
    try {
        const partner = await CourierPartner.findByPk(courierId);
        if (!partner) {
            return { success: false, message: "Courier partner not found" };
        }
        return { success: true, data: partner.get({ plain: true }) };
    } catch (error) {
        console.error("getCourierPartnerById error:", error);
        return { success: false, message: error.message };
    }
};

export const createCourierPartner = async (body) => {
    try {
        const { name, code, support_cod = false, coverage_type } = body;
        if (!name || !code) {
            return { success: false, message: "Name and code are required" };
        }
        const existing = await CourierPartner.findOne({ where: { code: code.trim() } });
        if (existing) {
            return { success: false, message: "A partner with this code already exists" };
        }
        const partner = await CourierPartner.create({
            name: name.trim(),
            code: code.trim().toUpperCase(),
            support_cod: !!support_cod,
            coverage_type: coverage_type || null,
        });
        return { success: true, data: partner.get({ plain: true }) };
    } catch (error) {
        console.error("createCourierPartner error:", error);
        return { success: false, message: error.message };
    }
};

export const updateCourierPartner = async (courierId, body) => {
    try {
        const partner = await CourierPartner.findByPk(courierId);
        if (!partner) {
            return { success: false, message: "Courier partner not found" };
        }
        const { name, code, support_cod, coverage_type } = body;
        if (name !== undefined) partner.name = name.trim();
        if (code !== undefined) {
            const existing = await CourierPartner.findOne({
                where: { code: code.trim(), courier_id: { [Op.ne]: courierId } },
            });
            if (existing) {
                return { success: false, message: "Another partner already has this code" };
            }
            partner.code = code.trim().toUpperCase();
        }
        if (support_cod !== undefined) partner.support_cod = !!support_cod;
        if (coverage_type !== undefined) partner.coverage_type = coverage_type || null;
        await partner.save();
        return { success: true, data: partner.get({ plain: true }) };
    } catch (error) {
        console.error("updateCourierPartner error:", error);
        return { success: false, message: error.message };
    }
};

export const setCourierPartnerStatus = async (courierId, isActive) => {
    try {
        const partner = await CourierPartner.findByPk(courierId);
        if (!partner) {
            return { success: false, message: "Courier partner not found" };
        }
        partner.is_active = !!isActive;
        await partner.save();
        return { success: true, data: partner.get({ plain: true }) };
    } catch (error) {
        console.error("setCourierPartnerStatus error:", error);
        return { success: false, message: error.message };
    }
};

// --- Serviceability ---

export const getServiceabilityList = async (query = {}) => {
    try {
        const { courier_id, pincode, state, limit = 100 } = query;
        const where = {};
        if (courier_id) where.courier_id = courier_id;
        if (pincode != null && String(pincode).trim() !== "") {
            const normalized = normalizePincode(pincode);
            if (normalized === null) {
                return { success: false, message: "Invalid pincode format. Must be exactly 6 digits." };
            }
            where.pincode = { [Op.iLike]: `%${normalized}%` };
        }
        if (state && String(state).trim()) {
            where.state = { [Op.iLike]: `%${String(state).trim()}%` };
        }
        const rows = await CourierServiceability.findAll({
            where,
            include: [{ model: CourierPartner, as: "courier", attributes: ["courier_id", "name", "code"] }],
            order: [["pincode", "ASC"]],
            limit: Math.min(Number(limit) || 100, 500),
        });
        return { success: true, data: rows.map((r) => r.get({ plain: true })) };
    } catch (error) {
        console.error("getServiceabilityList error:", error);
        return { success: false, message: error.message };
    }
};

export const checkServiceability = async (pincode, courierId = null) => {
    try {
        const pin = normalizePincode(pincode);
        if (pin === null) {
            return { success: false, message: "Invalid pincode format. Must be exactly 6 digits." };
        }
        const where = { pincode: pin, is_serviceable: true };
        if (courierId) where.courier_id = courierId;
        const rows = await CourierServiceability.findAll({
            where,
            include: [{ model: CourierPartner, as: "courier", attributes: ["courier_id", "name", "code", "support_cod"] }],
        });
        const data = rows.map((r) => {
            const plain = r.get({ plain: true });
            return {
                courier_id: plain.courier_id,
                courier_name: plain.courier?.name,
                courier_code: plain.courier?.code,
                pincode: plain.pincode,
                state: plain.state,
                is_serviceable: plain.is_serviceable,
                cod_available: plain.cod_available,
            };
        });
        return { success: true, data };
    } catch (error) {
        console.error("checkServiceability error:", error);
        return { success: false, message: error.message };
    }
};

export const bulkUploadServiceability = async (rows) => {
    try {
        if (!Array.isArray(rows) || rows.length === 0) {
            return { success: false, message: "Payload must be a non-empty array" };
        }
        let processed = 0;
        let skipped = 0;
        for (const row of rows) {
            const courier_id = row.courier_id;
            const pincode = normalizePincode(row.pincode);
            if (!courier_id || !pincode) {
                skipped += 1;
                continue;
            }
            const is_serviceable =
                row.is_serviceable === undefined || row.is_serviceable === ""
                    ? true
                    : toBoolean(row.is_serviceable);
            const cod_available = toBoolean(row.cod_available);
            const state = row.state ? String(row.state).trim() : null;
            await CourierServiceability.upsert(
                { courier_id, pincode, state, is_serviceable, cod_available },
                { conflictFields: ["courier_id", "pincode"] }
            );
            processed += 1;
        }
        return { success: true, data: { processed, skipped, total: rows.length } };
    } catch (error) {
        console.error("bulkUploadServiceability error:", error);
        return { success: false, message: error.message };
    }
};

// --- Rate cards ---

function parseDecimal(val, minVal = 0) {
    const n = Number(val);
    if (Number.isNaN(n) || n < minVal) return null;
    return n;
}

export const getRateCardsList = async (query = {}) => {
    try {
        const { courier_id, zone, limit = 200 } = query;
        const where = {};
        if (courier_id) where.courier_id = courier_id;
        if (zone && RATE_ZONES.includes(zone)) where.zone = zone;
        const rows = await CourierRateCard.findAll({
            where,
            include: [{ model: CourierPartner, as: "courier", attributes: ["courier_id", "name", "code"] }],
            order: [
                ["courier_id", "ASC"],
                ["zone", "ASC"],
                ["weight_slab_min_kg", "ASC"],
            ],
            limit: Math.min(Number(limit) || 200, 500),
        });
        return { success: true, data: rows.map((r) => r.get({ plain: true })) };
    } catch (error) {
        console.error("getRateCardsList error:", error);
        return { success: false, message: error.message };
    }
};

export const getRateCardById = async (id) => {
    try {
        const row = await CourierRateCard.findByPk(id, {
            include: [{ model: CourierPartner, as: "courier", attributes: ["courier_id", "name", "code"] }],
        });
        if (!row) return { success: false, message: "Rate card not found" };
        return { success: true, data: row.get({ plain: true }) };
    } catch (error) {
        console.error("getRateCardById error:", error);
        return { success: false, message: error.message };
    }
};

export const createRateCard = async (body) => {
    try {
        const {
            courier_id,
            zone,
            weight_slab_min_kg,
            weight_slab_max_kg,
            prepaid_rate,
            cod_rate,
            effective_from,
            effective_to,
        } = body;
        if (!courier_id || !zone || !RATE_ZONES.includes(zone)) {
            return { success: false, message: "courier_id and zone (metro|tier1|regional|remote) are required" };
        }
        const minKg = parseDecimal(weight_slab_min_kg, 0);
        const maxKg = parseDecimal(weight_slab_max_kg, 0);
        const prepaid = parseDecimal(prepaid_rate, 0);
        const cod = parseDecimal(cod_rate, 0);
        if (minKg === null || maxKg === null) return { success: false, message: "Invalid weight slab (non-negative numbers)" };
        if (minKg > maxKg) return { success: false, message: "weight_slab_min_kg must be <= weight_slab_max_kg" };
        if (prepaid === null || cod === null) return { success: false, message: "prepaid_rate and cod_rate must be non-negative" };
        const partner = await CourierPartner.findByPk(courier_id);
        if (!partner) return { success: false, message: "Courier partner not found" };
        const existing = await CourierRateCard.findOne({
            where: { courier_id, zone, weight_slab_min_kg: minKg },
        });
        if (existing) return { success: false, message: "A rate card for this courier, zone and weight slab already exists" };
        const row = await CourierRateCard.create({
            courier_id,
            zone,
            weight_slab_min_kg: minKg,
            weight_slab_max_kg: maxKg,
            prepaid_rate: prepaid,
            cod_rate: cod,
            effective_from: effective_from || null,
            effective_to: effective_to || null,
        });
        return { success: true, data: row.get({ plain: true }) };
    } catch (error) {
        console.error("createRateCard error:", error);
        return { success: false, message: error.message };
    }
};

export const updateRateCard = async (id, body) => {
    try {
        const row = await CourierRateCard.findByPk(id);
        if (!row) return { success: false, message: "Rate card not found" };
        const { zone, weight_slab_min_kg, weight_slab_max_kg, prepaid_rate, cod_rate, effective_from, effective_to } = body;
        if (zone !== undefined && !RATE_ZONES.includes(zone)) return { success: false, message: "Invalid zone" };
        if (weight_slab_min_kg !== undefined) {
            const minKg = parseDecimal(weight_slab_min_kg, 0);
            if (minKg === null) return { success: false, message: "Invalid weight_slab_min_kg" };
            row.weight_slab_min_kg = minKg;
        }
        if (weight_slab_max_kg !== undefined) {
            const maxKg = parseDecimal(weight_slab_max_kg, 0);
            if (maxKg === null) return { success: false, message: "Invalid weight_slab_max_kg" };
            row.weight_slab_max_kg = maxKg;
        }
        if (row.weight_slab_min_kg > row.weight_slab_max_kg) {
            return { success: false, message: "weight_slab_min_kg must be <= weight_slab_max_kg" };
        }
        if (prepaid_rate !== undefined) {
            const p = parseDecimal(prepaid_rate, 0);
            if (p === null) return { success: false, message: "Invalid prepaid_rate" };
            row.prepaid_rate = p;
        }
        if (cod_rate !== undefined) {
            const c = parseDecimal(cod_rate, 0);
            if (c === null) return { success: false, message: "Invalid cod_rate" };
            row.cod_rate = c;
        }
        if (zone !== undefined) row.zone = zone;
        if (effective_from !== undefined) row.effective_from = effective_from || null;
        if (effective_to !== undefined) row.effective_to = effective_to || null;
        await row.save();
        return { success: true, data: row.get({ plain: true }) };
    } catch (error) {
        console.error("updateRateCard error:", error);
        return { success: false, message: error.message };
    }
};

export const calculateRate = async (courier_id, zone, weight_kg, is_cod, pincode = null) => {
    try {
        const weight = parseDecimal(weight_kg, 0);
        if (weight === null) return { success: false, message: "Invalid weight_kg" };
        if (!courier_id || !zone || !RATE_ZONES.includes(zone)) {
            return { success: false, message: "courier_id and zone (metro|tier1|regional|remote) are required" };
        }
        if (pincode != null && String(pincode).trim() !== "") {
            const pin = normalizePincode(pincode);
            if (pin === null) return { success: false, message: "Invalid pincode format" };
            const serviceable = await checkServiceability(pin, courier_id);
            if (!serviceable.success) return serviceable;
            if (!serviceable.data || serviceable.data.length === 0) {
                return { success: false, message: "Pincode not serviceable by this courier" };
            }
            if (is_cod) {
                const hasCod = serviceable.data.some((r) => r.cod_available);
                if (!hasCod) return { success: false, message: "COD not available for this pincode" };
            }
        }
        const today = new Date().toISOString().slice(0, 10);
        const where = {
            courier_id,
            zone,
            weight_slab_min_kg: { [Op.lte]: weight },
            weight_slab_max_kg: { [Op.gte]: weight },
            [Op.and]: [
                { [Op.or]: [{ effective_from: null }, { effective_from: { [Op.lte]: today } }] },
                { [Op.or]: [{ effective_to: null }, { effective_to: { [Op.gte]: today } }] },
            ],
        };
        const row = await CourierRateCard.findOne({
            where,
            include: [{ model: CourierPartner, as: "courier", attributes: ["name", "code"] }],
        });
        if (!row) {
            return { success: false, message: "No rate card found for this courier, zone and weight" };
        }
        const plain = row.get({ plain: true });
        const rate = is_cod ? Number(plain.cod_rate) : Number(plain.prepaid_rate);
        return {
            success: true,
            data: {
                rate,
                currency: "INR",
                courier_id: plain.courier_id,
                courier_name: plain.courier?.name,
                zone: plain.zone,
                weight_kg: weight,
                is_cod,
                slab: { min_kg: plain.weight_slab_min_kg, max_kg: plain.weight_slab_max_kg },
            },
        };
    } catch (error) {
        console.error("calculateRate error:", error);
        return { success: false, message: error.message };
    }
};

// --- COD settings ---

const COD_SCOPE_GLOBAL = "global";
const COD_DEFAULTS = {
    max_cod_limit_per_order: 100000,
    cod_commission_pct: 2.5,
    cod_fee_per_order: 0,
    failed_cod_fee: 8,
    chargeback_fee_pct: 2,
};

function isCodTableMissing(err) {
    const code = err?.parent?.code || err?.code;
    const msg = err?.parent?.message || err?.message || "";
    return code === "42P01" || /relation "cod_settings" does not exist/i.test(msg);
}

async function ensureCodTable() {
    try {
        await CodSettings.sync();
    } catch (syncErr) {
        console.error("CodSettings.sync error:", syncErr.message);
    }
}

export const getCodSettings = async () => {
    try {
        const row = await CodSettings.findOne({ where: { scope: COD_SCOPE_GLOBAL } });
        if (!row) {
            return { success: true, data: { ...COD_DEFAULTS, scope: COD_SCOPE_GLOBAL } };
        }
        const plain = row.get({ plain: true });
        return {
            success: true,
            data: {
                id: plain.id,
                scope: plain.scope,
                max_cod_limit_per_order: Number(plain.max_cod_limit_per_order),
                cod_commission_pct: Number(plain.cod_commission_pct),
                cod_fee_per_order: Number(plain.cod_fee_per_order),
                failed_cod_fee: Number(plain.failed_cod_fee),
                chargeback_fee_pct: plain.chargeback_fee_pct != null ? Number(plain.chargeback_fee_pct) : null,
                updated_at: plain.updated_at,
            },
        };
    } catch (error) {
        if (isCodTableMissing(error)) {
            await ensureCodTable();
            return { success: true, data: { ...COD_DEFAULTS, scope: COD_SCOPE_GLOBAL } };
        }
        console.error("getCodSettings error:", error);
        return { success: false, message: error.message };
    }
};

export const updateCodSettings = async (body) => {
    try {
        const { max_cod_limit_per_order, cod_commission_pct, cod_fee_per_order, failed_cod_fee, chargeback_fee_pct } = body;
        const maxLimit = parseDecimal(max_cod_limit_per_order, 0);
        const commissionPct = parseDecimal(cod_commission_pct, 0);
        const feePerOrder = parseDecimal(cod_fee_per_order, 0);
        const failedFee = parseDecimal(failed_cod_fee, 0);
        if (maxLimit === null) return { success: false, message: "max_cod_limit_per_order must be a non-negative number" };
        if (commissionPct === null) return { success: false, message: "cod_commission_pct must be a non-negative number" };
        if (feePerOrder === null) return { success: false, message: "cod_fee_per_order must be a non-negative number" };
        if (failedFee === null) return { success: false, message: "failed_cod_fee must be a non-negative number" };
        if (commissionPct > 100) return { success: false, message: "cod_commission_pct cannot exceed 100" };
        const chargebackPct = chargeback_fee_pct != null && chargeback_fee_pct !== "" ? parseDecimal(chargeback_fee_pct, 0) : null;
        if (chargeback_fee_pct != null && chargeback_fee_pct !== "" && chargebackPct === null) {
            return { success: false, message: "chargeback_fee_pct must be a non-negative number" };
        }
        if (chargebackPct != null && chargebackPct > 100) return { success: false, message: "chargeback_fee_pct cannot exceed 100" };

        let row = await CodSettings.findOne({ where: { scope: COD_SCOPE_GLOBAL } });
        const payload = {
            max_cod_limit_per_order: maxLimit,
            cod_commission_pct: commissionPct,
            cod_fee_per_order: feePerOrder,
            failed_cod_fee: failedFee,
            chargeback_fee_pct: chargebackPct,
        };
        if (!row) {
            row = await CodSettings.create({ scope: COD_SCOPE_GLOBAL, ...payload });
        } else {
            await row.update(payload);
        }
        const plain = row.get({ plain: true });
        return {
            success: true,
            data: {
                id: plain.id,
                scope: plain.scope,
                max_cod_limit_per_order: Number(plain.max_cod_limit_per_order),
                cod_commission_pct: Number(plain.cod_commission_pct),
                cod_fee_per_order: Number(plain.cod_fee_per_order),
                failed_cod_fee: Number(plain.failed_cod_fee),
                chargeback_fee_pct: plain.chargeback_fee_pct != null ? Number(plain.chargeback_fee_pct) : null,
                updated_at: plain.updated_at,
            },
        };
    } catch (error) {
        if (isCodTableMissing(error)) {
            await ensureCodTable();
            return updateCodSettings(body);
        }
        console.error("updateCodSettings error:", error);
        return { success: false, message: error.message };
    }
};

// --- AWB pool ---

const AWB_STATUSES = ["available", "assigned", "used"];

function isAwbTableMissing(err) {
    const code = err?.parent?.code || err?.code;
    const msg = err?.parent?.message || err?.message || "";
    return code === "42P01" || /relation "awb_pool" does not exist/i.test(msg);
}

async function ensureAwbTable() {
    try {
        await AwbPool.sync();
    } catch (syncErr) {
        console.error("AwbPool.sync error:", syncErr.message);
    }
}

function generateAwbNumber() {
    return `AWB-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
}

export const getAwbList = async (query = {}) => {
    try {
        const { status, courier_id, search, page = 1, limit = 50 } = query;
        const where = {};
        if (status && AWB_STATUSES.includes(status)) where.status = status;
        if (courier_id) where.courier_id = courier_id;
        if (search && String(search).trim()) {
            where.awb_number = { [Op.iLike]: `%${String(search).trim()}%` };
        }
        const offset = (Math.max(1, Number(page)) - 1) * Math.min(100, Math.max(1, Number(limit) || 50));
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 50));
        const { rows, count } = await AwbPool.findAndCountAll({
            where,
            include: [{ model: CourierPartner, as: "courier", attributes: ["courier_id", "name", "code"] }],
            order: [["created_at", "DESC"]],
            offset,
            limit: limitNum,
        });
        return {
            success: true,
            data: rows.map((r) => r.get({ plain: true })),
            pagination: { page: Number(page) || 1, limit: limitNum, total: count },
        };
    } catch (error) {
        if (isAwbTableMissing(error)) {
            await ensureAwbTable();
            return { success: true, data: [], pagination: { page: 1, limit: 50, total: 0 } };
        }
        console.error("getAwbList error:", error);
        return { success: false, message: error.message };
    }
};

export const generateAwb = async (body) => {
    try {
        const { courier_id, count = 1 } = body;
        if (!courier_id) return { success: false, message: "courier_id is required" };
        const partner = await CourierPartner.findByPk(courier_id);
        if (!partner) return { success: false, message: "Courier partner not found" };
        const n = Math.min(100, Math.max(1, Number(count) || 1));
        const created = [];
        for (let i = 0; i < n; i++) {
            let awbNumber = generateAwbNumber();
            let exists = await AwbPool.findOne({ where: { awb_number: awbNumber } });
            while (exists) {
                awbNumber = generateAwbNumber();
                exists = await AwbPool.findOne({ where: { awb_number: awbNumber } });
            }
            const row = await AwbPool.create({
                courier_id,
                awb_number: awbNumber,
                status: "available",
            });
            created.push(row.get({ plain: true }));
        }
        return { success: true, data: { generated: created.length, awbs: created } };
    } catch (error) {
        if (isAwbTableMissing(error)) {
            await ensureAwbTable();
            return generateAwb(body);
        }
        console.error("generateAwb error:", error);
        return { success: false, message: error.message };
    }
};

export const assignAwb = async (body) => {
    try {
        const { awb_number, fulfillment_id } = body;
        if (!awb_number || !fulfillment_id) {
            return { success: false, message: "awb_number and fulfillment_id are required" };
        }
        const row = await AwbPool.findOne({
            where: { awb_number: String(awb_number).trim(), status: "available" },
            include: [{ model: CourierPartner, as: "courier", attributes: ["name", "code"] }],
        });
        if (!row) return { success: false, message: "AWB not found or not available for assignment" };
        await row.update({
            status: "assigned",
            fulfillment_id,
            assigned_at: new Date(),
        });
        const plain = row.get({ plain: true });
        return {
            success: true,
            data: {
                id: plain.id,
                awb_number: plain.awb_number,
                courier_id: plain.courier_id,
                courier_name: plain.courier?.name,
                status: plain.status,
                fulfillment_id: plain.fulfillment_id,
                assigned_at: plain.assigned_at,
            },
        };
    } catch (error) {
        if (isAwbTableMissing(error)) {
            await ensureAwbTable();
            return assignAwb(body);
        }
        console.error("assignAwb error:", error);
        return { success: false, message: error.message };
    }
};

export const getAwbByNumber = async (awbNumberOrTracking) => {
    try {
        const search = String(awbNumberOrTracking || "").trim();
        if (!search) return { success: false, message: "awb_number or tracking_id is required" };
        const row = await AwbPool.findOne({
            where: { awb_number: { [Op.iLike]: search } },
            include: [{ model: CourierPartner, as: "courier", attributes: ["courier_id", "name", "code"] }],
        });
        if (!row) return { success: false, message: "AWB not found" };
        const plain = row.get({ plain: true });
        return {
            success: true,
            data: {
                awb_number: plain.awb_number,
                courier_id: plain.courier_id,
                courier_name: plain.courier?.name,
                status: plain.status,
                fulfillment_id: plain.fulfillment_id,
                assigned_at: plain.assigned_at,
                created_at: plain.created_at,
            },
        };
    } catch (error) {
        if (isAwbTableMissing(error)) {
            await ensureAwbTable();
            return { success: false, message: "AWB not found" };
        }
        console.error("getAwbByNumber error:", error);
        return { success: false, message: error.message };
    }
};