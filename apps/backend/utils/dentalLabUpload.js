const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const dentalLabDir = path.join(__dirname, '../uploads/dental-lab');

if (!fs.existsSync(dentalLabDir)) {
  fs.mkdirSync(dentalLabDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dentalLabDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `dental-${uuidv4()}${ext}`);
  },
});

// قائمة أنواع الملفات المسموحة — ملفات الحالات (صور/مقاسات/نماذج 3D/مستندات) فقط.
// HTML مسموح فقط لملفات مراجعة التصميم (exocad webview) ويُفرض ذلك في الـ controller،
// ويُقدَّم دائماً عبر مسار معزول (CSP مقفل + iframe sandbox).
const ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/json',
  'application/zip',
  'application/octet-stream',
  'text/plain',
  'text/html',
  'model/stl',
  'model/ply',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.pdf', '.json', '.zip', '.txt',
  '.stl', '.ply', '.dxf', '.dcm',
  '.html',
]);

function dentalLabFileFilter(_req, file, cb) {
  const mimeOk = ALLOWED_MIMES.has(String(file.mimetype || '').toLowerCase());
  const ext = path.extname(file.originalname || '').toLowerCase();
  const extOk = ALLOWED_EXTENSIONS.has(ext);
  if (mimeOk || extOk) return cb(null, true);
  const error = new Error('نوع الملف غير مسموح');
  error.code = 'DENTAL_FILE_TYPE';
  return cb(error, false);
}

const upload = multer({
  storage,
  fileFilter: dentalLabFileFilter,
  limits: { fileSize: 50 * 1024 * 1024, files: 20 },
});

module.exports = { upload, dentalLabDir, dentalLabFileFilter };