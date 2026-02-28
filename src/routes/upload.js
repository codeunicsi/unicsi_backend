// routes/upload.js
import express from "express";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.post("/upload", upload.single("file"), (req, res) => {
  res.status(200).json({
    message: "File uploaded successfully",
    fileUrl: req.file.location,
  });
});

export default router;