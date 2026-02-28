const { v4: uuidv4 } = require("uuid");
const path = require("path");

/**
 * Mock S3 uploader for development environment
 * Returns demo URLs instead of actually uploading to S3
 */
const uploadFileToS3 = async (file, folder = "uploads") => {
  if (!file || !file.buffer) {
    throw new Error("No file buffer provided for upload");
  }

  const fileExtension = path.extname(file.originalname);
  const uniqueFileName = `${folder}/${uuidv4()}${fileExtension}`;

  console.log(`Mock S3 Upload: ${uniqueFileName} (${file.size} bytes)`);

  // Simulate upload delay
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Return a demo URL
  const demoUrl = `https://demo-gsb-bucket.s3.ap-south-1.amazonaws.com/${uniqueFileName}`;
  console.log(`Mock upload successful: ${demoUrl}`);

  return demoUrl;
};

module.exports = { uploadFileToS3 };
