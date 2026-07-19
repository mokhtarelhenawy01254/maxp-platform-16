/**
 * postDetailsController.js
 * تفاصيل البوستات وربطها بمنتجات داخل المحادثات.
 */

const { getSharedPrismaClient } = require('../../services/sharedDatabase');
const { proxyFacebookMediaUrl } = require('../../utils/facebookMediaProxy');

const POST_PRODUCT_LINK_ROLES = new Set([
    'SUPER_ADMIN',
    'OWNER',
    'COMPANY_ADMIN',
    'MANAGER'
]);

const sendOptionalPostDetailsUnavailable = (res, message, unavailableReason) =>
    res.json({
        success: true,
        data: null,
        unavailable: true,
        unavailableReason,
        message
    });

const formatPostDetailsResponse = (postDetails, pageId, pageName) => ({
    postId: postDetails.postId,
    message: postDetails.message,
    permalinkUrl: postDetails.permalinkUrl,
    fullPicture: proxyFacebookMediaUrl(postDetails.fullPicture),
    hasImages: postDetails.hasImages,
    imageUrls: Array.isArray(postDetails.imageUrls)
        ? postDetails.imageUrls.map((imageUrl) => proxyFacebookMediaUrl(imageUrl))
        : [],
    pageId,
    pageName
});

const canManagePostProductLink = (user) => POST_PRODUCT_LINK_ROLES.has(user?.role);

const sendPostProductLinkForbidden = (res) =>
    res.status(403).json({
        success: false,
        message: 'ليس لديك صلاحية لإدارة ربط منتجات البوستات'
    });

const parseConversationMetadata = (metadata) => {
    if (!metadata) return {};
    if (typeof metadata === 'object') return metadata;
    try {
        return JSON.parse(metadata);
    } catch (_error) {
        return {};
    }
};

// Get post details for a conversation (lazy loading)
const getConversationPostDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const companyId = req.user?.companyId;

        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
            });
        }

        const conversation = await getSharedPrismaClient().conversation.findFirst({
            where: {
                id,
                companyId
            },
            select: {
                id: true,
                metadata: true
            }
        });

        if (!conversation) {
            return res.status(404).json({
                success: false,
                message: 'المحادثة غير موجودة'
            });
        }

        const metadata = parseConversationMetadata(conversation.metadata);
        const postId = metadata.postId;
        const pageId = metadata.pageId;

        if (!postId) {
            return sendOptionalPostDetailsUnavailable(
                res,
                'لا يوجد postId مرتبط بهذه المحادثة',
                'missing_post_id'
            );
        }

        if (!pageId) {
            return sendOptionalPostDetailsUnavailable(
                res,
                'لا يوجد pageId مرتبط بهذه المحادثة',
                'missing_page_id'
            );
        }

        const facebookPage = await getSharedPrismaClient().facebookPage.findFirst({
            where: {
                pageId,
                companyId,
                status: 'connected'
            },
            select: {
                pageAccessToken: true,
                pageName: true
            }
        });

        if (!facebookPage || !facebookPage.pageAccessToken) {
            return sendOptionalPostDetailsUnavailable(
                res,
                'لم يتم العثور على صفحة Facebook أو لا يوجد access token',
                'missing_page_access'
            );
        }

        const postDetailsService = require('../../utils/postDetailsService');
        const postDetails = await postDetailsService.getFacebookPostDetails(
            postId,
            facebookPage.pageAccessToken,
            pageId
        );

        if (!postDetails) {
            return sendOptionalPostDetailsUnavailable(
                res,
                'فشل في جلب تفاصيل المنشور من Facebook',
                'facebook_post_unavailable'
            );
        }

        return res.json({
            success: true,
            data: formatPostDetailsResponse(postDetails, pageId, facebookPage.pageName)
        });
    } catch (error) {
        console.error('Error fetching conversation post details:', error);
        return res.status(500).json({
            success: false,
            error: 'خطأ في الخادم',
            message: error.message
        });
    }
};

// Get post details from Facebook
const getPostDetails = async (req, res) => {
    try {
        const { postId } = req.params;
        const { pageId } = req.query;
        const user = req.user;
        let companyId = user?.companyId;

        if (!canManagePostProductLink(user)) {
            return sendPostProductLinkForbidden(res);
        }

        if (user?.role === 'SUPER_ADMIN') {
            companyId = req.query.companyId || companyId;
        }

        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
            });
        }

        if (!postId) {
            return res.status(400).json({
                success: false,
                message: 'معرف البوست مطلوب'
            });
        }

        let foundPageId = pageId;

        if (!foundPageId) {
            const conversations = await getSharedPrismaClient().conversation.findMany({
                where: {
                    companyId,
                    metadata: {
                        not: null
                    }
                },
                select: {
                    metadata: true
                },
                take: 1000
            });

            for (const conversation of conversations) {
                const metadata = parseConversationMetadata(conversation.metadata);
                if (metadata.postId === postId && metadata.pageId) {
                    foundPageId = metadata.pageId;
                    break;
                }
            }

            if (!foundPageId) {
                const allPages = await getSharedPrismaClient().facebookPage.findMany({
                    where: {
                        companyId,
                        status: 'connected'
                    },
                    select: {
                        pageId: true,
                        pageAccessToken: true,
                        pageName: true
                    }
                });

                const postDetailsService = require('../../utils/postDetailsService');
                for (const page of allPages) {
                    try {
                        const postDetails = await postDetailsService.getFacebookPostDetails(
                            postId,
                            page.pageAccessToken,
                            page.pageId
                        );
                        if (postDetails) {
                            foundPageId = page.pageId;
                            break;
                        }
                    } catch (_error) {
                        // Try the next connected page.
                    }
                }
            }
        }

        if (!foundPageId) {
            return res.status(404).json({
                success: false,
                message: 'لم يتم العثور على صفحة Facebook مرتبطة بهذا البوست'
            });
        }

        const facebookPage = await getSharedPrismaClient().facebookPage.findFirst({
            where: {
                pageId: foundPageId,
                companyId,
                status: 'connected'
            },
            select: {
                pageAccessToken: true,
                pageName: true
            }
        });

        if (!facebookPage || !facebookPage.pageAccessToken) {
            return res.status(404).json({
                success: false,
                message: 'لم يتم العثور على صفحة Facebook أو لا يوجد access token'
            });
        }

        const postDetailsService = require('../../utils/postDetailsService');
        const postDetails = await postDetailsService.getFacebookPostDetails(
            postId,
            facebookPage.pageAccessToken,
            foundPageId
        );

        if (!postDetails) {
            return res.status(404).json({
                success: false,
                message: 'فشل في جلب تفاصيل المنشور من Facebook'
            });
        }

        return res.json({
            success: true,
            data: formatPostDetailsResponse(postDetails, foundPageId, facebookPage.pageName)
        });
    } catch (error) {
        console.error('Error fetching post details:', error);
        return res.status(500).json({
            success: false,
            error: 'خطأ في الخادم',
            message: error.message
        });
    }
};

// Update featured product for a post
const updatePostFeaturedProduct = async (req, res) => {
    try {
        const { postId } = req.params;
        const { featuredProductId } = req.body;
        const user = req.user;
        let companyId = user?.companyId;

        if (!canManagePostProductLink(user)) {
            return sendPostProductLinkForbidden(res);
        }

        if (user?.role === 'SUPER_ADMIN') {
            companyId = req.body.companyId || req.query.companyId || companyId;
        }

        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: 'غير مصرح بالوصول - معرف الشركة مطلوب'
            });
        }

        if (!postId) {
            return res.status(400).json({
                success: false,
                message: 'معرف البوست مطلوب'
            });
        }

        if (featuredProductId) {
            const product = await getSharedPrismaClient().product.findFirst({
                where: {
                    id: featuredProductId,
                    companyId,
                    isActive: true
                }
            });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'المنتج غير موجود أو غير نشط'
                });
            }
        }

        let postSettings = await getSharedPrismaClient().postResponseSettings.findUnique({
            where: {
                postId_companyId: {
                    postId,
                    companyId
                }
            }
        });

        if (postSettings) {
            postSettings = await getSharedPrismaClient().postResponseSettings.update({
                where: {
                    postId_companyId: {
                        postId,
                        companyId
                    }
                },
                data: {
                    featuredProductId: featuredProductId || null
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            price: true
                        }
                    }
                }
            });
        } else {
            postSettings = await getSharedPrismaClient().postResponseSettings.create({
                data: {
                    postId,
                    companyId,
                    responseMethod: 'manual',
                    featuredProductId: featuredProductId || null
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            price: true
                        }
                    }
                }
            });
        }

        return res.json({
            success: true,
            data: {
                postId,
                featuredProduct: postSettings.product,
                featuredProductId: postSettings.featuredProductId
            }
        });
    } catch (error) {
        console.error('Error updating post featured product:', error);
        return res.status(500).json({
            success: false,
            error: 'خطأ في الخادم',
            message: error.message
        });
    }
};

module.exports = {
    getConversationPostDetails,
    getPostDetails,
    updatePostFeaturedProduct
};
