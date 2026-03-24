import { PlatformCollectionAccount } from "../models/platform_collection_account.js";

function isTableMissing(err) {
    const code = err?.parent?.code || err?.code;
    const msg = err?.parent?.message || err?.message || "";
    return code === "42P01" || /relation "platform_collection_account" does not exist/i.test(msg);
}

async function ensureTable() {
    try {
        await PlatformCollectionAccount.sync();
    } catch (syncErr) {
        console.error("PlatformCollectionAccount.sync error:", syncErr.message);
    }
}

function toDto(row) {
    if (!row) {
        return {
            bankId: null,
            accountHolderName: "",
            accountNumber: "",
            ifscCode: "",
            bankName: "",
            branchName: "",
            upiId: "",
            qrCode: "",
        };
    }
    const plain = row.get ? row.get({ plain: true }) : row;
    return {
        bankId: plain.bank_id,
        accountHolderName: plain.account_holder_name ?? "",
        accountNumber: plain.account_number ?? "",
        ifscCode: plain.ifsc_code ?? "",
        bankName: plain.bank_name ?? "",
        branchName: plain.branch_name ?? "",
        upiId: plain.upi_id ?? "",
        qrCode: plain.qr_code ?? "",
        updatedAt: plain.updated_at,
    };
}

export async function getPlatformCollectionAccount() {
    try {
        const row = await PlatformCollectionAccount.findOne({
            order: [["updated_at", "DESC"]],
        });
        return { success: true, data: toDto(row) };
    } catch (error) {
        if (isTableMissing(error)) {
            await ensureTable();
            return { success: true, data: toDto(null) };
        }
        console.error("getPlatformCollectionAccount error:", error);
        return { success: false, message: error.message };
    }
}

/** Save QR file like supplier product images: disk under uploads/images + absolute URL in qr_code. */
export async function setPlatformCollectionQrFromUpload(req) {
    try {
        if (!req.file?.filename) {
            return { success: false, message: "No image uploaded" };
        }
        const filename = req.file.filename;
        const host = req.get("host") || "localhost";
        const proto = req.protocol || "http";
        const imageUrl = `${proto}://${host}/uploads/images/${filename}`;

        let row = await PlatformCollectionAccount.findOne({
            order: [["updated_at", "DESC"]],
        });

        if (!row) {
            row = await PlatformCollectionAccount.create({ qr_code: imageUrl });
        } else {
            await row.update({ qr_code: imageUrl });
        }
        return { success: true, data: toDto(row) };
    } catch (error) {
        if (isTableMissing(error)) {
            await ensureTable();
            return setPlatformCollectionQrFromUpload(req);
        }
        console.error("setPlatformCollectionQrFromUpload error:", error);
        return { success: false, message: error.message };
    }
}

/** Remove the platform payment row entirely (bank, UPI, QR reference). */
export async function deletePlatformCollectionAccount() {
    try {
        const deleted = await PlatformCollectionAccount.destroy({ where: {} });
        return { success: true, data: toDto(null), deleted };
    } catch (error) {
        if (isTableMissing(error)) {
            await ensureTable();
            return { success: true, data: toDto(null), deleted: 0 };
        }
        console.error("deletePlatformCollectionAccount error:", error);
        return { success: false, message: error.message };
    }
}

export async function clearPlatformCollectionQr() {
    try {
        const row = await PlatformCollectionAccount.findOne({
            order: [["updated_at", "DESC"]],
        });
        if (!row) {
            return { success: true, data: toDto(null) };
        }
        await row.update({ qr_code: null });
        await row.reload();
        return { success: true, data: toDto(row) };
    } catch (error) {
        if (isTableMissing(error)) {
            await ensureTable();
            return { success: true, data: toDto(null) };
        }
        console.error("clearPlatformCollectionQr error:", error);
        return { success: false, message: error.message };
    }
}

export async function upsertPlatformCollectionAccount(body) {
    try {
        const {
            accountHolderName,
            accountNumber,
            ifscCode,
            bankName,
            branchName,
            upiId,
            qrCode,
        } = body;

        let row = await PlatformCollectionAccount.findOne({
            order: [["updated_at", "DESC"]],
        });

        const payload = {
            account_holder_name: accountHolderName != null ? String(accountHolderName).trim() : null,
            account_number: accountNumber != null ? String(accountNumber).trim() : null,
            ifsc_code: ifscCode != null ? String(ifscCode).trim() : null,
            bank_name: bankName != null ? String(bankName).trim() : null,
            branch_name: branchName != null ? String(branchName).trim() : null,
            upi_id: upiId != null ? String(upiId).trim() : null,
        };
        if (Object.prototype.hasOwnProperty.call(body, "qrCode")) {
            payload.qr_code = qrCode != null && String(qrCode).trim() !== "" ? String(qrCode).trim() : null;
        }

        if (!row) {
            row = await PlatformCollectionAccount.create(payload);
        } else {
            await row.update(payload);
        }
        return { success: true, data: toDto(row) };
    } catch (error) {
        if (isTableMissing(error)) {
            await ensureTable();
            return upsertPlatformCollectionAccount(body);
        }
        console.error("upsertPlatformCollectionAccount error:", error);
        return { success: false, message: error.message };
    }
}
