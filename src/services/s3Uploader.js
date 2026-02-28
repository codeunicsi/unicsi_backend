const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const s3 = require("../utils/S3Client");

/**
 * Upload any file to AWS S3 with folder and content-type support.
 * @param {Object} file - File object from multer (memoryStorage).
 * @param {string} folder - Folder name inside S3 bucket. Default is 'uploads'.
 * @returns {string} - Public URL of the uploaded file.
 */
const uploadFileToS3 = async (file, folder = "uploads") => {
  if (!file || !file.buffer) {
    throw new Error("No file buffer provided for upload");
  }

  const fileExtension = path.extname(file.originalname);
  const uniqueFileName = `${folder}/${uuidv4()}${fileExtension}`;

  console.log(`Uploading file to S3: ${uniqueFileName}`);

  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: uniqueFileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: "public-read", // Make file publicly accessible
  });

  try {
    await s3.send(command);
    console.log(`Upload successful: ${uniqueFileName}`);
    const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${uniqueFileName}`;
    return fileUrl;
  } catch (err) {
    console.error("S3 Upload Error:", err);
    throw err;
  }
};

module.exports = { uploadFileToS3 };


const deleteFileFromS3 = async (fileUrl) => {
  if (!fileUrl) {
    console.log("No file URL provided for deletion; skipping.");
    return;
  }

  try {
    const url = new URL(fileUrl);
    const key = decodeURIComponent(url.pathname.slice(1)); // Remove leading '/'

    console.log(`Deleting file from S3: ${key}`);

    const command = new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
    });

    await s3.send(command);
    console.log(`Deletion successful: ${key}`);
  } catch (err) {
    console.error("S3 Deletion Error:", err);
    throw new Error(`Failed to delete file from S3: ${err.message}`);
  }
};

module.exports = { uploadFileToS3, deleteFileFromS3 };
