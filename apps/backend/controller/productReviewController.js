const fs = require('fs');
const path = require('path');
const { getSharedPrismaClient } = require('../services/sharedDatabase');
const {
  deleteReviewMediaByReviewIds,
  getReviewMediaMap,
  saveReviewMedia,
} = require('../services/productReviewMediaService');
const { trackStorefrontAppUsage } = require('../services/storefrontAppUsageService');

// Helper function to get Prisma client
function getPrisma() {
  return getSharedPrismaClient();
}

async function logReviewAppUsage(payload) {
  try {
    await trackStorefrontAppUsage(payload);
  } catch (error) {
    console.error('Failed to track review app usage:', error);
  }
}

function cleanupUploadedFiles(files = []) {
  files.forEach((file) => {
    if (!file?.path) {
      return;
    }

    try {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      console.error('Failed to cleanup review media upload:', file.path, error.message);
    }
  });
}

function buildReviewMediaItems(files = []) {
  return files
    .filter((file) => file?.filename)
    .map((file) => ({
      type: file.mimetype?.startsWith('video/') ? 'video' : 'image',
      url: `/uploads/reviews/${file.filename}`,
      fileName: file.originalname || file.filename,
      mimeType: file.mimetype || null,
      fileSize: Number(file.size || 0) || null,
      alt: path.parse(file.originalname || file.filename || '').name || null,
    }));
}

async function attachMediaToReviews(reviews, prisma) {
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return [];
  }

  const mediaMap = await getReviewMediaMap(
    reviews.map((review) => review.id),
    prisma,
  );

  return reviews.map((review) => ({
    ...review,
    product: review.product || review.products || null,
    productName:
      review.productName ||
      review.product?.name ||
      review.products?.name ||
      null,
    media: mediaMap.get(review.id) || [],
  }));
}

async function resolveProductForCompany(prisma, companyId, productIdOrSlug) {
  if (!companyId || !productIdOrSlug) {
    return null;
  }

  return prisma.product.findFirst({
    where: {
      companyId,
      isActive: true,
      OR: [
        { id: productIdOrSlug },
        { slug: productIdOrSlug },
      ],
    },
    select: {
      id: true,
    },
  });
}

/**
 * ⭐ Controller لإدارة التقييمات والمراجعات
 */

/**
 * جلب التقييمات لمنتج
 * GET /api/v1/public/products/:productId/reviews
 */
exports.getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, minRating } = req.query;
    const companyId = req.company?.id || req.companyId;

    const prisma = getPrisma();
    const resolvedProduct = await resolveProductForCompany(
      prisma,
      companyId,
      productId,
    );

    if (!companyId || !resolvedProduct) {
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود',
      });
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 10, 1);

    const where = {
      productId: resolvedProduct.id,
      companyId,
      isApproved: true,
    };

    if (minRating) {
      where.rating = { gte: parseInt(minRating) };
    }

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
      }),
      prisma.productReview.count({ where })
    ]);

    // Calculate average rating
    const allReviews = await prisma.productReview.findMany({
      where: {
        productId: resolvedProduct.id,
        companyId,
        isApproved: true,
      },
      select: { rating: true }
    });

    const avgRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0;

    const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
      rating,
      count: allReviews.filter(r => r.rating === rating).length
    }));

    const hydratedReviews = await attachMediaToReviews(reviews, prisma);

    res.json({
      success: true,
      data: {
        reviews: hydratedReviews,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          pages: Math.ceil(total / limitNumber),
        },
        summary: {
          averageRating: Number(avgRating.toFixed(1)),
          totalReviews: allReviews.length,
          ratingDistribution
        }
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * إضافة تقييم جديد
 * POST /api/v1/public/products/:productId/reviews
 */
exports.createReview = async (req, res) => {
  const uploadedFiles = Array.isArray(req.files) ? req.files : [];
  let shouldCleanupFiles = uploadedFiles.length > 0;
  let createdReviewId = null;

  try {
    const { productId } = req.params;
    const { customerName, customerEmail, customerPhone, rating, title, comment } = req.body;
    const companyId = req.company?.id || req.companyId;
    const parsedRating = parseInt(rating, 10);

    if (!customerName || !rating) {
      cleanupUploadedFiles(uploadedFiles);
      shouldCleanupFiles = false;
      return res.status(400).json({
        success: false,
        error: 'الاسم والتقييم مطلوبان'
      });
    }

    if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      cleanupUploadedFiles(uploadedFiles);
      shouldCleanupFiles = false;
      return res.status(400).json({
        success: false,
        error: 'التقييم يجب أن يكون بين 1 و 5'
      });
    }

    const prisma = getPrisma();

    // Check if product exists
    const product = await resolveProductForCompany(prisma, companyId, productId);

    if (!product) {
      cleanupUploadedFiles(uploadedFiles);
      shouldCleanupFiles = false;
      return res.status(404).json({
        success: false,
        error: 'المنتج غير موجود'
      });
    }

    // Get storefront settings to check if moderation is enabled
    const settings = await prisma.storefrontSettings.findUnique({
      where: { companyId }
    });

    const isApproved = settings?.reviewsModerationEnabled === false;

    // Create review
    const review = await prisma.productReview.create({
      data: {
        productId: product.id,
        companyId,
        customerName,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        rating: parsedRating,
        title: title || null,
        comment: comment || null,
        isApproved
      }
    });
    createdReviewId = review.id;

    const reviewMediaItems = buildReviewMediaItems(uploadedFiles);
    let media = [];

    if (reviewMediaItems.length > 0) {
      try {
        media = await saveReviewMedia({
          reviewId: review.id,
          companyId,
          mediaItems: reviewMediaItems,
          prisma,
        });
        shouldCleanupFiles = false;
      } catch (mediaError) {
        await deleteReviewMediaByReviewIds([review.id], prisma).catch(() => {});
        await prisma.productReview.delete({
          where: { id: review.id }
        }).catch(() => {});
        throw mediaError;
      }
    } else {
      shouldCleanupFiles = false;
    }

    await logReviewAppUsage({
      companyId,
      slug: 'ugc-reviews-pro',
      feature: 'review_submitted',
      metadata: {
        productId: product.id,
        rating: parsedRating,
        approvedImmediately: Boolean(isApproved),
        mediaCount: media.length,
      },
    });

    res.json({
      success: true,
      message: isApproved
        ? 'تم إضافة التقييم بنجاح'
        : 'تم إرسال التقييم وانتظار الموافقة',
      data: {
        ...review,
        media,
      }
    });
  } catch (error) {
    if (shouldCleanupFiles) {
      cleanupUploadedFiles(uploadedFiles);
    }

    if (createdReviewId) {
      try {
        const prisma = getPrisma();
        await deleteReviewMediaByReviewIds([createdReviewId], prisma);
      } catch (cleanupError) {
        console.error('Failed to cleanup review media after error:', cleanupError);
      }
    }

    console.error('Error creating review:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * تحديث تقييم (للمساعدة - helpful)
 * PUT /api/v1/public/reviews/:reviewId/helpful
 */
exports.markHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const prisma = getPrisma();

    const review = await prisma.productReview.update({
      where: { id: reviewId },
      data: {
        helpfulCount: { increment: 1 }
      }
    });

    await logReviewAppUsage({
      companyId: review.companyId,
      slug: 'ugc-reviews-pro',
      feature: 'review_marked_helpful',
      metadata: {
        reviewId: review.id,
        productId: review.productId,
      },
    });

    res.json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error('Error marking review as helpful:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * جلب جميع التقييمات (للإدارة)
 * GET /api/v1/reviews
 */
exports.getAllReviews = async (req, res) => {
  try {
    // Check if req.user exists
    if (!req.user) {
      console.error('❌ [REVIEWS] req.user is missing');
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Get companyId from req.user
    // JWT token structure: { userId, email, role, companyId, ... }
    const companyId = req.user.companyId;

    console.log('🔍 [REVIEWS] req.user:', {
      id: req.user.id || req.user.userId,
      email: req.user.email,
      companyId: companyId,
      role: req.user.role,
      fullUser: req.user
    });

    if (!companyId) {
      console.error('❌ [REVIEWS] Company ID not found in req.user:', req.user);
      return res.status(400).json({
        success: false,
        error: 'Company ID not found in user data',
        debug: {
          userId: req.user.id || req.user.userId,
          hasCompanyId: !!req.user.companyId,
          hasCompany: !!req.user.company
        }
      });
    }

    const { page = 1, limit = 20, isApproved, rating, productId, search } = req.query;

    const prisma = getPrisma();

    const where = {
      companyId
    };

    if (isApproved !== undefined) {
      where.isApproved = isApproved === 'true';
    }

    if (rating) {
      where.rating = parseInt(rating);
    }

    if (productId) {
      where.productId = productId;
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { title: { contains: search } },
        { comment: { contains: search } },
        { product: { name: { contains: search } } }
      ];
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const limitNumber = Math.max(parseInt(limit, 10) || 20, 1);

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (pageNumber - 1) * limitNumber,
        take: limitNumber,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true
            }
          }
        }
      }),
      prisma.productReview.count({ where })
    ]);

    const hydratedReviews = await attachMediaToReviews(reviews, prisma);

    res.json({
      success: true,
      data: {
        reviews: hydratedReviews,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          pages: Math.ceil(total / limitNumber)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching all reviews:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * الموافقة على تقييم
 * PUT /api/v1/reviews/:reviewId/approve
 */
exports.approveReview = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const companyId = req.user.companyId || req.user.company?.id;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID not found in user data'
      });
    }

    const { reviewId } = req.params;

    const prisma = getPrisma();

    // Check if review exists and belongs to company
    const review = await prisma.productReview.findFirst({
      where: {
        id: reviewId,
        companyId
      }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'التقييم غير موجود'
      });
    }

    const updatedReview = await prisma.productReview.update({
      where: { id: reviewId },
      data: {
        isApproved: true
      },
      include: {
        product: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    await logReviewAppUsage({
      companyId,
      slug: 'ugc-reviews-pro',
      feature: 'review_approved',
      metadata: {
        reviewId: updatedReview.id,
        productId: updatedReview.productId,
      },
    });

    res.json({
      success: true,
      message: 'تم الموافقة على التقييم بنجاح',
      data: updatedReview
    });
  } catch (error) {
    console.error('Error approving review:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * رفض/إلغاء الموافقة على تقييم
 * PUT /api/v1/reviews/:reviewId/reject
 */
exports.rejectReview = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const companyId = req.user.companyId || req.user.company?.id;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID not found in user data'
      });
    }

    const { reviewId } = req.params;

    const prisma = getPrisma();

    // Check if review exists and belongs to company
    const review = await prisma.productReview.findFirst({
      where: {
        id: reviewId,
        companyId
      }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'التقييم غير موجود'
      });
    }

    const updatedReview = await prisma.productReview.update({
      where: { id: reviewId },
      data: {
        isApproved: false
      },
      include: {
        product: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    await logReviewAppUsage({
      companyId,
      slug: 'ugc-reviews-pro',
      feature: 'review_rejected',
      metadata: {
        reviewId: updatedReview.id,
        productId: updatedReview.productId,
      },
    });

    res.json({
      success: true,
      message: 'تم رفض التقييم',
      data: updatedReview
    });
  } catch (error) {
    console.error('Error rejecting review:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * حذف تقييم
 * DELETE /api/v1/reviews/:reviewId
 */
exports.deleteReview = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const companyId = req.user.companyId || req.user.company?.id;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        error: 'Company ID not found in user data'
      });
    }

    const { reviewId } = req.params;

    const prisma = getPrisma();

    // Check if review exists and belongs to company
    const review = await prisma.productReview.findFirst({
      where: {
        id: reviewId,
        companyId
      }
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'التقييم غير موجود'
      });
    }

    await deleteReviewMediaByReviewIds([reviewId], prisma);

    await prisma.productReview.delete({
      where: { id: reviewId }
    });

    await logReviewAppUsage({
      companyId,
      slug: 'ugc-reviews-pro',
      feature: 'review_deleted',
      metadata: {
        reviewId,
        productId: review.productId,
      },
    });

    res.json({
      success: true,
      message: 'تم حذف التقييم بنجاح'
    });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * تنفيذ إجراء جماعي
 * POST /api/v1/reviews/bulk-action
 */
exports.bulkAction = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const companyId = req.user.companyId || req.user.company?.id;

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID not found' });
    }

    const { action, ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'يجب تحديد عناصر للعملية' });
    }

    const prisma = getPrisma();

    let result;
    let feature = '';
    if (action === 'approve') {
      feature = 'reviews_bulk_approved';
      result = await prisma.productReview.updateMany({
        where: { id: { in: ids }, companyId },
        data: { isApproved: true }
      });
    } else if (action === 'reject') {
      feature = 'reviews_bulk_rejected';
      result = await prisma.productReview.updateMany({
        where: { id: { in: ids }, companyId },
        data: { isApproved: false }
      });
    } else if (action === 'delete') {
      feature = 'reviews_bulk_deleted';
      const reviewsToDelete = await prisma.productReview.findMany({
        where: { id: { in: ids }, companyId },
        select: { id: true }
      });
      await deleteReviewMediaByReviewIds(
        reviewsToDelete.map((review) => review.id),
        prisma,
      );
      result = await prisma.productReview.deleteMany({
        where: { id: { in: ids }, companyId }
      });
    } else {
      return res.status(400).json({ success: false, error: 'إجراء غير صالح' });
    }

    await logReviewAppUsage({
      companyId,
      slug: 'ugc-reviews-pro',
      feature,
      quantity: ids.length,
      metadata: {
        action,
        count: ids.length,
      },
    });

    res.json({
      success: true,
      message: 'تم تنفيذ العملية بنجاح',
      data: result
    });
  } catch (error) {
    console.error('Error in bulk action:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

