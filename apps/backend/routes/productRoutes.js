const express = require('express');
const router = express.Router();
const productController = require('../controller/productController');
const volumeDiscountController = require('../controller/volumeDiscountController');
const presentationController = require('../controller/productPresentationController');
const productConversionController = require('../controller/productConversionController');
const verifyToken = require("../utils/verifyToken")
const { requireDbPermission } = require('../middleware/rbacMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
const productsDir = path.join(uploadsDir, 'products');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

if (!fs.existsSync(productsDir)) {
  fs.mkdirSync(productsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, productsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `variant-${uniqueSuffix}${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Specific routes must come before parameterized routes
router.get('/', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.getAllProducts);
router.post('/', verifyToken.authenticateToken, requireDbPermission('products.create'), productController.createProduct);
router.delete('/bulk/delete', verifyToken.authenticateToken, requireDbPermission('products.delete'), productController.deleteAllProducts);
router.patch('/bulk/visibility', verifyToken.authenticateToken, requireDbPermission('products.edit'), productController.bulkUpdateVisibility);
router.patch('/bulk/affiliate-visibility', verifyToken.authenticateToken, requireDbPermission('products.edit'), productController.bulkUpdateAffiliateVisibility);
router.patch('/bulk/track-inventory', verifyToken.authenticateToken, requireDbPermission('products.edit'), productController.bulkUpdateTrackInventory);
router.get('/categories', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.getCategory);
router.post('/categories', verifyToken.authenticateToken, requireDbPermission('products.create'), upload.single('image'), productController.createNewCategory);
router.put('/categories/:id', verifyToken.authenticateToken, requireDbPermission('products.edit'), upload.single('image'), productController.updateCategory);
router.delete('/categories/:id', verifyToken.authenticateToken, requireDbPermission('products.delete'), productController.deleteCategory);
router.post('/categories/:id/move-products', verifyToken.authenticateToken, requireDbPermission('products.edit'), productController.moveCategoryProducts);
router.post('/visual-search', verifyToken.authenticateToken, requireDbPermission('products.view'), upload.single('image'), productController.visualSearchProduct);
router.post('/:id/duplicate', verifyToken.authenticateToken, requireDbPermission('products.create'), productController.duplicateProduct);
router.get('/:id/volume-discounts', verifyToken.authenticateToken, requireDbPermission('products.view'), volumeDiscountController.getVolumeDiscounts);
router.post('/:id/volume-discounts', verifyToken.authenticateToken, requireDbPermission('products.edit'), volumeDiscountController.createVolumeDiscount);
router.put('/:id/volume-discounts/:discountId', verifyToken.authenticateToken, requireDbPermission('products.edit'), volumeDiscountController.updateVolumeDiscount);
router.delete('/:id/volume-discounts/:discountId', verifyToken.authenticateToken, requireDbPermission('products.delete'), volumeDiscountController.deleteVolumeDiscount);

// Parameterized routes must come after specific routes
router.post('/:id/workflow', verifyToken.authenticateToken, requireDbPermission('products.edit'), productController.updateProductWorkflow);
router.get('/:id', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.getSingleProduct);
router.patch('/:id', verifyToken.authenticateToken, requireDbPermission('products.edit'), productController.updateSingleProduct);
router.delete('/:id', verifyToken.authenticateToken, requireDbPermission('products.delete'), productController.deleteSingleProduct);

// سلة المحذوفات - Trash routes
router.get('/trash/all', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.getDeletedProducts);
router.post('/:id/restore', verifyToken.authenticateToken, requireDbPermission('products.edit'), productController.restoreProduct);
router.delete('/:id/permanent', verifyToken.authenticateToken, requireDbPermission('products.delete'), productController.permanentDeleteProduct);

// Product images routes
router.post('/:id/images', verifyToken.authenticateToken, requireDbPermission('products.edit'), upload.any(), productController.uploadProductImages);
router.post('/:id/images/url', verifyToken.authenticateToken, requireDbPermission('products.edit'), productController.addImageToProduct);
router.delete('/:id/images', verifyToken.authenticateToken, requireDbPermission('products.delete'), productController.deleteImageFromOneProduct);

// Product variants routes
router.post('/:id/variants', verifyToken.authenticateToken, requireDbPermission('products.create'), productController.createProductVariant);
router.get('/:id/variants', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.getProductVariants);
router.put('/:id/variants/:variantId', verifyToken.authenticateToken, requireDbPermission('products.edit'), productController.updateProductVariant);
router.delete('/:id/variants/:variantId', verifyToken.authenticateToken, requireDbPermission('products.delete'), productController.deleteProductVariant);

// Variant images routes (variantId in URL)
router.post('/:id/variants/:variantId/images', verifyToken.authenticateToken, requireDbPermission('products.edit'), productController.addImageToVariant);
router.delete('/:id/variants/:variantId/images', verifyToken.authenticateToken, requireDbPermission('products.delete'), productController.deleteImageFromVariant);

// Variant images routes (variantId in body) - receives imageUrl in JSON
router.post('/:id/variant-images', verifyToken.authenticateToken, requireDbPermission('products.edit'), productController.addImageToVariantFromBody);

// Product presentation routes
router.post('/:id/presentations', verifyToken.authenticateToken, requireDbPermission('products.create'), presentationController.createPresentation);
router.get('/:id/presentations', verifyToken.authenticateToken, requireDbPermission('products.view'), presentationController.getPresentations);
router.get('/:id/presentations/:presentationId', verifyToken.authenticateToken, requireDbPermission('products.view'), presentationController.getSinglePresentation);
router.put('/:id/presentations/:presentationId', verifyToken.authenticateToken, requireDbPermission('products.edit'), presentationController.updatePresentation);
router.delete('/:id/presentations/:presentationId', verifyToken.authenticateToken, requireDbPermission('products.delete'), presentationController.deletePresentation);

// تحويل منتج مستقل (مكرر) إلى عرض تقديمي تابع لمنتج أصلي
router.post('/:id/convert-to-presentation', verifyToken.authenticateToken, requireDbPermission('products.edit'), productConversionController.convertProductToPresentation);

// تحويل جماعي: عدة منتجات مكررة إلى عروض تقديمية تابعين لمنتج أصلي واحد
router.post('/convert-bulk-to-presentations', verifyToken.authenticateToken, requireDbPermission('products.edit'), productConversionController.convertBulkProductsToPresentations);

module.exports = router;
