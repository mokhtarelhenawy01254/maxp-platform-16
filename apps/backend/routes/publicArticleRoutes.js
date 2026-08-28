const express = require('express');
const router = express.Router();
const articleController = require('../controller/articleController');
const { extractSubdomainMiddleware, requireCompany } = require('../middleware/subdomainMiddleware');

router.use(extractSubdomainMiddleware);
router.use(requireCompany);

router.get('/', articleController.getPublicArticles);
router.get('/:slug', articleController.getPublicArticleBySlug);

module.exports = router;
