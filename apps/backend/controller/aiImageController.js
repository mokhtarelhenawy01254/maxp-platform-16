const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { getSharedPrismaClient } = require("../services/sharedDatabase");
const aiServiceAdminClient = require("../services/aiServiceAdminClient");

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const ALLOWED_MODELS = [
  "google/gemini-3.1-flash-image",
  "google/gemini-3.1-flash-lite-image",
  "google/gemini-3-pro-image",
  "openai/gpt-image-2",
  "openai/gpt-image-1-mini",
  "openai/gpt-5.4-image-2",
  "x-ai/grok-imagine-image-quality",
];
const CONFIG_SYSTEM_NAME = "ai_image_generator_config";

async function getImageGeneratorConfig(prisma) {
  const setting = await prisma.systemSettings.findUnique({
    where: { systemName: CONFIG_SYSTEM_NAME },
  });
  if (!setting?.config) return null;
  return typeof setting.config === "string" ? JSON.parse(setting.config) : setting.config;
}

function resolveTierConfig(config, companyId) {
  const companyOverride = config.companies?.[companyId];
  if (companyOverride && companyOverride.enabled === false) return { enabled: false };
  const enabled = companyOverride?.enabled !== false;
  const tierKey = companyOverride?.tier || config.defaultTier || "balanced";
  const tier = config.tiers?.[tierKey];
  const maxDaily = companyOverride?.maxRequestsPerDay || config.defaultMaxRequestsPerDay || 50;
  return { enabled, tierKey, tier, maxDaily };
}

async function getDailyUsage(prisma, companyId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*)::int as count FROM public.ai_provider_logs
     WHERE "companyId" = $1 AND scope = 'image_generation' AND "createdAt" >= $2`,
    companyId, today
  );
  return rows?.[0]?.count || 0;
}

function getPrisma() {
  return getSharedPrismaClient();
}

async function getOpenRouterKey() {
  const prisma = getPrisma();
  const rows = await prisma.$queryRawUnsafe(
    `SELECT id, "apiKey", name FROM public.ai_keys WHERE provider = 'OPENROUTER' AND "isActive" = true ORDER BY priority ASC LIMIT 1`
  );
  if (rows?.length) return { apiKey: rows[0].apiKey, keyId: rows[0].id, keyName: rows[0].name };
  throw new Error("OPENROUTER_API_KEY not found in ai_keys table");
}

async function writeProviderLog({ companyId, keyId, keyName, action, status, latencyMs, model, message }) {
  try {
    const prisma = getPrisma();
    const id = crypto.randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO public.ai_provider_logs (id, provider, "keyId", "keyName", "companyId", scope, action, status, "latencyMs", model, message, "createdAt")
       VALUES ($1, 'OPENROUTER', $2, $3, $4, 'image_generation', $5, $6, $7, $8, $9, NOW())`,
      id, keyId || null, keyName || null, companyId || null,
      action, status,
      latencyMs != null ? Math.round(latencyMs) : null,
      model || null,
      message || null
    );
  } catch (e) {
    console.error("❌ [AI-IMAGE] Failed to write log:", e.message);
  }
}

function normalizeImageUrl(imgUrl) {
  if (!imgUrl || typeof imgUrl !== "string") return null;
  const trimmed = imgUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  // If it's a relative path starting with / or uploads/
  const cleanPath = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
  const localCandidates = [
    path.join(__dirname, "..", cleanPath),
    path.join(__dirname, "..", "uploads", cleanPath.replace(/^uploads\//, "")),
    path.join("/var/www/backend2", cleanPath),
  ];

  for (const candidate of localCandidates) {
    if (fs.existsSync(candidate)) {
      try {
        const ext = path.extname(candidate).toLowerCase().replace(".", "") || "png";
        const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
        const base64 = fs.readFileSync(candidate).toString("base64");
        return `data:${mime};base64,${base64}`;
      } catch (e) {
        console.warn("⚠️ [AI-IMAGE] Failed to read local image file:", e.message);
      }
    }
  }

  // Fallback to absolute HTTPS domain
  const publicBase = process.env.PUBLIC_APP_URL || process.env.BASE_URL || "https://maxp.online";
  return `${publicBase.replace(/\/+$/, "")}/${cleanPath}`;
}

exports.generateImage = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    let { prompt, model, aspectRatio = "1:1", style, negativePrompt, size, quality, productImage, referenceImage } = req.body;

    productImage = normalizeImageUrl(productImage);
    referenceImage = normalizeImageUrl(referenceImage);

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: "الصورة مطلوب" });
    }

    const prisma = getPrisma();
    if (companyId) {
      const config = await getImageGeneratorConfig(prisma);
      if (config) {
        const tierCfg = resolveTierConfig(config, companyId);
        if (!tierCfg.enabled) {
          return res.status(403).json({ success: false, message: "مولد الصور غير مفعل لشركتك. تواصل مع الدعم الفني." });
        }
        if (tierCfg.maxDaily > 0) {
          const usage = await getDailyUsage(prisma, companyId);
          if (usage >= tierCfg.maxDaily) {
            return res.status(429).json({ success: false, message: `لقد تجاوزت الحد اليومي المسموح (${tierCfg.maxDaily} صورة). حاول مرة أخرى غداً.` });
          }
        }
        model = model || (tierCfg.tier?.model);
      }
    }
    model = model || "google/gemini-3.1-flash-image";

    if (!ALLOWED_MODELS.includes(model)) {
      return res.status(400).json({ success: false, message: "موديل غير مدعوم" });
    }

    const { apiKey, keyId, keyName } = await getOpenRouterKey();
    const startTime = Date.now();

    const systemPrompt = [
      "You are a professional social media image designer. Your ONLY output MUST be a valid image. NEVER return text descriptions.",
      "Generate a high-quality social media image based on the user's brief below.",
      productImage ? "The user has provided a reference product image. Use it as the primary visual — place the actual product from the reference image into the design. Do NOT ignore the reference or invent a different product." : "",
      referenceImage ? "The user has provided a style reference image. Follow its stylistic approach — colors, composition, lighting, mood, typography choices, and overall aesthetic — while incorporating the brand's product, copy, and colors specified below." : "",
      style ? `Style: ${style}.` : "",
      negativePrompt ? `Avoid: ${negativePrompt}.` : "",
      "The image must be in 1:1 square format suitable for Instagram. Use the brand colors and typography specified. Ensure text is readable and well-positioned over the background.",
      "Return ONLY the generated image — no introductory text, no explanation, no markdown formatting around the image.",
    ].filter(Boolean).join(" ");

    const supportedAspectRatios = {
      "1:1": { width: 1024, height: 1024 },
      "16:9": { width: 1344, height: 768 },
      "9:16": { width: 768, height: 1344 },
      "4:3": { width: 1152, height: 896 },
      "3:4": { width: 896, height: 1152 },
      "3:2": { width: 1216, height: 832 },
    };

    const dims = size || supportedAspectRatios[aspectRatio] || supportedAspectRatios["1:1"];

    const contentParts = [{ type: "text", text: prompt }];
    if (productImage) contentParts.push({ type: "image_url", image_url: { url: productImage } });
    if (referenceImage) contentParts.push({ type: "image_url", image_url: { url: referenceImage } });
    const userContent = contentParts.length > 1 ? contentParts : prompt;

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://maxp.online",
      "X-Title": "MaxP Social Image Generator",
    };

    let result, imageUrl = "";

    const isOpenAIModel = model.startsWith("openai/");

    if (isOpenAIModel) {
      const q = quality >= 91 ? "high" : quality >= 76 ? "medium" : "low";
      const outputFormat = req.body.structured?.output?.format || "png";
      const inpRefs = [];
      if (productImage) inpRefs.push({ type: "image_url", image_url: { url: productImage } });
      if (referenceImage) inpRefs.push({ type: "image_url", image_url: { url: referenceImage } });

      const resp = await axios.post(
        `${OPENROUTER_BASE}/images`,
        {
          model,
          prompt,
          n: 1,
          quality: q,
          aspect_ratio: aspectRatio,
          output_format: outputFormat === "jpg" ? "jpeg" : outputFormat,
          ...(inpRefs.length ? { input_references: inpRefs } : {}),
        },
        { headers, timeout: 180000 }
      );
      result = resp.data;
      imageUrl = result?.data?.[0]?.b64_json ? `data:${result.data[0].media_type || "image/png"};base64,${result.data[0].b64_json}` : "";
    } else {
      const resp = await axios.post(
        `${OPENROUTER_BASE}/chat/completions`,
        {
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          extra_body: { response_format: { type: "image" } },
          ...(dims ? { width: dims.width, height: dims.height } : {}),
        },
        { headers, timeout: 120000 }
      );
      result = resp.data;
      const msg = result?.choices?.[0]?.message;
      if (msg?.images) {
        const imgArr = Array.isArray(msg.images) ? msg.images : Object.values(msg.images);
        for (const img of imgArr) {
          if (typeof img === "string") { imageUrl = img; break; }
          if (img?.image_url?.url) { imageUrl = img.image_url.url; break; }
          if (img?.url) { imageUrl = img.url; break; }
        }
      }
      if (!imageUrl && msg?.content) {
        if (typeof msg.content === "string") {
          const c = msg.content.trim();
          if (c.startsWith("data:image/") || c.startsWith("http")) imageUrl = c;
          else { const m = c.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/); if (m) imageUrl = m[1]; }
        } else if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (part.type === "image_url") { imageUrl = part.image_url?.url; break; }
          }
        }
      }
      if (!imageUrl && msg?.image_url?.url) imageUrl = msg.image_url.url;
      if (!imageUrl) imageUrl = result?.data?.[0]?.url || "";
    }

    const latencyMs = Date.now() - startTime;
    const usedModel = result?.model || model;

    writeProviderLog({
      companyId, keyId, keyName,
      action: imageUrl ? 'generation_success' : 'generation_success',
      status: 'success',
      latencyMs,
      model: usedModel,
    });

    if (!imageUrl) {
      return res.status(200).json({ success: true, data: { imageUrl: "", model: usedModel, usage: result?.usage || null } });
    }

    if (imageUrl.startsWith("data:")) {
      const ext = imageUrl.startsWith("data:image/png") ? "png" : "jpg";
      const buffer = Buffer.from(imageUrl.split(",")[1], "base64");
      const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
      const relativeDir = `uploads/ai-images/${companyId || "unknown"}`;
      const absoluteDir = path.join(__dirname, "..", relativeDir);
      if (!fs.existsSync(absoluteDir)) fs.mkdirSync(absoluteDir, { recursive: true });
      fs.writeFileSync(path.join(absoluteDir, filename), buffer);
      try {
        const meta = {
          prompt: prompt?.slice(0, 2000) || "",
          platform: req.body.structured?.platform || "",
          aspectRatio: req.body.structured?.aspectRatio || aspectRatio,
          purpose: req.body.structured?.campaign?.purpose || "",
          model: usedModel,
        };
        fs.writeFileSync(path.join(absoluteDir, `${filename}.meta.json`), JSON.stringify(meta));
      } catch {}
      imageUrl = `/${relativeDir}/${filename}`;
    }

    return res.status(200).json({
      success: true,
      data: {
        imageUrl,
        model: usedModel,
        usage: result.usage || null,
      },
    });
  } catch (error) {
    const elapsed = typeof startTime === 'number' ? Date.now() - startTime : 0;
    const status = error.response?.status || 500;
    const detail = error.response?.data?.error?.message || error.message;
    writeProviderLog({
      companyId, keyId, keyName,
      action: 'generation_failed',
      status: 'failed',
      latencyMs: elapsed,
      model: req.body?.model || ALLOWED_MODELS[0],
      message: detail,
    });
    return res.status(status).json({ success: false, message: detail });
  }
};

exports.getModelConfig = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const prisma = getPrisma();
    const config = await getImageGeneratorConfig(prisma);
    const savedModel = null;

    if (!config) {
      let templateModel = null;
      try {
        const template = await aiServiceAdminClient.getAgentTemplate("social-media-image-agent");
        templateModel = template?.model_policy?.default;
      } catch {}
      const model = templateModel || ALLOWED_MODELS[0];
      return res.json({ success: true, data: { model, allowedModels: ALLOWED_MODELS, tiers: null } });
    }

    const tierCfg = resolveTierConfig(config, companyId);
    const usage = companyId ? await getDailyUsage(prisma, companyId) : 0;

    const tiers = {};
    for (const [key, t] of Object.entries(config.tiers || {})) {
      tiers[key] = { displayName: t.displayName, description: t.description };
    }

    const model = tierCfg.enabled ? (savedModel || tierCfg.tier?.model || ALLOWED_MODELS[0]) : null;

    res.json({
      success: true,
      data: {
        model,
        allowedModels: ALLOWED_MODELS,
        tiers,
        currentTier: tierCfg.tierKey,
        enabled: tierCfg.enabled,
        dailyUsage: usage,
        dailyLimit: tierCfg.maxDaily,
      },
    });
  } catch {
    res.json({ success: true, data: { model: ALLOWED_MODELS[0], allowedModels: ALLOWED_MODELS, tiers: null } });
  }
};

exports.getTierConfig = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const prisma = getPrisma();
    const config = await getImageGeneratorConfig(prisma);

    if (!config) {
      return res.json({ success: true, data: { available: false } });
    }

    const tierCfg = resolveTierConfig(config, companyId);
    const usage = companyId ? await getDailyUsage(prisma, companyId) : 0;

    const tiers = {};
    for (const [key, t] of Object.entries(config.tiers || {})) {
      tiers[key] = { displayName: t.displayName, description: t.description };
    }

    res.json({
      success: true,
      data: {
        available: true,
        enabled: tierCfg.enabled,
        currentTier: tierCfg.tierKey,
        tiers,
        dailyUsage: usage,
        dailyLimit: tierCfg.maxDaily,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getQuota = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const prisma = getPrisma();
    const config = await getImageGeneratorConfig(prisma);
    const tierCfg = config ? resolveTierConfig(config, companyId) : { maxDaily: 50 };
    const usage = companyId ? await getDailyUsage(prisma, companyId) : 0;
    const dailyLimit = tierCfg?.maxDaily || 50;
    const remainingQuota = Math.max(0, dailyLimit - usage);

    return res.json({
      success: true,
      data: {
        dailyUsage: usage,
        dailyLimit,
        remainingQuota,
      },
    });
  } catch (error) {
    return res.json({
      success: true,
      data: {
        dailyUsage: 0,
        dailyLimit: 50,
        remainingQuota: 50,
      },
    });
  }
};

exports.saveModelConfig = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({ success: false, message: "companyId مطلوب" });
    }
    const { model } = req.body;
    if (!model || !ALLOWED_MODELS.includes(model)) {
      return res.status(400).json({ success: false, message: "موديل غير مدعوم" });
    }

    const prisma = getPrisma();
    const existing = await prisma.aiSetting.findUnique({
      where: { companyId },
      select: { modelSettings: true },
    });

    let modelSettings = {};
    if (existing?.modelSettings) {
      try { modelSettings = JSON.parse(existing.modelSettings); } catch { modelSettings = {}; }
    }
    modelSettings.imageModel = model;

    await prisma.aiSetting.upsert({
      where: { companyId },
      update: { modelSettings: JSON.stringify(modelSettings) },
      create: { companyId, modelSettings: JSON.stringify(modelSettings) },
    });

    res.json({ success: true, data: { model } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const imgDir = path.join(__dirname, "..", "uploads", "ai-images", companyId || "unknown");
    if (!fs.existsSync(imgDir)) return res.json({ success: true, data: [] });
    const files = fs.readdirSync(imgDir)
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(imgDir, f));
        const metaPath = path.join(imgDir, `${f}.meta.json`);
        let meta = {};
        if (fs.existsSync(metaPath)) {
          try { meta = JSON.parse(fs.readFileSync(metaPath, "utf8")); } catch {}
        }
        return { filename: f, url: `/uploads/ai-images/${companyId || "unknown"}/${f}`, createdAt: stat.birthtime || stat.mtime, size: stat.size, ...meta };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return res.json({ success: true, data: files });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteImage = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const filename = req.params.filename;
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({ success: false, message: "اسم ملف غير صالح" });
    }
    const filePath = path.join(__dirname, "..", "uploads", "ai-images", companyId || "unknown", filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, message: "الملف مش موجود" });
    fs.unlinkSync(filePath);
    return res.json({ success: true, message: "تم الحذف" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getModels = async (req, res) => {
  res.json({ success: true, data: ALLOWED_MODELS });
};

exports.generateCaption = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { structured, brandVoice = "" } = req.body;
    if (!structured) {
      return res.status(400).json({ success: false, message: "البيانات المنظمة مطلوبة" });
    }

    const { apiKey, keyId, keyName } = await getOpenRouterKey();
    const startTime = Date.now();

    const system = [
      "You are a social media copywriter for Arabic brands.",
      "Return ONLY a JSON object with these keys: headline (optional string), caption (string), cta (string), hashtags (array of strings without #).",
      "No markdown, no explanations, no extra keys.",
      brandVoice ? `Brand voice: ${brandVoice}.` : "",
    ].filter(Boolean).join(" ");

    const userPrompt = [
      `Industry vertical: ${structured.vertical || "general"}.`,
      `Platform: ${structured.platform || "social media"}.`,
      `Purpose: ${structured.campaign?.purpose || "general post"}.`,
      `Brand: ${structured.brand?.name || ""}.`,
      structured.product?.name ? `Subject: ${structured.product.name}.` : "",
      structured.product?.description ? `Description: ${structured.product.description}.` : "",
      structured.copy?.headline ? `Headline: ${structured.copy.headline}.` : "",
      structured.copy?.subheadline ? `Subheadline: ${structured.copy.subheadline}.` : "",
      structured.copy?.cta ? `Desired CTA: ${structured.copy.cta}.` : "",
      structured.campaign?.urgency ? `Urgency: ${structured.campaign.urgency}.` : "",
      "Generate an Arabic social media caption, a short catchy headline, a CTA, and 3-8 relevant hashtags.",
      "The tone should match the industry vertical and campaign purpose.",
    ].filter(Boolean).join("\n");

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://maxp.online",
      "X-Title": "MaxP Social Caption Generator",
    };

    const resp = await axios.post(
      `${OPENROUTER_BASE}/chat/completions`,
      {
        model: "google/gemini-3.1-flash-lite",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      },
      { headers, timeout: 60000 }
    );

    const raw = resp.data?.choices?.[0]?.message?.content;
    if (!raw) {
      return res.status(500).json({ success: false, message: "لم يتم استلام نص من الموديل" });
    }

    let parsed;
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      return res.status(500).json({ success: false, message: "فشل تحليل نص الموديل" });
    }

    const result = {
      headline: typeof parsed.headline === "string" && parsed.headline.trim() ? parsed.headline.trim() : undefined,
      caption: typeof parsed.caption === "string" ? parsed.caption.trim() : String(parsed.caption || "").trim(),
      cta: typeof parsed.cta === "string" ? parsed.cta.trim() : String(parsed.cta || "").trim(),
      hashtags: Array.isArray(parsed.hashtags)
        ? parsed.hashtags.map((h) => String(h || "").replace(/^#/, "").trim()).filter(Boolean)
        : typeof parsed.hashtags === "string"
        ? parsed.hashtags.split(/\s+/).map((h) => h.replace(/^#/, "").trim()).filter(Boolean)
        : [],
    };

    const latencyMs = Date.now() - startTime;
    writeProviderLog({
      companyId, keyId, keyName,
      action: 'generation_success',
      status: 'success',
      latencyMs,
      model: "google/gemini-3.1-flash-lite",
    });

    return res.json({ success: true, data: result });
  } catch (error) {
    const elapsed = typeof startTime === 'number' ? Date.now() - startTime : 0;
    const status = error.response?.status || 500;
    const detail = error.response?.data?.error?.message || error.message;
    writeProviderLog({
      companyId, keyId, keyName,
      action: 'generation_failed',
      status: 'failed',
      latencyMs: elapsed,
      model: "google/gemini-3.1-flash-lite",
      message: detail,
    });
    return res.status(status).json({ success: false, message: detail });
  }
};

exports.chatWithCreativeDirector = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { message, productName = "", productPrice, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "الرسالة مطلوبة" });
    }

    const { apiKey, keyId, keyName } = await getOpenRouterKey();
    const startTime = Date.now();

    const systemPrompt = `You are the 2026 AI Creative Director & E-Commerce Commercial Art Director for MaxP Platform.
Your mission is to collaborate with Egyptian/Arabic merchants to brainstorm, refine, and generate breathtaking commercial ad visuals and photography scenes.
Guidelines:
1. Speak in friendly, professional, confident Egyptian/Arabic dialect.
2. The merchant's active product is: "${productName || 'المنتج التجاري'}" ${productPrice ? `(السعر: ${productPrice} ج.م)` : ''}.
3. Analyze their request, explain why this visual idea will convert customers (ROAS / Engagement), and suggest lighting, reflections, and atmosphere.
4. Always construct a detailed, evocative English diffusion prompt tailored for commercial product photography (photorealistic, 8k, pristine lighting, realistic contact shadows, award-winning advertising).
5. You MUST return ONLY a valid JSON object with the following structure:
{
  "reply": "ردك الودود والمهني بالعامية المصرية مع الشرح التسويقي",
  "suggestedPrompt": "The full detailed English image generation prompt...",
  "suggestedAngle": "عنوان مختصر للزاوية التسويقية (بالعربية)"
}`;

    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...(Array.isArray(history) ? history.slice(-6).map((h) => ({
        role: h.role === "user" ? "user" : "assistant",
        content: String(h.content || ""),
      })) : []),
      { role: "user", content: message },
    ];

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://maxp.online",
      "X-Title": "MaxP Creative Director Chat",
    };

    const resp = await axios.post(
      `${OPENROUTER_BASE}/chat/completions`,
      {
        model: "google/gemini-3.1-flash-lite",
        messages: formattedMessages,
        response_format: { type: "json_object" },
      },
      { headers, timeout: 60000 }
    );

    const raw = resp.data?.choices?.[0]?.message?.content;
    let parsed = {};
    try {
      parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      parsed = {
        reply: raw || "فكرة رائعة! قمت بتجهيز البرومبت الإعلاني المناسب.",
        suggestedPrompt: `commercial advertisement shoot for ${productName || "product"}, inspired by ${message}, cinematic lighting, 8k resolution`,
        suggestedAngle: "مشهد مخصص",
      };
    }

    const latencyMs = Date.now() - startTime;
    writeProviderLog({
      companyId, keyId, keyName,
      action: 'creative_chat_success',
      status: 'success',
      latencyMs,
      model: "google/gemini-3.1-flash-lite",
    });

    return res.json({
      success: true,
      data: {
        reply: parsed.reply || "تمت صياغة المشهد بنجاح.",
        suggestedPrompt: parsed.suggestedPrompt || "",
        suggestedAngle: parsed.suggestedAngle || "مشهد مخصص",
      },
    });
  } catch (error) {
    const detail = error.response?.data?.error?.message || error.message;
    return res.status(500).json({ success: false, message: detail });
  }
};
