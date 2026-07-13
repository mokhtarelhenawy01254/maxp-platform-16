const { getSharedPrismaClient } = require('../services/sharedDatabase');
const inboxNotificationService = require('../services/inboxNotificationService');

/**
 * @route POST /api/v1/internal-notes
 * @desc Create internal note on a conversation
 */
exports.createNote = async (req, res) => {
  try {
    const { conversationId, content, type, mentionUserIds = [], requestAssistance = false } = req.body;
    if (!conversationId || !content) {
      return res.status(400).json({ error: 'Conversation ID and content are required' });
    }

    const prisma = getSharedPrismaClient();
    const note = await prisma.conversationModeratorNote.create({
      data: {
        conversationId,
        companyId: req.user.companyId,
        authorId: req.user.id,
        content,
        type: type || (requestAssistance ? 'assistance_request' : 'note')
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        }
      }
    });

    const uniqueMentionUserIds = Array.isArray(mentionUserIds)
      ? [...new Set(mentionUserIds.filter(Boolean))]
      : [];

    for (const mentionedUserId of uniqueMentionUserIds) {
      if (mentionedUserId === req.user.id) {
        continue;
      }

      await inboxNotificationService.createNotification(
        req.user.companyId,
        mentionedUserId,
        requestAssistance ? 'assistance_request' : 'mention',
        requestAssistance ? 'تم طلب مساعدتك في محادثة' : 'تمت الإشارة إليك في تعليق داخلي',
        content.substring(0, 140),
        null,
        conversationId,
        {
          noteId: note.id,
          authorId: req.user.id
        }
      );
    }

    res.status(201).json({ success: true, note });
  } catch (error) {
    console.error('[NotesController] createNote error:', error.message);
    res.status(500).json({ error: 'Failed to create note' });
  }
};

/**
 * @route GET /api/v1/internal-notes/:conversationId
 * @desc Get all notes for a conversation
 */
exports.getConversationNotes = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const prisma = getSharedPrismaClient();

    const notes = await prisma.conversationModeratorNote.findMany({
      where: { conversationId, companyId: req.user.companyId },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, notes });
  } catch (error) {
    console.error('[NotesController] getConversationNotes error:', error.message);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

/**
 * @route PATCH /api/v1/internal-notes/:noteId
 * @desc Update a note
 */
exports.updateNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const { content, isPinned } = req.body;
    const prisma = getSharedPrismaClient();

    const note = await prisma.conversationModeratorNote.findFirst({
      where: { id: noteId, companyId: req.user.companyId }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.authorId !== req.user.id && req.user.role !== 'COMPANY_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'You can only edit your own notes' });
    }

    const updated = await prisma.conversationModeratorNote.update({
      where: { id: noteId },
      data: {
        ...(content !== undefined && { content }),
        ...(isPinned !== undefined && { isPinned })
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatar: true }
        }
      }
    });

    res.json({ success: true, note: updated });
  } catch (error) {
    console.error('[NotesController] updateNote error:', error.message);
    res.status(500).json({ error: 'Failed to update note' });
  }
};

/**
 * @route DELETE /api/v1/internal-notes/:noteId
 * @desc Delete a note
 */
exports.deleteNote = async (req, res) => {
  try {
    const { noteId } = req.params;
    const prisma = getSharedPrismaClient();

    const note = await prisma.conversationModeratorNote.findFirst({
      where: { id: noteId, companyId: req.user.companyId }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.authorId !== req.user.id && req.user.role !== 'COMPANY_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'You can only delete your own notes' });
    }

    await prisma.conversationModeratorNote.delete({ where: { id: noteId } });
    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    console.error('[NotesController] deleteNote error:', error.message);
    res.status(500).json({ error: 'Failed to delete note' });
  }
};

/**
 * @route POST /api/v1/internal-notes/tags
 * @desc Add tags to a conversation
 */
exports.addTag = async (req, res) => {
  try {
    const { conversationId, tag, color } = req.body;
    if (!conversationId || !tag) {
      return res.status(400).json({ error: 'Conversation ID and tag are required' });
    }

    const prisma = getSharedPrismaClient();
    const tagRecord = await prisma.conversationTag.create({
      data: {
        conversationId,
        companyId: req.user.companyId,
        tag,
        color: color || '#6366f1',
        createdBy: req.user.id
      }
    });

    res.status(201).json({ success: true, tag: tagRecord });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Tag already exists on this conversation' });
    }
    console.error('[NotesController] addTag error:', error.message);
    res.status(500).json({ error: 'Failed to add tag' });
  }
};

/**
 * @route DELETE /api/v1/internal-notes/tags/:tagId
 * @desc Remove a tag from a conversation
 */
exports.removeTag = async (req, res) => {
  try {
    const { tagId } = req.params;
    const prisma = getSharedPrismaClient();

    const tag = await prisma.conversationTag.findFirst({
      where: { id: tagId, companyId: req.user.companyId }
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    await prisma.conversationTag.delete({ where: { id: tagId } });
    res.json({ success: true, message: 'Tag removed' });
  } catch (error) {
    console.error('[NotesController] removeTag error:', error.message);
    res.status(500).json({ error: 'Failed to remove tag' });
  }
};

/**
 * @route GET /api/v1/internal-notes/tags/:conversationId
 * @desc Get all tags for a conversation
 */
exports.getConversationTags = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const prisma = getSharedPrismaClient();

    const tags = await prisma.conversationTag.findMany({
      where: { conversationId, companyId: req.user.companyId }
    });

    res.json({ success: true, tags });
  } catch (error) {
    console.error('[NotesController] getConversationTags error:', error.message);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
};
