/**
 * @module aiServiceAgentProxy
 * @description Frontend-facing proxy routes that forward agent requests to the ai-service.
 */

const express = require('express');
const verifyToken = require('../utils/verifyToken');
const aiServiceAdminClient = require('../services/aiServiceAdminClient');

const router = express.Router();

router.use(verifyToken.authenticateToken);

const getCompanyId = (req) => req.user?.companyId || req.companyId;

// GET /agents — list agents from ai-service
router.get('/agents', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const result = await aiServiceAdminClient.listAgents(companyId);
    if (result === null || result === undefined) {
      return res.status(502).json({ success: false, error: 'ai-service unreachable' });
    }
    // Python /admin/agents returns an array directly, not {success, agents}
    return res.json(Array.isArray(result) ? { success: true, agents: result } : result);
  } catch (error) {
    console.error('[ai-proxy] list agents failed:', error.message);
    return res.status(502).json({ success: false, error: error.message });
  }
});

// POST /agents/chat — send message to a specific agent on ai-service
router.post('/agents/chat', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const { message, agentId, threadId, attachments, images } = req.body || {};
    const rawImages = attachments || images || [];
    const incomingImages = Array.isArray(rawImages) ? rawImages : (rawImages ? [rawImages] : []);
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';

    if (!trimmedMessage && incomingImages.length === 0) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }
    if (!agentId) return res.status(400).json({ success: false, error: 'agentId is required' });

    const effectiveMessage = trimmedMessage || 'يرجى مراجعة وفحص الصورة المرفقة والإفادة بالتحليل والإجراء المقترح.';
    const normalizedAttachments = incomingImages.map((img) => {
      if (typeof img === 'string') {
        return {
          type: 'image',
          url: img,
          data_url: img.startsWith('data:') ? img : undefined,
        };
      }
      return img;
    });

    const result = await aiServiceAdminClient.chatWithAgent({
      companyId,
      agentId,
      message: effectiveMessage,
      threadId,
      attachments: normalizedAttachments.length > 0 ? normalizedAttachments : undefined,
    });
    if (!result) {
      return res.status(502).json({ success: false, error: 'ai-service unreachable or returned an error' });
    }
    return res.json(result);
  } catch (error) {
    console.error('[ai-proxy] agent chat failed:', error.message);
    return res.status(502).json({ success: false, error: error.message });
  }
});

// POST /seed-template — re-seed medical-center-agent template from filesystem
router.post('/seed-template', async (req, res) => {
  try {
    const { slug } = req.body || {};
    if (!slug) return res.status(400).json({ success: false, error: 'slug is required' });

    const { readFileSync, existsSync } = require('fs');
    const { join } = require('path');

    const agentsDir = join(__dirname, '..', 'agents', slug);
    const agentJsonPath = join(agentsDir, 'agent.json');
    if (!existsSync(agentJsonPath)) return res.status(404).json({ success: false, error: `Agent ${slug} not found` });

    const config = JSON.parse(readFileSync(agentJsonPath, 'utf8'));
    const readMd = (name) => {
      if (!name) return '';
      const p = join(agentsDir, name);
      return existsSync(p) ? readFileSync(p, 'utf8') : '';
    };

    const data = {
      slug: config.slug, role: config.role, name: config.name, version: config.version,
      model_policy: config.modelPolicy, allowed_tools: config.allowedTools,
      allowed_skills: config.allowedSkills, channels: config.channels,
      guardrails: config.guardrails, persona_meta: config.personaMeta,
      instructions_soul: readMd(config.instructions?.soul),
      instructions_agents: readMd(config.instructions?.agents),
      instructions_tools: readMd(config.instructions?.tools),
      instructions_persona: readMd(config.instructions?.persona),
      human_approval: config.humanApproval, handoffs: config.handoffs,
      mcp_servers: config.mcpServers, budget: config.budget,
      output_schema: config.outputSchema, is_active: true
    };

    const result = await aiServiceAdminClient.updateAgentTemplate(slug, data);
    res.json({ success: true, message: `Template ${slug} updated`, data: result });
  } catch (error) {
    console.error('[ai-proxy] seed-template failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /agents/spawn — spawn an agent instance from a template for the company
router.post('/agents/spawn', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

    const { template_slug, name, role, ...rest } = req.body || {};
    if (!template_slug) return res.status(400).json({ success: false, error: 'template_slug is required' });
    if (!name) return res.status(400).json({ success: false, error: 'name is required' });

    const result = await aiServiceAdminClient.spawnAgent({
      companyId, role: role || undefined, template_slug, name, ...rest,
    });
    if (!result) return res.status(502).json({ success: false, error: 'ai-service unreachable or returned an error' });
    return res.json({ success: true, agent: result });
  } catch (error) {
    console.error('[ai-proxy] agent spawn failed:', error.message);
    return res.status(502).json({ success: false, error: error.message });
  }
});

module.exports = router;
