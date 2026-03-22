import XLSX from "xlsx";
import csv from "csv-parser";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { Product } from "../models/index.js";
import { ProductImage } from "../models/index.js";
import Category from "../models/Category.js";
import { Op } from "sequelize";

// Vendor: Create product (draft → pending)
export const createProduct = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const {
      title,
      description,
      sku,
      transferPrice,
      qtyInStock,
      weightGrams,
      lengthCm,
      widthCm,
      heightCm,
      categoryId,
      imageUrls = [],
    } = req.body;

    const product = await Product.create({
      vendorId,
      title,
      description,
      sku,
      transferPrice,
      qtyInStock,
      weightGrams,
      lengthCm,
      widthCm,
      heightCm,
      categoryId,
      status: "pending",
    });
    const uploadedMedia = [];

    if (req.files?.images) {
      req.files.images.forEach((img, i) => {
        const publicPath = `uploads/images/${img.filename}`.replace(/\\/g, "/");
        const url = `${req.protocol}://${req.get("host")}/${publicPath}`;
        uploadedMedia.push({ url, sortOrder: i });
      });
    }

    if (req.files?.videos) {
      req.files.videos.forEach((vid, i) => {
        const publicPath = `uploads/videos/${vid.filename}`.replace(/\\/g, "/");
        const url = `${req.protocol}://${req.get("host")}/${publicPath}`;
        uploadedMedia.push({ url, sortOrder: uploadedMedia.length + i });
      });
    }

    // Merge URLs from both uploaded files and frontend-provided URLs
    const allUrls = [
      ...(imageUrls || []).map((url, i) => ({
        url,
        sortOrder: uploadedMedia.length + i,
      })),
      ...uploadedMedia,
    ];

    if (allUrls.length) {
      await ProductImage.bulkCreate(
        allUrls.map((m) => ({ productId: product.id, ...m }))
      );
    }

    res.status(201).json({ success: true, data: product });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

export const myProducts = async (req, res) => {
  const vendorId = req.user.id;
  const { status, q, page = 1, limit = 20 } = req.query;
  const where = { vendorId };
  if (status) where.status = status;
  if (q) where.title = { [Op.iLike]: `%${q}%` };
  const data = await Product.findAndCountAll({
    where,
    include: [{ model: ProductImage, as: "images" }, { model: Category, as: "category" }],
    limit: +limit,
    offset: (+page - 1) * +limit,
    order: [["createdAt", "DESC"]],
  });
  res.json({ success: true, ...data });
};

export const updateProduct = async (req, res) => {
  const vendorId = req.user.id;
  const { id } = req.params;
  const product = await Product.findOne({ where: { id, vendorId } });
  if (!product) return res.status(404).json({ message: "Not found" });
  if (["approved", "rejected"].includes(product.status))
    return res.status(400).json({ message: "Cannot edit once reviewed" });

  await product.update({ ...req.body, status: "pending" }); // re-submit for review
  res.json({ success: true, data: product });
};

export const updateStock = async (req, res) => {
  const vendorId = req.user.id;
  const { id } = req.params;
  const { qtyInStock } = req.body;
  const product = await Product.findOne({ where: { id, vendorId } });
  if (!product) return res.status(404).json({ message: "Not found" });
  await product.update({ qtyInStock });
  res.json({ success: true });
};

export const vendorSetStatus = async (req, res) => {
  const vendorId = req.user.id;
  const { id } = req.params;
  const { status } = req.body; // "inactive" or "pending"
  const product = await Product.findOne({ where: { id, vendorId } });
  if (!product) return res.status(404).json({ message: "Not found" });
  if (!["inactive", "pending"].includes(status))
    return res.status(400).json({ message: "Invalid status" });
  await product.update({ status });
  res.json({ success: true });
};

// Bulk CSV upload: columns => title,description,sku,transferPrice,qtyInStock,weightGrams,lengthCm,widthCm,heightCm,categorySlug,imageUrls(semicolon-separated)
export const bulkUpload = async (req, res) => {
  const vendorId = req.user.id;
  if (!req.file) return res.status(400).json({ message: "CSV file required" });

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (row) => results.push(row))
    .on("end", async () => {
      try {
        for (const r of results) {
          const category = await Category.findOne({
            where: { slug: r.categorySlug },
          });
          const product = await Product.create({
            vendorId,
            title: r.title,
            description: r.description,
            sku: r.sku,
            transferPrice: r.transferPrice,
            qtyInStock: r.qtyInStock,
            weightGrams: r.weightGrams,
            lengthCm: r.lengthCm,
            widthCm: r.widthCm,
            heightCm: r.heightCm,
            categoryId: category ? category.id : null,
            status: "pending",
          });
          const urls = (r.imageUrls || "")
            .split(";")
            .map((s) => s.trim())
            .filter(Boolean);
          if (urls.length) {
            await ProductImage.bulkCreate(
              urls.map((url, i) => ({
                productId: product.id,
                url,
                sortOrder: i,
              }))
            );
          }
        }
        fs.unlinkSync(req.file.path);
        res.json({ success: true, count: results.length });
      } catch (e) {
        res.status(400).json({ message: e.message });
      }
    });
};

// Bulk upload-zip
export const bulkUploadZip = async (req, res) => {
  const vendorId = req.user.id;

  if (!req.file) return res.status(400).json({ message: "ZIP file required" });

  const zipPath = req.file.path;
  const extractPath = `uploads/extracted_${Date.now()}`;

  try {
    fs.mkdirSync(extractPath);

    // -------------------------------------------------------
    // 🔎 Helper: Recursively find a folder by name
    // -------------------------------------------------------
    function findFolder(base, folderName) {
      const entries = fs.readdirSync(base, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(base, entry.name);

        if (
          entry.isDirectory() &&
          entry.name.toLowerCase() === folderName.toLowerCase()
        ) {
          return fullPath;
        }

        if (entry.isDirectory()) {
          const result = findFolder(fullPath, folderName);
          if (result) return result;
        }
      }

      return null;
    }

    // -------------------------------------------------------
    // 🔎 Helper: Recursively find Excel (.xlsx) file
    // -------------------------------------------------------
    function findExcelFile(dir) {
      const files = fs.readdirSync(dir, { withFileTypes: true });

      for (const file of files) {
        const fullPath = path.join(dir, file.name);

        if (file.isFile() && file.name.endsWith(".xlsx")) {
          return fullPath;
        }

        if (file.isDirectory()) {
          const result = findExcelFile(fullPath);
          if (result) return result;
        }
      }
      return null;
    }

    // -------------------------------------------------------
    // 📦 Extract ZIP
    // -------------------------------------------------------
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    // -------------------------------------------------------
    // 📄 Locate Excel file
    // -------------------------------------------------------
    const excelPath = findExcelFile(extractPath);
    if (!excelPath) {
      return res
        .status(400)
        .json({ message: "Excel (.xlsx) file missing in ZIP" });
    }

    // -------------------------------------------------------
    // 📁 Locate images/videos folder (RECUSIVELY)
    // -------------------------------------------------------
    const imagesFolder = findFolder(extractPath, "images");
    const videosFolder = findFolder(extractPath, "videos");

    console.log("Images folder:", imagesFolder);
    console.log("Videos folder:", videosFolder);

    // -------------------------------------------------------
    // 📄 Read Excel rows
    // -------------------------------------------------------
    const workbook = XLSX.readFile(excelPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    let createdCount = 0;

    // -------------------------------------------------------
    // 🛠 Process each row
    // -------------------------------------------------------
    for (const r of rows) {
      const category = await Category.findOne({
        where: { slug: r.categorySlug?.trim() },
      });

      const product = await Product.create({
        vendorId,
        title: r.title,
        description: r.description,
        sku: r.sku,
        transferPrice: r.transferPrice,
        qtyInStock: r.qtyInStock,
        weightGrams: r.weightGrams,
        lengthCm: r.lengthCm,
        widthCm: r.widthCm,
        heightCm: r.heightCm,
        categoryId: category ? category.id : null,
        status: "pending",
      });

      // Product-specific folder
      const productFolder = `uploads/products/${product.id}`;
      fs.mkdirSync(productFolder, { recursive: true });

      let sortOrder = 0;

      // -------------------------------------------------------
      // 🖼 IMAGE Copy + Save
      // -------------------------------------------------------
      if (r.imageFiles && imagesFolder) {
        const imageNames = r.imageFiles.split(";").map((x) => x.trim());

        for (const name of imageNames) {
          const source = path.join(imagesFolder, name);
          const dest = path.join(productFolder, name);

          if (fs.existsSync(source)) {
            fs.copyFileSync(source, dest);
            const publicPath = dest.replace(/\\/g, "/");

            await ProductImage.create({
              productId: product.id,
              url: `${req.protocol}://${req.get("host")}/${publicPath}`,
              sortOrder: sortOrder++,
            });
          }
        }
      }

      // -------------------------------------------------------
      // 🎥 VIDEO Copy + Save
      // -------------------------------------------------------
      if (r.videoFiles && videosFolder) {
        const videoNames = r.videoFiles.split(";").map((x) => x.trim());

        for (const name of videoNames) {
          const source = path.join(videosFolder, name);
          const dest = path.join(productFolder, name);

          if (fs.existsSync(source)) {
            fs.copyFileSync(source, dest);
            const publicPath = dest.replace(/\\/g, "/");

            await ProductImage.create({
              productId: product.id,
              url: `${req.protocol}://${req.get("host")}/${publicPath}`,
              sortOrder: sortOrder++,
            });
          }
        }
      }

      createdCount++;
    }

    // 🔥 Cleanup temp extracted folder + zip file
    fs.rmSync(extractPath, { recursive: true, force: true });
    fs.unlinkSync(zipPath);

    return res.json({
      success: true,
      created: createdCount,
      message: `Uploaded ${createdCount} products successfully.`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};
