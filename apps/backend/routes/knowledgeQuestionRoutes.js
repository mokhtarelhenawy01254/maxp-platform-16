const express = require('express');
const router = express.Router();
const verifyToken = require('../utils/verifyToken');
const aiSdkClient = require('../services/aiSdkClient');

router.use(verifyToken.authenticateToken);

// GET /api/v1/ai/knowledge-questions - List questions (defaults status=pending)
router.get('/', async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const status = req.query.status || 'pending';
    const result = await aiSdkClient.listKnowledgeQuestions({ companyId, status });
    return res.json({ success: true, questions: result.questions, count: result.count });
  } catch (error) {
    console.error('[KnowledgeQuestions] Error listing:', error.message);
    res.status(502).json({ error: 'Failed to list knowledge questions', detail: error.message });
  }
});

// GET /api/v1/ai/knowledge-questions/count - Count pending questions
router.get('/count', async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const result = await aiSdkClient.countPendingKnowledgeQuestions({ companyId });
    return res.json({ success: true, count: result.count });
  } catch (error) {
    console.error('[KnowledgeQuestions] Error counting:', error.message);
    res.status(502).json({ error: 'Failed to count knowledge questions', detail: error.message });
  }
});

// POST /api/v1/ai/knowledge-questions/:id/answer - Answer a pending question
router.post('/:id/answer', async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) return res.status(400).json({ error: 'companyId is required' });
    const { answer } = req.body;
    if (!answer || !answer.trim()) {
      return res.status(400).json({ error: 'Answer is required' });
    }
    const result = await aiSdkClient.answerKnowledgeQuestion({
      companyId,
      questionId: req.params.id,
      answer: answer.trim(),
    });
    return res.json({ success: true, question: result });
  } catch (error) {
    console.error('[KnowledgeQuestions] Error answering:', error.message);
    res.status(502).json({ error: 'Failed to answer knowledge question', detail: error.message });
  }
});

module.exports = router;
