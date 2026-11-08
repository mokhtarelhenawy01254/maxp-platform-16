/**
 * Higgsfield adapter for the AI Video Studio.
 *
 * Provider-agnostic surface (submit / pollStatus / cancel / downloadOutput) so a
 * future GOOGLE_VEO adapter can slot behind the same videoStudioService.
 *
 * Auth (per docs.higgsfield.ai): `Authorization: Key <KEY_ID>:<KEY_SECRET>`.
 * In our ai_keys table the combined "<id>:<secret>" string is stored in "apiKey".
 * Keys are resolved exclusively from the database — never from .env files.
 *
 * Simulation mode: when no key is available (or settings.simulationMode === 'always')
 * the adapter generates a real local test clip via ffmpeg so the whole pipeline
 * (download → poster → last-frame → story chaining) is verifiable end-to-end.
 */
const axios = require('axios');
const { execFile } = require('child_process');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

const DEFAULT_BASE_URL = 'https://api.higgsfield.ai';

// Catalog snapshot from open.higgsfield.ai (USD per second for video / per image for image models).
// characterStability: 3 = strongest identity lock (use for stories with characters).
const MODEL_CATALOG = [
  { id: 'kling-4.0', name: 'Kling 4.0', kind: 'video', priceUsdPerSecond: 0.11, maxDurationSeconds: 30, resolutions: ['720p', '1080p'], aspectRatios: ['9:16', '16:9', '1:1'], characterStability: 3, supportsCharacterRefs: true, supportsKeyframes: true, supportsAudio: true, endpoint: '/higgsfield-ai/kling/v4/standard', recommendedFor: 'قصص وشخصيات' },
  { id: 'kling-4.0-flash', name: 'Kling 4.0 Flash', kind: 'video', priceUsdPerSecond: 0.094, maxDurationSeconds: 20, resolutions: ['720p'], aspectRatios: ['9:16', '16:9', '1:1', '21:9'], characterStability: 2, supportsCharacterRefs: true, supportsKeyframes: true, supportsAudio: false, endpoint: '/higgsfield-ai/kling/v4/flash', recommendedFor: 'سرعة وتكلفة أقل' },
  { id: 'seedance-2.5', name: 'Seedance 2.5', kind: 'video', priceUsdPerSecond: 0.144, maxDurationSeconds: 30, resolutions: ['720p', '1080p'], aspectRatios: ['9:16', '16:9', '1:1'], characterStability: 2, supportsCharacterRefs: true, supportsKeyframes: true, supportsAudio: true, endpoint: '/higgsfield-ai/seedance/v2.5/standard', recommendedFor: 'حركة ديناميكية' },
  { id: 'seedance-2.0', name: 'Seedance 2.0', kind: 'video', priceUsdPerSecond: 0.099, maxDurationSeconds: 15, resolutions: ['1080p', '4K'], aspectRatios: ['9:16', '16:9', '1:1'], characterStability: 2, supportsCharacterRefs: true, supportsKeyframes: true, supportsAudio: true, endpoint: '/higgsfield-ai/seedance/v2.0/standard', recommendedFor: 'دقة 4K' },
  { id: 'wan-3.0', name: 'Wan 3.0', kind: 'video', priceUsdPerSecond: 0.025, maxDurationSeconds: 30, resolutions: ['720p', '1080p'], aspectRatios: ['9:16', '16:9', '1:1'], characterStability: 3, supportsCharacterRefs: true, supportsKeyframes: true, supportsAudio: true, endpoint: '/higgsfield-ai/wan/v3.0/standard', recommendedFor: 'اقتصادي + شخصيات ثابتة' },
  { id: 'wan-2.7', name: 'Wan 2.7', kind: 'video', priceUsdPerSecond: 0.05, maxDurationSeconds: 30, resolutions: ['720p', '1080p'], aspectRatios: ['9:16', '16:9', '1:1'], characterStability: 3, supportsCharacterRefs: true, supportsKeyframes: true, supportsAudio: true, endpoint: '/higgsfield-ai/wan/v2.7/standard', recommendedFor: 'شخصيات ثابتة' },
  { id: 'minimax-h3', name: 'MiniMax H3', kind: 'video', priceUsdPerSecond: 0.065, maxDurationSeconds: 15, resolutions: ['1080p', '2K'], aspectRatios: ['9:16', '16:9', '1:1'], characterStability: 2, supportsCharacterRefs: true, supportsKeyframes: true, supportsAudio: true, endpoint: '/higgsfield-ai/minimax/v3/standard', recommendedFor: 'جودة سينمائية' },
  { id: 'ltx-2.5-fast', name: 'LTX 2.5 Fast', kind: 'video', priceUsdPerSecond: 0.09, maxDurationSeconds: 15, resolutions: ['720p', '1080p', '4K'], aspectRatios: ['9:16', '16:9', '1:1'], characterStability: 1, supportsCharacterRefs: false, supportsKeyframes: true, supportsAudio: true, endpoint: '/higgsfield-ai/ltx/v2.5/fast', recommendedFor: 'حركات كاميرا' },
  { id: 'grok-imagine-video-1.5', name: 'Grok Imagine 1.5', kind: 'video', priceUsdPerSecond: 0.08, maxDurationSeconds: 15, resolutions: ['1080p'], aspectRatios: ['9:16', '16:9', '1:1'], characterStability: 1, supportsCharacterRefs: false, supportsKeyframes: false, supportsAudio: true, endpoint: '/higgsfield-ai/grok-imagine/v1.5/video', recommendedFor: 'نص→فيديو سريع' },
  { id: 'cinema-studio-4.0', name: 'Cinema Studio 4.0', kind: 'video', priceUsdPerSecond: 0.206, maxDurationSeconds: 30, resolutions: ['1080p'], aspectRatios: ['9:16', '16:9', '1:1', '21:9'], characterStability: 2, supportsCharacterRefs: true, supportsKeyframes: true, supportsAudio: true, endpoint: '/higgsfield-ai/cinema-studio/v4.0', recommendedFor: 'إخراج مشاهد تلقائي' },
  { id: 'genjutsu', name: 'Genjutsu (نقل الحركة)', kind: 'video', priceUsdPerSecond: 0.159, maxDurationSeconds: 15, resolutions: ['720p', '1080p'], aspectRatios: ['9:16', '16:9', '1:1'], characterStability: 3, supportsCharacterRefs: true, supportsKeyframes: false, supportsAudio: true, endpoint: '/higgsfield/genjutsu/motion-transfer/v1.0', recommendedFor: 'نقل حركة فيديو لشخصيتك', requiresVideoUrl: true },
  { id: 'genjutsu-light', name: 'Genjutsu Light', kind: 'video', priceUsdPerSecond: 0.025, maxDurationSeconds: 15, resolutions: ['720p'], aspectRatios: ['9:16', '16:9', '1:1'], characterStability: 2, supportsCharacterRefs: true, supportsKeyframes: false, supportsAudio: true, endpoint: '/higgsfield/genjutsu/motion-transfer-light/v1.0', recommendedFor: 'نقل حركة اقتصادي', requiresVideoUrl: true },
  { id: 'ai-influencer', name: 'AI Influencer (شيت شخصية)', kind: 'image', priceUsdPerImage: 0.05, aspectRatios: ['9:16', '1:1', '3:4'], characterStability: 3, endpoint: '/higgsfield-ai/influencer/v1/sheet', recommendedFor: 'توليد مراجع شخصية ثابتة' },
  { id: 'soul-2', name: 'Soul 2', kind: 'image', priceUsdPerImage: 0.003, aspectRatios: ['9:16', '1:1', '4:3', '3:4'], characterStability: 3, endpoint: '/higgsfield-ai/soul/v2/standard', recommendedFor: 'بورتريه وأزياء واقعية' },
  { id: 'marketing-studio-image', name: 'Marketing Studio Image', kind: 'image', priceUsdPerImage: 0.014, aspectRatios: ['1:1', '4:5', '9:16', '16:9'], characterStability: 1, endpoint: '/higgsfield-ai/marketing-studio/v1/image', recommendedFor: 'صور إعلانية جاهزة' },
  { id: 'z-image-turbo', name: 'Z-Image Turbo', kind: 'image', priceUsdPerImage: 0.015, aspectRatios: ['1:1', '9:16', '16:9'], characterStability: 1, endpoint: '/higgsfield-ai/z-image/v1/turbo', recommendedFor: 'صور سريعة بنص' },
];

const getModel = (modelId) => MODEL_CATALOG.find((m) => m.id === modelId) || null;

const authHeader = (apiKey) => ({ Authorization: `Key ${apiKey}` });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function runFfmpeg(args, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    let ffmpegPath;
    try {
      ffmpegPath = require('ffmpeg-static');
    } catch (e) {
      return reject(new Error('ffmpeg-static not available'));
    }
    execFile(ffmpegPath, args, { timeout: timeoutMs }, (err, stdout, stderr) => {
      if (err) return reject(new Error(stderr || err.message));
      resolve(stdout);
    });
  });
}

class HiggsfieldAdapter {
  constructor() {
    this.providerId = 'HIGGSFIELD';
  }

  isSimulation({ apiKey, settings }) {
    if (settings?.simulationMode === 'always') return true;
    if (settings?.simulationMode === 'never') return false;
    return !apiKey; // 'auto': simulate only when no usable key exists
  }

  /**
   * Submit a generation request. Returns { requestId, statusUrl, cancelUrl, simulated }.
   */
  async submit({ model, type, params, apiKey, settings, jobId, outputDir }) {
    const catalogEntry = getModel(model);
    if (!catalogEntry) throw new Error(`Unknown Higgsfield model: ${model}`);

    if (this.isSimulation({ apiKey, settings })) {
      return this.submitSimulation({ jobId, outputDir, catalogEntry, params });
    }

    const baseUrl = settings?.baseUrl || DEFAULT_BASE_URL;
    const body = this.buildRequestBody({ catalogEntry, type, params });

    const response = await axios.post(`${baseUrl}${catalogEntry.endpoint}`, body, {
      headers: { ...authHeader(apiKey), 'Content-Type': 'application/json' },
      timeout: 60000,
    });

    const data = response.data || {};
    if (!data.request_id && !data.status_url) {
      throw new Error(`Higgsfield submit failed: ${JSON.stringify(data).slice(0, 300)}`);
    }
    return {
      requestId: data.request_id || null,
      statusUrl: data.status_url || null,
      cancelUrl: data.cancel_url || null,
      simulated: false,
    };
  }

  buildRequestBody({ catalogEntry, type, params }) {
    const body = {
      prompt: params.prompt,
      aspect_ratio: params.aspectRatio || '9:16',
    };
    if (catalogEntry.kind === 'video') {
      body.duration = Number(params.durationSeconds) || 5;
      if (params.resolution) body.resolution = params.resolution;
      if (params.cameraMotion) body.camera_motion = params.cameraMotion;
      if (params.negativePrompt) body.negative_prompt = params.negativePrompt;
    }
    const referenceImages = Array.isArray(params.referenceImages) ? params.referenceImages : [];
    if (referenceImages.length > 0) body.image_urls = referenceImages;
    if (params.startFrameUrl && catalogEntry.supportsKeyframes) body.image_url = params.startFrameUrl;
    if (type === 'MOTION_TRANSFER' || catalogEntry.requiresVideoUrl) {
      if (!params.sourceVideoUrl) throw new Error('MOTION_TRANSFER requires params.sourceVideoUrl');
      body.video_url = params.sourceVideoUrl;
    }
    return body;
  }

  /**
   * Poll a submitted request once. Returns normalized
   * { status: QUEUED|PROCESSING|COMPLETED|FAILED|CANCELLED, progress, outputs[], error }.
   */
  async pollStatus({ statusUrl, apiKey, settings }) {
    const baseUrl = settings?.baseUrl || DEFAULT_BASE_URL;
    const url = statusUrl.startsWith('http') ? statusUrl : `${baseUrl}${statusUrl}`;
    const response = await axios.get(url, { headers: authHeader(apiKey), timeout: 30000 });
    return this.normalizeStatus(response.data);
  }

  normalizeStatus(raw) {
    const status = String(raw?.status || 'PROCESSING').toUpperCase();
    const outputs = Array.isArray(raw?.outputs)
      ? raw.outputs.map((o) => (typeof o === 'string' ? o : o?.url)).filter(Boolean)
      : raw?.output_url
        ? [raw.output_url]
        : [];
    return {
      status: ['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(status) ? status : 'PROCESSING',
      progress: Math.min(100, Math.max(0, Number(raw?.progress ?? (status === 'COMPLETED' ? 100 : 50)))),
      outputs,
      error: raw?.error?.message || raw?.error || null,
      raw,
    };
  }

  async cancel({ cancelUrl, apiKey, settings }) {
    if (!cancelUrl) return { cancelled: false };
    const baseUrl = settings?.baseUrl || DEFAULT_BASE_URL;
    const url = cancelUrl.startsWith('http') ? cancelUrl : `${baseUrl}${cancelUrl}`;
    try {
      await axios.post(url, {}, { headers: authHeader(apiKey), timeout: 30000 });
      return { cancelled: true };
    } catch (err) {
      console.warn(`⚠️ [HF-ADAPTER] cancel failed: ${err.message}`);
      return { cancelled: false };
    }
  }

  /**
   * Key connectivity probe (no generation cost): GET a non-existent request status.
   * 404 ⇒ the key authenticated (resource simply missing); 401/403 ⇒ rejected;
   * anything else ⇒ network/base-url trouble. Honest states only.
   */
  async ping({ apiKey, settings }) {
    const baseUrl = settings?.baseUrl || DEFAULT_BASE_URL;
    if (!apiKey) return { state: 'no_key' };
    if (!String(apiKey).includes(':')) return { state: 'invalid_format' };
    try {
      const res = await axios.get(`${baseUrl}/requests/__maxp_ping__/status`, {
        headers: authHeader(apiKey),
        timeout: 15000,
        validateStatus: () => true,
      });
      if (res.status === 404) return { state: 'accepted', status: 404 };
      if (res.status === 401 || res.status === 403) return { state: 'rejected', status: res.status };
      return { state: 'reachable', status: res.status };
    } catch (err) {
      const status = err.response?.status;
      if (status === 404) return { state: 'accepted', status };
      if (status === 401 || status === 403) return { state: 'rejected', status };
      return { state: 'unreachable', status: status || null, message: err.message };
    }
  }

  async downloadOutput({ url, apiKey, destPath }) {
    const writer = fs.createWriteStream(destPath);
    const response = await axios.get(url, {
      headers: apiKey ? authHeader(apiKey) : {},
      responseType: 'stream',
      timeout: 300000,
    });
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    const stat = await fsPromises.stat(destPath);
    if (stat.size < 1024) throw new Error('Downloaded output is suspiciously small');
    return { sizeBytes: stat.size };
  }

  // ---------- Simulation ----------

  async submitSimulation({ jobId, outputDir, catalogEntry, params }) {
    await fsPromises.mkdir(outputDir, { recursive: true });
    const statusUrl = `simulation://${jobId}`;
    console.log(`🎬 [HF-ADAPTER] Simulation mode job ${jobId} (${catalogEntry.id})`);
    return { requestId: `sim_${jobId}`, statusUrl, cancelUrl: null, simulated: true };
  }

  /**
   * Produce a real local mp4 (ffmpeg testsrc) so the full pipeline — player,
   * poster, last-frame, story chaining — works in simulation. Falls back to a
   * placeholder buffer when ffmpeg is unavailable.
   */
  async produceSimulationOutput({ jobId, outputDir, durationSeconds = 3 }) {
    await fsPromises.mkdir(outputDir, { recursive: true });
    const outPath = path.join(outputDir, `${jobId}.mp4`);
    try {
      await runFfmpeg([
      '-y',
      '-f', 'lavfi', '-i', `testsrc=size=540x960:rate=24:duration=${Math.min(10, Math.max(1, durationSeconds))}`,
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      outPath,
      ], 90000);
    } catch (e) {
      console.warn(`⚠️ [HF-ADAPTER] ffmpeg simulation clip failed (${e.message}); writing placeholder`);
      await fsPromises.writeFile(outPath, Buffer.from('MAXP_VIDEO_STUDIO_SIMULATION'));
    }
    return { localPath: outPath, simulated: true };
  }

  /**
   * Simulated image output (character sheets / stills): a single ffmpeg frame
   * so references and previews are real PNGs.
   */
  async produceSimulationImage({ jobId, outputDir }) {
    await fsPromises.mkdir(outputDir, { recursive: true });
    const outPath = path.join(outputDir, `${jobId}.png`);
    try {
      await runFfmpeg([
        '-y',
        '-f', 'lavfi', '-i', 'testsrc=size=720x960',
        '-frames:v', '1',
        outPath,
      ], 60000);
    } catch (e) {
      console.warn(`⚠️ [HF-ADAPTER] ffmpeg simulation image failed (${e.message}); writing placeholder`);
      await fsPromises.writeFile(outPath, Buffer.from('MAXP_VIDEO_STUDIO_SIMULATION_IMAGE'));
    }
    return { localPath: outPath, simulated: true };
  }

  async extractPoster({ videoPath, posterPath }) {
    await runFfmpeg(['-y', '-ss', '0.5', '-i', videoPath, '-frames:v', '1', '-q:v', '3', posterPath], 60000);
    return posterPath;
  }

  async extractLastFrame({ videoPath, lastFramePath }) {
    await runFfmpeg(['-y', '-sseof', '-0.1', '-i', videoPath, '-update', '1', '-frames:v', '1', '-q:v', '3', lastFramePath], 60000);
    return lastFramePath;
  }
}

module.exports = new HiggsfieldAdapter();
module.exports.MODEL_CATALOG = MODEL_CATALOG;
module.exports.getModel = getModel;
