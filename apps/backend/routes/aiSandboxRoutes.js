const express = require('express');
const router = express.Router();
const verifyToken = require("../utils/verifyToken");
const {
  listAgents,
  getAgentProfile,
  listModels,
  listSessions,
  getSession,
  createSession,
  updateSessionTitle,
  deleteSession,
  sendChatMessage,
  streamChatMessage,
  evaluateResponse,
  exportSession,
  listSandboxTools,
  saveAgentFiles,
  listRuns,
  getRun,
  resumeRun,
} = require('../controller/aiSandboxController');

router.use(verifyToken.authenticateToken);

router.get('/agents', listAgents);
router.get('/agents/:agentId/profile', getAgentProfile);
router.get('/models', listModels);
router.get('/tools', listSandboxTools);
router.put('/agents/:agentId/files', saveAgentFiles);
router.get('/sessions', listSessions);
router.get('/sessions/:sessionId', getSession);
router.post('/sessions', createSession);
router.patch('/sessions/:sessionId', updateSessionTitle);
router.delete('/sessions/:sessionId', deleteSession);
router.post('/chat', sendChatMessage);
router.post('/chat/stream', streamChatMessage);
router.post('/evaluate', evaluateResponse);
router.get('/sessions/:sessionId/export', exportSession);

// Run state / HITL pause-resume routes
router.get('/runs', listRuns);
router.get('/runs/:runId', getRun);
router.post('/runs/:runId/resume', resumeRun);

module.exports = router;
