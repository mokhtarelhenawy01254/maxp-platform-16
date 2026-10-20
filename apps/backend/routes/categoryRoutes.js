const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const productController = require('../controller/productController');
const verifyToken = require('../utils/verifyToken');
const { requireDbPermission } = require('../middleware/rbacMiddleware');

const router = express.Router();

const uploadsDir = path.join(__dirname, '../uploads');
const productsDir = path.join(uploadsDir, 'products');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, productsDir);
  },
  filename(req, file, cb) {
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `category-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
    return;
  }

  cb(new Error('Only image files are allowed!'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.get('/', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.getCategory);
router.post('/', verifyToken.authenticateToken, requireDbPermission('products.create'), upload.single('image'), productController.createNewCategory);
router.put('/:id', verifyToken.authenticateToken, requireDbPermission('products.edit'), upload.single('image'), productController.updateCategory);
router.delete('/:id', verifyToken.authenticateToken, requireDbPermission('products.delete'), productController.deleteCategory);

module.exports = router;
