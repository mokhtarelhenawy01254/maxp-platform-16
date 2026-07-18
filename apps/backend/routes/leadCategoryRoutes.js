const express = require('express');
const router = express.Router();
const leadCategoryController = require('../controller/leadCategoryController');
const verifyToken = require('../utils/verifyToken');

router.get('/', verifyToken.authenticateToken, (req, res) => leadCategoryController.list(req, res));
router.get('/:id/contacts', verifyToken.authenticateToken, (req, res) => leadCategoryController.getContacts(req, res));
router.post('/', verifyToken.authenticateToken, (req, res) => leadCategoryController.create(req, res));
router.put('/:id', verifyToken.authenticateToken, (req, res) => leadCategoryController.update(req, res));
router.delete('/:id', verifyToken.authenticateToken, (req, res) => leadCategoryController.delete(req, res));

module.exports = router;
