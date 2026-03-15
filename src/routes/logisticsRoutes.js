import express from "express";
import LogisticsController from "../controllers/logisticsController.js";

const router = express.Router();

router.get("/partners", LogisticsController.getPartners);
router.post("/partners", LogisticsController.createPartner);
router.get("/partners/:courier_id", LogisticsController.getPartnerById);
router.put("/partners/:courier_id/status", LogisticsController.setPartnerStatus);
router.put("/partners/:courier_id", LogisticsController.updatePartner);

router.get("/serviceability", LogisticsController.getServiceabilityList);
router.get("/serviceability/check", LogisticsController.checkServiceability);
router.post("/serviceability/upload", LogisticsController.uploadServiceability);

router.get("/rates/calculate", LogisticsController.calculateRate);
router.get("/rates", LogisticsController.getRateCardsList);
router.post("/rates", LogisticsController.createRateCard);
router.get("/rates/:id", LogisticsController.getRateCardById);
router.put("/rates/:id", LogisticsController.updateRateCard);

router.get("/cod", LogisticsController.getCodSettings);
router.put("/cod", LogisticsController.updateCodSettings);

router.get("/awb/track", LogisticsController.getAwbTrack);
router.get("/awb", LogisticsController.getAwbList);
router.post("/awb/generate", LogisticsController.postAwbGenerate);
router.post("/awb/assign", LogisticsController.postAwbAssign);

export default router;