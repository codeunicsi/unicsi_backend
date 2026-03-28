import multer from "multer";
import path from "path";
import fs from "fs";

const ensureDir = (p) => {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
};

const UPLOADS_DIR = path.resolve("uploads");
ensureDir(UPLOADS_DIR);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "others";

    const mime = (file.mimetype || "").toLowerCase();
    const ext = path.extname(file.originalname || "").toLowerCase();

    if (mime.startsWith("image/")) folder = "images";
    else if (mime.startsWith("video/")) folder = "videos";
    else if (
      ext === ".csv" ||
      ext === ".xlsx" ||
      mime ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mime === "text/csv"
    )
      folder = "bulk";
    else if (
      ext === ".zip" ||
      mime === "application/zip" ||
      mime === "application/x-zip-compressed" ||
      mime === "multipart/x-zip" ||
      mime === "application/x-zip"
    )
      folder = "bulk";

    const dest = path.join(UPLOADS_DIR, folder);
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const ok = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".mp4",
      ".mov",
      ".mkv",
      ".csv",
      ".xlsx",
      ".zip",
    ].includes(ext);
    if (!ok) return cb(new Error("Unsupported file type"));
    cb(null, true);
  },
});

export default upload;
