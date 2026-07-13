const { getSharedPrismaClient } = require('../services/sharedDatabase');
const { processImage, isProcessableImage } = require('../utils/imageProcessor');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
// const prisma = getSharedPrismaClient(); // ❌ Removed to prevent early loading issues

/**
 * 📥 الحصول على جميع الصور المحفوظة للمستخدم
 * GET /user/image-gallery
 */
const getImageGallery = async (req, res) => {
  try {
    // ✅ التحقق من وجود user authentication
    // Support both userId (from verifyToken) and id (from requireAuth)
    const userId = req.user?.userId || req.user?.id;
    const companyId = req.user?.companyId;

    if (!userId || !companyId) {
      console.error('❌ Missing user authentication in GET:', {
        hasUser: !!req.user,
        userId,
        companyId,
        userObject: req.user
      });
      return res.status(401).json({
        success: false,
        message: 'المصادقة مطلوبة'
      });
    }

    const images = await getSharedPrismaClient().imageGallery.findMany({
      where: {
        userId: userId,
        companyId: companyId
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        filename: true,
        fileUrl: true,
        fileType: true,
        fileSize: true,
        createdAt: true
      }
    });

    // تنسيق البيانات للفرونت إند
    const formattedImages = images.map(img => ({
      id: img.id,
      url: img.fileUrl,
      filename: img.filename,
      uploadedAt: img.createdAt
    }));

    res.status(200).json({
      success: true,
      images: formattedImages
    });
  } catch (error) {
    console.error('❌ Error loading image gallery:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تحميل الصور'
    });
  }
};

/**
 * ➕ حفظ صورة جديدة في الحافظة
 * POST /user/image-gallery
 */
const saveImageToGallery = async (req, res) => {
  try {
    // ✅ التحقق من وجود user authentication
    // Support both userId (from verifyToken) and id (from requireAuth)
    const userId = req.user?.userId || req.user?.id;
    const companyId = req.user?.companyId;
    const { fileUrl, filename, fileType, fileSize } = req.body;

    console.log('📥 Saving image to gallery:', {
      userId,
      companyId,
      filename,
      fileUrl,
      userObject: req.user
    });

    if (!userId || !companyId) {
      console.error('❌ Missing user authentication in POST:', {
        hasUser: !!req.user,
        userId,
        companyId,
        userObject: req.user
      });
      return res.status(401).json({
        success: false,
        message: 'المصادقة مطلوبة'
      });
    }

    // التحقق من البيانات المطلوبة
    if (!fileUrl || !filename) {
      return res.status(400).json({
        success: false,
        message: 'رابط الملف واسمه مطلوبان'
      });
    }

    // التحقق من عدم تكرار نفس الصورة
    const existingImage = await getSharedPrismaClient().imageGallery.findFirst({
      where: {
        userId: userId,
        companyId: companyId,
        fileUrl: fileUrl
      }
    });

    if (existingImage) {
      return res.status(200).json({
        success: true,
        message: 'الصورة موجودة بالفعل',
        image: {
          id: existingImage.id,
          url: existingImage.fileUrl,
          filename: existingImage.filename,
          uploadedAt: existingImage.createdAt
        }
      });
    }

    // حفظ الصورة الجديدة
    const newImage = await getSharedPrismaClient().imageGallery.create({
      data: {
        id: uuidv4(),
        userId: userId,
        companyId: companyId,
        filename: filename,
        fileUrl: fileUrl,
        fileType: fileType || 'image/jpeg',
        fileSize: fileSize || 0,
        updatedAt: new Date()
      }
    });

    res.status(201).json({
      success: true,
      message: 'تم حفظ الصورة بنجاح',
      image: {
        id: newImage.id,
        url: newImage.fileUrl,
        filename: newImage.filename,
        uploadedAt: newImage.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Error saving image to gallery:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حفظ الصورة'
    });
  }
};

/**
 * 🗑️ حذف صورة من الحافظة
 * DELETE /user/image-gallery/:id
 */
const deleteImageFromGallery = async (req, res) => {
  try {
    // ✅ التحقق من وجود user authentication
    // Support both userId (from verifyToken) and id (from requireAuth)
    const userId = req.user?.userId || req.user?.id;
    const companyId = req.user?.companyId;
    const imageId = req.params.id;

    if (!userId || !companyId) {
      return res.status(401).json({
        success: false,
        message: 'المصادقة مطلوبة'
      });
    }

    // التحقق من أن الصورة تخص المستخدم
    const image = await getSharedPrismaClient().imageGallery.findFirst({
      where: {
        id: imageId,
        userId: userId,
        companyId: companyId
      }
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'الصورة غير موجودة'
      });
    }

    // حذف الصورة
    await getSharedPrismaClient().imageGallery.delete({
      where: {
        id: imageId
      }
    });

    res.status(200).json({
      success: true,
      message: 'تم حذف الصورة بنجاح'
    });
  } catch (error) {
    console.error('❌ Error deleting image from gallery:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حذف الصورة'
    });
  }
};

/**
 * 📤 رفع وحفظ صورة في الحافظة مباشرة
 * POST /user/image-gallery/upload
 */
const uploadAndSaveImage = async (req, res) => {
  try {
    // ✅ التحقق من وجود user authentication
    const userId = req.user?.userId || req.user?.id;
    const companyId = req.user?.companyId;

    if (!userId || !companyId) {
      console.error('❌ Missing user authentication in UPLOAD:', {
        hasUser: !!req.user,
        userId,
        companyId
      });
      return res.status(401).json({
        success: false,
        message: 'المصادقة مطلوبة'
      });
    }

    // التحقق من وجود ملف
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم رفع أي ملف'
      });
    }

    const file = req.file;
    let currentFilename = file.filename;
    let currentSize = file.size;
    let currentMimetype = file.mimetype;

    // 🖼️ Process image if applicable
    if (isProcessableImage(file.mimetype)) {
      try {
        const processed = await processImage(file.path, path.dirname(file.path));
        currentFilename = processed.filename;
        currentSize = processed.size;
        currentMimetype = 'image/webp';
      } catch (procError) {
        console.error(`❌ [IMAGE-PROC] Error processing gallery image:`, procError.message);
      }
    }

    const imageUrl = `/uploads/products/${currentFilename}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${imageUrl}`;

    // حفظ الصورة في قاعدة البيانات
    const newImage = await getSharedPrismaClient().imageGallery.create({
      data: {
        id: uuidv4(),
        userId: userId,
        companyId: companyId,
        filename: file.originalname,
        fileUrl: fullUrl,
        fileType: currentMimetype,
        fileSize: currentSize,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Image uploaded and saved to gallery: ${newImage.id}`);

    res.status(201).json({
      success: true,
      message: 'تم رفع وحفظ الصورة بنجاح',
      image: {
        id: newImage.id,
        url: newImage.fileUrl,
        filename: newImage.filename,
        uploadedAt: newImage.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Error uploading to gallery:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء رفع الصورة'
    });
  }
};

module.exports = {
  getImageGallery,
  saveImageToGallery,
  deleteImageFromGallery,
  uploadAndSaveImage
};

