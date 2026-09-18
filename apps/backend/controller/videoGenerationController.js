const googleVeoService = require('../services/googleVeoService');
const flowBridgeService = require('../services/flowBridgeService');

class VideoGenerationController {
  /**
   * POST /api/v1/ai-video/generate
   */
  async generateVideo(req, res) {
    try {
      const {
        prompt,
        referenceImageUrl,
        aspectRatio = '9:16',
        durationSeconds = 5,
        model = 'veo-2.0-generate-001',
      } = req.body;

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Prompt is required for video generation',
        });
      }

      const companyId = req.user?.companyId || req.companyId || 'default';
      const userId = req.user?.id || null;

      const result = await googleVeoService.createVideoTask({
        companyId,
        userId,
        prompt,
        referenceImageUrl,
        aspectRatio,
        durationSeconds,
        model,
      });

      return res.status(202).json({
        success: true,
        message: 'Video generation task queued successfully',
        data: {
          ...result,
          statusUrl: `/api/v1/ai-video/status/${result.taskId}`,
        },
      });
    } catch (err) {
      console.error('❌ [VIDEO-CONTROLLER] Generate error:', err.message);
      return res.status(500).json({
        success: false,
        error: err.message || 'Internal server error while initiating video generation',
      });
    }
  }

  /**
   * GET /api/v1/ai-video/status/:taskId
   */
  async getVideoStatus(req, res) {
    try {
      const { taskId } = req.params;
      if (!taskId) {
        return res.status(400).json({
          success: false,
          error: 'Task ID is required',
        });
      }

      const task = googleVeoService.getTaskStatus(taskId);
      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found or expired',
        });
      }

      return res.status(200).json({
        success: true,
        data: task,
      });
    } catch (err) {
      console.error('❌ [VIDEO-CONTROLLER] Status error:', err.message);
      return res.status(500).json({
        success: false,
        error: err.message || 'Internal server error fetching task status',
      });
    }
  }

  /**
   * GET /api/v1/ai-video/history
   */
  async getHistory(req, res) {
    try {
      const companyId = req.user?.companyId || req.companyId || 'default';
      const tasks = googleVeoService.listTasks(companyId);

      return res.status(200).json({
        success: true,
        data: tasks,
      });
    } catch (err) {
      console.error('❌ [VIDEO-CONTROLLER] History error:', err.message);
      return res.status(500).json({
        success: false,
        error: err.message || 'Internal server error fetching history',
      });
    }
  }

  /**
   * GET /api/v1/ai-video/engine-info
   */
  async getEngineInfo(req, res) {
    try {
      const companyId = req.user?.companyId || req.companyId || 'default';
      const flowStatus = await flowBridgeService.checkSessionStatus();
      const apiKey = await googleVeoService.resolveApiKey(companyId);

      let activeProvider = 'SANDBOX';
      if (flowStatus.authenticated) {
        activeProvider = 'FLOW_BRIDGE';
      } else if (apiKey) {
        activeProvider = 'OFFICIAL_VEO';
      }

      return res.status(200).json({
        success: true,
        data: {
          activeProvider,
          flowBridge: {
            installed: flowStatus.installed,
            authenticated: flowStatus.authenticated,
            cliPath: flowStatus.cliPath,
          },
          officialVeo: {
            configured: Boolean(apiKey),
          },
          tenant: {
            companyId,
          },
        },
      });
    } catch (err) {
      console.error('❌ [VIDEO-CONTROLLER] Engine info error:', err.message);
      return res.status(500).json({
        success: false,
        error: err.message || 'Error fetching engine info',
      });
    }
  }

  /**
   * POST /api/v1/ai-video/admin/trigger-auth
   */
  async triggerAuthLogin(req, res) {
    try {
      const { browser = 'chrome' } = req.body || {};
      const result = await flowBridgeService.triggerAuthLogin(browser);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error('❌ [VIDEO-CONTROLLER] Trigger auth error:', err.message);
      return res.status(500).json({
        success: false,
        error: err.message || 'Error triggering auth login',
      });
    }
  }
}

module.exports = new VideoGenerationController();

