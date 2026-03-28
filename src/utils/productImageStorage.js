import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3 from "../config/s3.js";

export function isS3ProductImagesEnabled() {
  return Boolean(
    process.env.S3_BUCKET_NAME?.trim() &&
      process.env.AWS_ACCESS_KEY_ID?.trim() &&
      process.env.AWS_SECRET_ACCESS_KEY?.trim(),
  );
}

function localImageUrl(req, file) {
  if (!file?.filename) return null;
  const publicPath = `uploads/images/${file.filename}`.replace(/\\/g, "/");
  return `${req.protocol}://${req.get("host")}/${publicPath}`;
}

function buildS3ObjectPublicUrl(key) {
  const custom = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (custom) return `${custom}/${key}`;
  const bucket = process.env.S3_BUCKET_NAME;
  const region = process.env.AWS_REGION || "ap-south-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function uploadBufferToS3(buffer, originalname, mimetype) {
  const ext = path.extname(originalname || "") || ".jpg";
  const safeExt = ext.length > 12 ? ".jpg" : ext;
  const key = `products/${crypto.randomUUID()}${safeExt}`;

  const input = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype || "image/jpeg",
  };

  if (process.env.S3_USE_OBJECT_ACL === "true") {
    input.ACL = "public-read";
  }

  await s3.send(new PutObjectCommand(input));
  return buildS3ObjectPublicUrl(key);
}

/**
 * After multer diskStorage: move image to S3 (optional) or keep local URL.
 * Removes the temp file from disk when upload to S3 succeeds.
 */
export async function finalizeUploadedProductImage(req, file) {
  if (!file) return null;

  if (file.path && file.filename) {
    if (!isS3ProductImagesEnabled()) {
      return localImageUrl(req, file);
    }
    const buffer = await fs.readFile(file.path);
    const url = await uploadBufferToS3(buffer, file.originalname, file.mimetype);
    await fs.unlink(file.path).catch(() => {});
    return url;
  }

  return null;
}

export async function finalizeUploadedProductImages(req, files) {
  if (!files?.length) return [];
  return Promise.all(files.map((f) => finalizeUploadedProductImage(req, f)));
}
