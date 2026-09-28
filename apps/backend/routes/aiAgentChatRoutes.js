const express = require('express');
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const {
  sendMessage,
  previewRag,
  listRagFailures,
  getRagKnowledgeFaqs,
  getRagKnowledgePolicies,
  getRagKnowledgeOverview,
  backfillRagKnowledgeEmbeddings,
  getRagKnowledgeProducts,
  backfillRagKnowledgeProducts,
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
  rewindSession,
  getStatus,
  getDefaultCopilotAgent,
  setDefaultCopilotAgent,
  getSpecialists,
} = require('../controller/aiAgentChatController');

router.use(verifyToken.authenticateToken);

router.get('/specialists', getSpecialists);
router.get('/default-agent', getDefaultCopilotAgent);
router.put('/default-agent', setDefaultCopilotAgent);
router.post('/message', sendMessage);
router.post('/rag-preview', previewRag);
router.get('/rag-failures', listRagFailures);
router.get('/rag-knowledge-overview', getRagKnowledgeOverview);
router.get('/rag-knowledge-faqs', getRagKnowledgeFaqs);
router.get('/rag-knowledge-policies', getRagKnowledgePolicies);
router.post('/rag-knowledge-backfill', backfillRagKnowledgeEmbeddings);
router.get('/rag-knowledge-products', getRagKnowledgeProducts);
router.post('/rag-knowledge-products-backfill', backfillRagKnowledgeProducts);
router.post('/rag-knowledge-evaluate/run-now', runPersistedRagKnowledgeEvaluation);
router.post('/rag-knowledge-evaluate', runRagKnowledgeEvaluation);
router.get('/rag-knowledge-proposals', listRagKnowledgeProposals);
router.post('/rag-knowledge-proposals', createRagKnowledgeProposal);
router.post('/rag-knowledge-proposals/:id/approve', approveRagKnowledgeProposal);
router.post('/rag-knowledge-proposals/:id/reject', rejectRagKnowledgeProposal);
router.get('/sessions', listSessions);
router.post('/sessions', createSession);
router.delete('/sessions/:sessionId', deleteSession);
router.post('/sessions/:sessionId/rewind', rewindSession);
router.get('/history', getHistory);
router.delete('/history', clearHistory);
router.get('/status', getStatus);

// ⚡ AI Agent & Tool Incidents Telemetry (Accessible to Super Admin & Company Admin)
const superAdminAiIncidentsController = require('../controller/superAdminAiIncidentsController');
router.get('/incidents', superAdminAiIncidentsController.getIncidents);
router.post('/incidents/:id/retest', superAdminAiIncidentsController.retestIncident);
router.post('/incidents/:id/notify-tenant', superAdminAiIncidentsController.notifyTenant);
router.post('/incidents/:id/kill-switch', superAdminAiIncidentsController.toggleKillSwitch);

module.exports = router;
