const fbPostService = require('../services/facebookPostService');

const getPosts = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.companyId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { isProduct, pageId, limit, offset } = req.query;
    const filters = {};
    if (isProduct !== undefined) filters.isProduct = isProduct === 'true';
    if (pageId) filters.pageId = pageId;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);

    const posts = await fbPostService.getPosts(user.companyId, filters);
    res.json({ success: true, data: posts });
  } catch (error) {
    console.error('[FB-POST] Error fetching posts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const syncPosts = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.companyId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { pageId } = req.body;
    if (!pageId) return res.status(400).json({ success: false, error: 'pageId is required' });

    const result = await fbPostService.syncPagePosts(pageId, user.companyId);
    res.json({ success: true, data: result });
  } catch (error) {
    const errMsg = error?.message || '';
    const raw = error?.response?.data?.error || {};
    const isPermErr = (raw.code === 10 || raw.code === 100) &&
      /pages_read_engagement/i.test(raw.message || '') ||
      /pages_read_engagement/i.test(errMsg);
    if (isPermErr) {
      return res.status(400).json({
        success: false,
        error: `تعذرت مزامنة المنشورات: صلاحية صفحة الفيسبوك لا تحتوي على الإذن المطلوب. يرجى فصل الصفحة وإعادة ربطها لمنح جميع الأذونات المطلوبة.`
      });
    }
    console.error('[FB-POST] Error syncing posts:', errMsg);
    res.status(500).json({ success: false, error: errMsg || 'Sync failed' });
  }
};

const setPostProduct = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.companyId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id } = req.params;
    const { productId } = req.body;

    const post = await fbPostService.setProduct(id, productId || null);
    res.json({ success: true, data: post });
  } catch (error) {
    console.error('[FB-POST] Error setting product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getPosts, syncPosts, setPostProduct };
