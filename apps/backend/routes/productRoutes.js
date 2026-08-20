const express = require('express');
const router = express.Router();
const productController = require('../controller/productController');
const volumeDiscountController = require('../controller/volumeDiscountController');
const presentationController = require('../controller/productPresentationController');
const consolidationController = require('../controller/productConsolidationController');
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
router.post('/', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.createProduct);
router.delete('/bulk/delete', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.deleteAllProducts);
router.patch('/bulk/visibility', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.bulkUpdateVisibility);
router.patch('/bulk/affiliate-visibility', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.bulkUpdateAffiliateVisibility);
router.get('/categories', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.getCategory);
router.post('/categories', verifyToken.authenticateToken, upload.single('image'), productController.createNewCategory);
router.put('/categories/:id', verifyToken.authenticateToken, upload.single('image'), productController.updateCategory);
router.delete('/categories/:id', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.deleteCategory);
router.post('/visual-search', verifyToken.authenticateToken, upload.single('image'), productController.visualSearchProduct);
router.post('/:id/duplicate', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.duplicateProduct);
router.get('/:id/volume-discounts', verifyToken.authenticateToken, volumeDiscountController.getVolumeDiscounts);
router.post('/:id/volume-discounts', verifyToken.authenticateToken, volumeDiscountController.createVolumeDiscount);
router.put('/:id/volume-discounts/:discountId', verifyToken.authenticateToken, volumeDiscountController.updateVolumeDiscount);
router.delete('/:id/volume-discounts/:discountId', verifyToken.authenticateToken, volumeDiscountController.deleteVolumeDiscount);

// Parameterized routes must come after specific routes
router.post('/:id/workflow', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.updateProductWorkflow);
router.get('/:id', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.getSingleProduct);
router.patch('/:id', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.updateSingleProduct);
router.delete('/:id', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.deleteSingleProduct);

// سلة المحذوفات - Trash routes
router.get('/trash/all', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.getDeletedProducts);
router.post('/:id/restore', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.restoreProduct);
router.delete('/:id/permanent', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.permanentDeleteProduct);

// Product images routes
router.post('/:id/images', verifyToken.authenticateToken, upload.any(), productController.uploadProductImages);
router.post('/:id/images/url', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.addImageToProduct);
router.delete('/:id/images', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.deleteImageFromOneProduct);

// Product variants routes
router.post('/:id/variants', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.createProductVariant);
router.get('/:id/variants', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.getProductVariants);
router.put('/:id/variants/:variantId', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.updateProductVariant);
router.delete('/:id/variants/:variantId', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.deleteProductVariant);

// Variant images routes (variantId in URL)
router.post('/:id/variants/:variantId/images', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.addImageToVariant);
router.delete('/:id/variants/:variantId/images', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.deleteImageFromVariant);

// Variant images routes (variantId in body) - receives imageUrl in JSON
router.post('/:id/variant-images', verifyToken.authenticateToken, requireDbPermission('products.view'), productController.addImageToVariantFromBody);

// Product presentation routes
router.post('/:id/presentations', verifyToken.authenticateToken, requireDbPermission('products.view'), presentationController.createPresentation);
router.get('/:id/presentations', verifyToken.authenticateToken, requireDbPermission('products.view'), presentationController.getPresentations);
router.get('/:id/presentations/:presentationId', verifyToken.authenticateToken, requireDbPermission('products.view'), presentationController.getSinglePresentation);
router.put('/:id/presentations/:presentationId', verifyToken.authenticateToken, requireDbPermission('products.view'), presentationController.updatePresentation);
router.delete('/:id/presentations/:presentationId', verifyToken.authenticateToken, requireDbPermission('products.view'), presentationController.deletePresentation);

// Convert a duplicate product into a presentation of a target original product
router.post('/:id/convert-to-presentation', verifyToken.authenticateToken, requireDbPermission('products.view'), presentationController.convertToPresentation);
// Bulk convert: multiple products -> presentations of one target original
router.post('/convert-bulk-to-presentations', verifyToken.authenticateToken, requireDbPermission('products.view'), presentationController.convertBulkToPresentations);

// Product consolidation (merge products into one new product with variants)
router.get('/consolidate/duplicates', verifyToken.authenticateToken, requireDbPermission('products.view'), consolidationController.listDuplicateGroups);
router.post('/consolidate', verifyToken.authenticateToken, requireDbPermission('products.view'), consolidationController.consolidate);

module.exports = router;
