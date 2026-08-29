const express = require('express');
const router = express.Router();
const articleController = require('../controller/articleController');
const verifyToken = require('../utils/verifyToken');

// Authenticated (company owner) routes
router.get('/', verifyToken.authenticateToken, articleController.getArticles);
router.get('/:id', verifyToken.authenticateToken, articleController.getArticle);
router.post('/', verifyToken.authenticateToken, articleController.createArticle);
router.put('/:id', verifyToken.authenticateToken, articleController.updateArticle);
router.delete('/:id', verifyToken.authenticateToken, articleController.deleteArticle);

module.exports = router;
