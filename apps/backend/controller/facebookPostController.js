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

    const result = await fbPostService.syncPagePosts(pageId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[FB-POST] Error syncing posts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const toggleProduct = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.companyId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const { id } = req.params;
    const { isProduct } = req.body;
    if (isProduct === undefined) return res.status(400).json({ success: false, error: 'isProduct is required' });

    const post = await fbPostService.toggleProductLabel(id, isProduct);
    res.json({ success: true, data: post });
  } catch (error) {
    console.error('[FB-POST] Error toggling product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getPosts, syncPosts, toggleProduct };
