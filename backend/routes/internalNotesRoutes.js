const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbacMiddleware');
const { conversationAccessGuard } = require('../middleware/numberAccessGuard');
const notesController = require('../controller/internalNotesController');

router.use(requireAuth);

// ─── Notes ────────────────────────────────────────────────────────

router.get(
  '/:conversationId',
  conversationAccessGuard,
  requirePermission('notes.view'),
  notesController.getConversationNotes
);

router.post(
  '/',
  conversationAccessGuard,
  requirePermission('notes.create'),
  notesController.createNote
);

router.patch(
  '/:noteId',
  requirePermission('notes.create'),
  notesController.updateNote
);

router.delete(
  '/:noteId',
  requirePermission('notes.create'),
  notesController.deleteNote
);

// ─── Tags ─────────────────────────────────────────────────────────

router.get(
  '/tags/:conversationId',
  conversationAccessGuard,
  requirePermission('tags.manage'),
  notesController.getConversationTags
);

router.post(
  '/tags',
  conversationAccessGuard,
  requirePermission('tags.manage'),
  notesController.addTag
);

router.delete(
  '/tags/:tagId',
  requirePermission('tags.manage'),
  notesController.removeTag
);

module.exports = router;
