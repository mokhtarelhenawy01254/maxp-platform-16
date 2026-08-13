const { getSharedPrismaClient } = require('../services/sharedDatabase');
const tiktokPublishService = require('../services/tiktok/tiktokPublishService');
const tiktokOAuthService = require('../services/tiktok/tiktokOAuthService');

const getCompanyId = (req) => req.user?.companyId;

const getAccountStatus = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, error: 'غير مصرح' });
    }

    const account = await tiktokOAuthService.getAccount(companyId);
    if (!account) {
      return res.json({ success: true, data: { connected: false } });
    }

    res.json({
      success: true,
      data: {
        connected: true,
        openId: account.openId,
        displayName: account.displayName,
        avatarUrl: account.avatarUrl,
        status: account.status,
        tokenExpiresAt: account.tokenExpiresAt,
      },
    });
  } catch (error) {
    console.error('[TIKTOK-PUBLISH] getAccountStatus error:', error?.message || error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب حالة الحساب' });
  }
};

const createPublish = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, error: 'غير مصرح' });
    }

    const { videoUrl, caption, privacyLevel } = req.body;
    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.trim()) {
      return res.status(400).json({ success: false, error: 'رابط الفيديو مطلوب' });
    }

    const account = await tiktokOAuthService.getAccount(companyId);
    if (!account) {
      return res.status(400).json({ success: false, error: 'اربط حساب TikTok أولاً' });
    }

    const accessToken = await tiktokOAuthService.getValidAccessToken(account, companyId);
    if (!accessToken) {
      return res.status(400).json({ success: false, error: 'توكن حساب TikTok غير صالح، أعد ربط الحساب' });
    }

    const post = await tiktokPublishService.initPublish({
      companyId,
      account,
      videoUrl: videoUrl.trim(),
      caption: caption || '',
      privacyLevel,
    });

    res.json({ success: true, data: post });
  } catch (error) {
    if (error && error.code) {
      return res.status(400).json({ success: false, error: error.message || 'فشل بدء النشر' });
    }
    console.error('[TIKTOK-PUBLISH] createPublish error:', error?.message || error);
    res.status(500).json({ success: false, error: 'حدث خطأ في نشر الفيديو' });
  }
};

const listPosts = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, error: 'غير مصرح' });
    }

    const { page, limit, status } = req.query;
    const result = await tiktokPublishService.listPosts({
      companyId,
      page,
      limit,
      status: status || undefined,
    });

    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    console.error('[TIKTOK-PUBLISH] listPosts error:', error?.message || error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المنشورات' });
  }
};

const getPost = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, error: 'غير مصرح' });
    }

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const post = await prisma.tiktokPost.findFirst({ where: { id, companyId } });
    if (!post) {
      return res.status(404).json({ success: false, error: 'المنشور غير موجود' });
    }

    const refreshed = await tiktokPublishService.pollStatus(prisma, post);
    res.json({ success: true, data: refreshed });
  } catch (error) {
    if (error && error.code) {
      return res.status(400).json({ success: false, error: error.message || 'فشل جلب حالة المنشور' });
    }
    console.error('[TIKTOK-PUBLISH] getPost error:', error?.message || error);
    res.status(500).json({ success: false, error: 'حدث خطأ في جلب المنشور' });
  }
};

const refreshPost = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, error: 'غير مصرح' });
    }

    const { id } = req.params;
    const post = await tiktokPublishService.refreshStatus({ companyId, postId: id });
    res.json({ success: true, data: post });
  } catch (error) {
    if (error && error.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: 'المنشور غير موجود' });
    }
    if (error && error.code) {
      return res.status(400).json({ success: false, error: error.message || 'فشل تحديث حالة المنشور' });
    }
    console.error('[TIKTOK-PUBLISH] refreshPost error:', error?.message || error);
    res.status(500).json({ success: false, error: 'حدث خطأ في تحديث حالة المنشور' });
  }
};

module.exports = {
  getAccountStatus,
  createPublish,
  listPosts,
  getPost,
  refreshPost,
};
