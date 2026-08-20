const { getSharedPrismaClient } = require('../services/sharedDatabase');
const tiktokPublishService = require('../services/tiktok/tiktokPublishService');
const tiktokOAuthService = require('../services/tiktok/tiktokOAuthService');

const getCompanyId = (req) => req.user?.companyId;

const getAccountStatus = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });
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
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪¡╪º┘ä╪⌐ ╪º┘ä╪¡╪│╪º╪¿' });
  }
};

const createPublish = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });
    }

    const { videoUrl, caption, privacyLevel } = req.body;
    if (!videoUrl || typeof videoUrl !== 'string' || !videoUrl.trim()) {
      return res.status(400).json({ success: false, error: '╪▒╪º╪¿╪╖ ╪º┘ä┘ü┘è╪»┘è┘ê ┘à╪╖┘ä┘ê╪¿' });
    }

    const account = await tiktokOAuthService.getAccount(companyId);
    if (!account) {
      return res.status(400).json({ success: false, error: '╪º╪▒╪¿╪╖ ╪¡╪│╪º╪¿ TikTok ╪ú┘ê┘ä╪º┘ï' });
    }

    const accessToken = await tiktokOAuthService.getValidAccessToken(account, companyId);
    if (!accessToken) {
      return res.status(400).json({ success: false, error: '╪¬┘ê┘â┘å ╪¡╪│╪º╪¿ TikTok ╪║┘è╪▒ ╪╡╪º┘ä╪¡╪î ╪ú╪╣╪» ╪▒╪¿╪╖ ╪º┘ä╪¡╪│╪º╪¿' });
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
      return res.status(400).json({ success: false, error: error.message || '┘ü╪┤┘ä ╪¿╪»╪í ╪º┘ä┘å╪┤╪▒' });
    }
    console.error('[TIKTOK-PUBLISH] createPublish error:', error?.message || error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ┘å╪┤╪▒ ╪º┘ä┘ü┘è╪»┘è┘ê' });
  }
};

const listPosts = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });
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
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä┘à┘å╪┤┘ê╪▒╪º╪¬' });
  }
};

const getPost = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });
    }

    const { id } = req.params;
    const prisma = getSharedPrismaClient();
    const post = await prisma.tikTokPost.findFirst({ where: { id, companyId } });
    if (!post) {
      return res.status(404).json({ success: false, error: '╪º┘ä┘à┘å╪┤┘ê╪▒ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });
    }

    const refreshed = await tiktokPublishService.pollStatus(prisma, post);
    res.json({ success: true, data: refreshed });
  } catch (error) {
    if (error && error.code) {
      return res.status(400).json({ success: false, error: error.message || '┘ü╪┤┘ä ╪¼┘ä╪¿ ╪¡╪º┘ä╪⌐ ╪º┘ä┘à┘å╪┤┘ê╪▒' });
    }
    console.error('[TIKTOK-PUBLISH] getPost error:', error?.message || error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¼┘ä╪¿ ╪º┘ä┘à┘å╪┤┘ê╪▒' });
  }
};

const refreshPost = async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ success: false, error: '╪║┘è╪▒ ┘à╪╡╪▒╪¡' });
    }

    const { id } = req.params;
    const post = await tiktokPublishService.refreshStatus({ companyId, postId: id });
    res.json({ success: true, data: post });
  } catch (error) {
    if (error && error.code === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: '╪º┘ä┘à┘å╪┤┘ê╪▒ ╪║┘è╪▒ ┘à┘ê╪¼┘ê╪»' });
    }
    if (error && error.code) {
      return res.status(400).json({ success: false, error: error.message || '┘ü╪┤┘ä ╪¬╪¡╪»┘è╪½ ╪¡╪º┘ä╪⌐ ╪º┘ä┘à┘å╪┤┘ê╪▒' });
    }
    console.error('[TIKTOK-PUBLISH] refreshPost error:', error?.message || error);
    res.status(500).json({ success: false, error: '╪¡╪»╪½ ╪«╪╖╪ú ┘ü┘è ╪¬╪¡╪»┘è╪½ ╪¡╪º┘ä╪⌐ ╪º┘ä┘à┘å╪┤┘ê╪▒' });
  }
};

module.exports = {
  getAccountStatus,
  createPublish,
  listPosts,
  getPost,
  refreshPost,
};
