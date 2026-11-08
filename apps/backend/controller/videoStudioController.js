/**
 * AI Video Studio controller — mounted at /api/v1/video-studio.
 * Merchant surface: config/estimate/jobs/characters/stories/byok.
 * Super-admin settings ride on .superAdminRouter (see routes file).
 */
const videoStudioService = require('../services/videoStudioService');
const videoCharacterService = require('../services/videoCharacterService');
const videoStoryService = require('../services/videoStoryService');

const getCompanyId = (req) => req.user?.companyId || req.companyId || 'default';
const getUserId = (req) => req.user?.id || null;

class VideoStudioController {
  // GET /config
  async getConfig(req, res) {
    try {
      const data = await videoStudioService.getConfig(getCompanyId(req));
      return res.json({ success: true, data });
    } catch (err) {
      console.error('❌ [VIDEO-STUDIO-CTRL] config:', err.message);
      return res.status(500).json({ success: false, error: 'تعذر تحميل إعدادات الاستوديو' });
    }
  }

  // POST /estimate  { model, durationSeconds, quantity }
  async estimate(req, res) {
    try {
      const { model, durationSeconds, quantity } = req.body || {};
      const data = await videoStudioService.estimateCost({ model, durationSeconds, quantity });
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // POST /jobs  → 202
  async createJob(req, res) {
    try {
      const { type, model, params } = req.body || {};
      if (!type || !model) {
        return res.status(400).json({ success: false, error: 'type و model مطلوبان' });
      }
      const job = await videoStudioService.createJob({
        companyId: getCompanyId(req),
        userId: getUserId(req),
        type,
        model,
        params: params || {},
      });
      return res.status(202).json({
        success: true,
        message: 'تم إضافة التوليد للطابور',
        data: job,
      });
    } catch (err) {
      console.error('❌ [VIDEO-STUDIO-CTRL] createJob:', err.message);
      const status = err.statusCode || (String(err.message).includes('غير معروف') || String(err.message).includes('مطلوب') ? 400 : 500);
      return res.status(status).json({ success: false, error: err.message });
    }
  }

  // GET /jobs?status=&limit=&offset=
  async listJobs(req, res) {
    try {
      const { status, limit, offset, type } = req.query;
      const data = await videoStudioService.getJobs(getCompanyId(req), { status, limit, offset, type });
      return res.json({ success: true, data });
    } catch (err) {
      console.error('❌ [VIDEO-STUDIO-CTRL] listJobs:', err.message);
      return res.status(500).json({ success: false, error: 'تعذر تحميل قائمة الوظائف' });
    }
  }

  // GET /jobs/:id
  async getJob(req, res) {
    try {
      const job = await videoStudioService.getJob(getCompanyId(req), req.params.id);
      if (!job) return res.status(404).json({ success: false, error: 'الوظيفة غير موجودة' });
      return res.json({ success: true, data: job });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST /jobs/:id/cancel
  async cancelJob(req, res) {
    try {
      const result = await videoStudioService.requestCancel(getCompanyId(req), req.params.id);
      if (!result.ok) return res.status(result.statusCode).json({ success: false, error: result.error });
      return res.json({ success: true, data: result.job });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // ---------- Characters ----------

  async listCharacters(req, res) {
    try {
      const data = await videoCharacterService.listCharacters(getCompanyId(req));
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async createCharacter(req, res) {
    try {
      const data = await videoCharacterService.createCharacter(getCompanyId(req), req.body || {});
      return res.status(201).json({ success: true, data });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async updateCharacter(req, res) {
    try {
      const data = await videoCharacterService.updateCharacter(getCompanyId(req), req.params.id, req.body || {});
      if (!data) return res.status(404).json({ success: false, error: 'الشخصية غير موجودة' });
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async deleteCharacter(req, res) {
    try {
      const data = await videoCharacterService.deleteCharacter(getCompanyId(req), req.params.id);
      if (!data.deleted) return res.status(404).json({ success: false, error: 'الشخصية غير موجودة' });
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async generateCharacterSheet(req, res) {
    try {
      const job = await videoCharacterService.generateSheet(getCompanyId(req), getUserId(req), req.params.id);
      return res.status(202).json({ success: true, data: job });
    } catch (err) {
      const status = String(err.message).includes('غير موجودة') ? 404 : 400;
      return res.status(status).json({ success: false, error: err.message });
    }
  }

  // ---------- Stories ----------

  async listStories(req, res) {
    try {
      const data = await videoStoryService.listStories(getCompanyId(req));
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async getStory(req, res) {
    try {
      const data = await videoStoryService.getStory(getCompanyId(req), req.params.id);
      if (!data) return res.status(404).json({ success: false, error: 'القصة غير موجودة' });
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async createStory(req, res) {
    try {
      const data = await videoStoryService.createStory(getCompanyId(req), req.body || {});
      return res.status(201).json({ success: true, data });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async updateStory(req, res) {
    try {
      const data = await videoStoryService.updateStory(getCompanyId(req), req.params.id, req.body || {});
      if (!data) return res.status(404).json({ success: false, error: 'القصة غير موجودة' });
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async deleteStory(req, res) {
    try {
      const data = await videoStoryService.deleteStory(getCompanyId(req), req.params.id);
      if (!data.deleted) return res.status(404).json({ success: false, error: 'القصة غير موجودة' });
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async addScene(req, res) {
    try {
      const data = await videoStoryService.addScene(getCompanyId(req), req.params.id, req.body || {});
      return res.status(201).json({ success: true, data });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async updateScene(req, res) {
    try {
      const data = await videoStoryService.updateScene(getCompanyId(req), req.params.sceneId, req.body || {});
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async deleteScene(req, res) {
    try {
      const data = await videoStoryService.deleteScene(getCompanyId(req), req.params.sceneId);
      if (!data.deleted) return res.status(404).json({ success: false, error: 'المشهد غير موجود' });
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async renderStory(req, res) {
    try {
      const data = await videoStoryService.renderStory(getCompanyId(req), req.params.id, getUserId(req));
      return res.status(202).json({ success: true, data });
    } catch (err) {
      const status = String(err.message).includes('غير موجودة') ? 404 : 400;
      return res.status(status).json({ success: false, error: err.message });
    }
  }

  // ---------- BYOK ----------

  async getByok(req, res) {
    try {
      const data = await videoStudioService.getByokInfo(getCompanyId(req));
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async saveByok(req, res) {
    try {
      const { keyId, secret, name } = req.body || {};
      await videoStudioService.saveByokKey(getCompanyId(req), { keyId, secret, name });
      const data = await videoStudioService.getByokInfo(getCompanyId(req));
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async deleteByok(req, res) {
    try {
      await videoStudioService.deleteByokKey(getCompanyId(req));
      return res.json({ success: true, data: { configured: false } });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}

module.exports = new VideoStudioController();
