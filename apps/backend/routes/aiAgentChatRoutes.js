const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  sendMessage,
  previewRag,
  listRagFailures,
  getRagKnowledgeOverview,
  backfillRagKnowledgeEmbeddings,
  runRagKnowledgeEvaluation,
  runPersistedRagKnowledgeEvaluation,
  createRagKnowledgeProposal,
  listRagKnowledgeProposals,
  approveRagKnowledgeProposal,
  rejectRagKnowledgeProposal,
  getHistory,
  clearHistory,
  listSessions,
  createSession,
  deleteSession,
  getStatus,
} = require('../controller/aiAgentChatController');

router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    next();
  } else {
    requireAuth(req, res, next);
  }
});

router.post('/message', sendMessage);
router.post('/rag-preview', previewRag);
router.get('/rag-failures', listRagFailures);
router.get('/rag-knowledge-overview', getRagKnowledgeOverview);
router.post('/rag-knowledge-backfill', backfillRagKnowledgeEmbeddings);
router.post('/rag-knowledge-evaluate/run-now', runPersistedRagKnowledgeEvaluation);
router.post('/rag-knowledge-evaluate', runRagKnowledgeEvaluation);
router.get('/rag-knowledge-proposals', listRagKnowledgeProposals);
router.post('/rag-knowledge-proposals', createRagKnowledgeProposal);
router.post('/rag-knowledge-proposals/:id/approve', approveRagKnowledgeProposal);
router.post('/rag-knowledge-proposals/:id/reject', rejectRagKnowledgeProposal);
router.get('/sessions', listSessions);
router.post('/sessions', createSession);
router.delete('/sessions/:sessionId', deleteSession);
router.get('/history', getHistory);
router.delete('/history', clearHistory);
router.get('/status', getStatus);

module.exports = router;
