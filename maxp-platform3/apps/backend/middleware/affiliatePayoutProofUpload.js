const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const uploadRoot = process.env.UPLOAD_PATH
  ? path.resolve(__dirname, "..", process.env.UPLOAD_PATH)
  : path.join(__dirname, "../uploads");
const payoutProofsDir = path.join(uploadRoot, "affiliate-payouts");

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

if (!fs.existsSync(payoutProofsDir)) {
  fs.mkdirSync(payoutProofsDir, { recursive: true });
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
    cb(null, payoutProofsDir);
  },
  filename: function (_req, file, cb) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    cb(null, `affiliate-payout-proof-${uuidv4()}${extension}`);
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

  cb(new Error("يُسمح فقط برفع صور أو ملفات PDF كإثبات للتحويل"), false);
};

const uploadAffiliatePayoutProof = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = uploadAffiliatePayoutProof;
