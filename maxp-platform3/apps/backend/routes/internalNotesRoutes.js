const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const { requireDbPermission } = require('../middleware/rbacMiddleware');
const { conversationAccessGuard } = require('../middleware/numberAccessGuard');
const notesController = require('../controller/internalNotesController');

router.use(verifyToken.authenticateToken);

// ─── Notes ────────────────────────────────────────────────────────

router.get(
  '/:conversationId',
  conversationAccessGuard,
  requireDbPermission('notes.view'),
  notesController.getConversationNotes
);

router.post(
  '/',
  conversationAccessGuard,
  requireDbPermission('notes.create'),
  notesController.createNote
);

router.patch(
  '/:noteId',
  requireDbPermission('notes.create'),
  notesController.updateNote
);

router.delete(
  '/:noteId',
  requireDbPermission('notes.create'),
  notesController.deleteNote
);

// ─── Tags ─────────────────────────────────────────────────────────

router.get(
  '/tags/:conversationId',
  conversationAccessGuard,
  requireDbPermission('tags.manage'),
  notesController.getConversationTags
);

router.post(
  '/tags',
  conversationAccessGuard,
  requireDbPermission('tags.manage'),
  notesController.addTag
);

router.delete(
  '/tags/:tagId',
  requireDbPermission('tags.manage'),
  notesController.removeTag
);

module.exports = router;
