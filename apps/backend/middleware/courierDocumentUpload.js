const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const uploadRoot = process.env.UPLOAD_PATH
  ? path.resolve(__dirname, "..", process.env.UPLOAD_PATH)
  : path.join(__dirname, "../uploads");
const courierDocumentsDir = path.join(uploadRoot, "courier-documents");

if (!fs.existsSync(uploadRoot)) {
  try {
    fs.mkdirSync(uploadRoot, { recursive: true });
  } catch (_) {}
}

if (!fs.existsSync(courierDocumentsDir)) {
  try {
    fs.mkdirSync(courierDocumentsDir, { recursive: true });
  } catch (_) {}
}

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf"]);

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, courierDocumentsDir);
  },
  filename: function (_req, file, cb) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    cb(null, `courier-doc-${uuidv4()}${extension}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  if (
    allowedMimeTypes.has(file.mimetype) &&
    allowedExtensions.has(extension)
  ) {
    cb(null, true);
    return;
  }

  cb(new Error("يُسمح فقط برفع صور (JPG, PNG, WEBP) أو ملفات PDF كمستند للمندوب"), false);
};

const uploadCourierDocument = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

module.exports = uploadCourierDocument;
