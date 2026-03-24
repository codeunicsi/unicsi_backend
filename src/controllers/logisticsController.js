import {
    getCourierPartners,
    getCourierPartnerById,
    createCourierPartner,
    updateCourierPartner,
    setCourierPartnerStatus,
    getServiceabilityList,
    checkServiceability,
    bulkUploadServiceability,
    getRateCardsList,
    getRateCardById,
    createRateCard,
    updateRateCard,
    calculateRate as calculateRateFn,
    getCodSettings as getCodSettingsFn,
    updateCodSettings as updateCodSettingsFn,
    getAwbList as getAwbListFn,
    generateAwb,
    assignAwb,
    getAwbByNumber,
} from "../utils/logisticsRoutes.js";

class LogisticsController {
    getPartners = async (req, res) => {
        try {
            const result = await getCourierPartners(req.query);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("getPartners error:", error);
            return res.status(500).json({ success: false, message: "Failed to fetch courier partners" });
        }
    };

    getPartnerById = async (req, res) => {
        try {
            const result = await getCourierPartnerById(req.params.courier_id);
            if (!result.success) {
                return res.status(404).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("getPartnerById error:", error);
            return res.status(500).json({ success: false, message: "Failed to fetch courier partner" });
        }
    };

    createPartner = async (req, res) => {
        try {
            const result = await createCourierPartner(req.body);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(201).json(result);
        } catch (error) {
            console.error("createPartner error:", error);
            return res.status(500).json({ success: false, message: "Failed to create courier partner" });
        }
    };

    updatePartner = async (req, res) => {
        try {
            const result = await updateCourierPartner(req.params.courier_id, req.body);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("updatePartner error:", error);
            return res.status(500).json({ success: false, message: "Failed to update courier partner" });
        }
    };

    setPartnerStatus = async (req, res) => {
        try {
            const { is_active } = req.body;
            const result = await setCourierPartnerStatus(req.params.courier_id, is_active);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("setPartnerStatus error:", error);
            return res.status(500).json({ success: false, message: "Failed to update status" });
        }
    };

    getServiceabilityList = async (req, res) => {
        try {
            const result = await getServiceabilityList(req.query);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("getServiceabilityList error:", error);
            return res.status(500).json({ success: false, message: "Failed to fetch serviceability" });
        }
    };

    checkServiceability = async (req, res) => {
        try {
            const { pincode, courier_id } = req.query;
            const result = await checkServiceability(pincode, courier_id || null);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("checkServiceability error:", error);
            return res.status(500).json({ success: false, message: "Failed to check serviceability" });
        }
    };

    uploadServiceability = async (req, res) => {
        try {
            const rows = Array.isArray(req.body) ? req.body : req.body?.rows;
            const result = await bulkUploadServiceability(rows || []);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("uploadServiceability error:", error);
            return res.status(500).json({ success: false, message: "Failed to upload serviceability" });
        }
    };

    getRateCardsList = async (req, res) => {
        try {
            const result = await getRateCardsList(req.query);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("getRateCardsList error:", error);
            return res.status(500).json({ success: false, message: "Failed to fetch rate cards" });
        }
    };

    getRateCardById = async (req, res) => {
        try {
            const result = await getRateCardById(req.params.id);
            if (!result.success) {
                return res.status(404).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("getRateCardById error:", error);
            return res.status(500).json({ success: false, message: "Failed to fetch rate card" });
        }
    };

    createRateCard = async (req, res) => {
        try {
            const result = await createRateCard(req.body);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(201).json(result);
        } catch (error) {
            console.error("createRateCard error:", error);
            return res.status(500).json({ success: false, message: "Failed to create rate card" });
        }
    };

    updateRateCard = async (req, res) => {
        try {
            const result = await updateRateCard(req.params.id, req.body);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("updateRateCard error:", error);
            return res.status(500).json({ success: false, message: "Failed to update rate card" });
        }
    };

    calculateRate = async (req, res) => {
        try {
            const { courier_id, zone, weight_kg, is_cod, pincode } = req.query;
            const isCod = is_cod === "true" || is_cod === "1";
            const result = await calculateRateFn(courier_id, zone, weight_kg, isCod, pincode || null);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("calculateRate error:", error);
            return res.status(500).json({ success: false, message: "Failed to calculate rate" });
        }
    };

    getCodSettings = async (_req, res) => {
        try {
            const result = await getCodSettingsFn();
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("getCodSettings error:", error);
            return res.status(500).json({ success: false, message: "Failed to fetch COD settings" });
        }
    };

    updateCodSettings = async (req, res) => {
        try {
            const result = await updateCodSettingsFn(req.body);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("updateCodSettings error:", error);
            return res.status(500).json({ success: false, message: "Failed to update COD settings" });
        }
    };

    getAwbList = async (req, res) => {
        try {
            const result = await getAwbListFn(req.query);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("getAwbList error:", error);
            return res.status(500).json({ success: false, message: "Failed to fetch AWB list" });
        }
    };

    getAwbTrack = async (req, res) => {
        try {
            const { tracking_id, awb_number } = req.query;
            const search = tracking_id || awb_number || req.params.awb_number;
            const result = await getAwbByNumber(search);
            if (!result.success) {
                return res.status(404).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("getAwbTrack error:", error);
            return res.status(500).json({ success: false, message: "Failed to fetch AWB" });
        }
    };

    postAwbGenerate = async (req, res) => {
        try {
            const result = await generateAwb(req.body);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(201).json(result);
        } catch (error) {
            console.error("postAwbGenerate error:", error);
            return res.status(500).json({ success: false, message: "Failed to generate AWB" });
        }
    };

    postAwbAssign = async (req, res) => {
        try {
            const result = await assignAwb(req.body);
            if (!result.success) {
                return res.status(400).json(result);
            }
            return res.status(200).json(result);
        } catch (error) {
            console.error("postAwbAssign error:", error);
            return res.status(500).json({ success: false, message: "Failed to assign AWB" });
        }
    };
}

export default new LogisticsController();