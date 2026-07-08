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

function getPrisma() {
  return getSharedPrismaClient();
}

async function getOpenRouterKey() {
  const prisma = getPrisma();
  const rows = await prisma.$queryRawUnsafe(
    `SELECT "apiKey" FROM public.ai_keys WHERE provider = 'OPENROUTER' AND "isActive" = true ORDER BY priority ASC LIMIT 1`
  );
  if (rows?.length) return rows[0].apiKey;
  throw new Error("OPENROUTER_API_KEY not found in ai_keys table");
}

exports.generateImage = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { prompt, model = "google/gemini-3.1-flash-image", aspectRatio = "1:1", style, negativePrompt, size, productImage } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: "الصورة مطلوب" });
    }
    if (!ALLOWED_MODELS.includes(model)) {
      return res.status(400).json({ success: false, message: "موديل غير مدعوم" });
    }

    const apiKey = await getOpenRouterKey();

    const systemPrompt = [
      "You are a professional social media image designer. Generate a high-quality image based on the user's request.",
      productImage ? "The user has provided a reference product image. Use it as the primary visual — place the actual product from the reference image into the design. Do NOT ignore the reference or invent a different product." : "",
      style ? `Style: ${style}.` : "",
      negativePrompt ? `Avoid: ${negativePrompt}.` : "",
      "Ensure the image is suitable for social media use with clear composition and appropriate colors.",
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

    const userContent = productImage
      ? [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: productImage } },
        ]
      : prompt;

    const response = await axios.post(
      `${OPENROUTER_BASE}/chat/completions`,
      {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "image" },
        ...(dims ? { width: dims.width, height: dims.height } : {}),
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://maxp.online",
          "X-Title": "MaxP Social Image Generator",
        },
        timeout: 120000,
      }
    );

    const result = response.data;
    let imageUrl = "";
    const msg = result?.choices?.[0]?.message;
    if (msg) {
      if (typeof msg.content === "string") {
        imageUrl = msg.content;
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === "image_url") {
            imageUrl = part.image_url?.url || imageUrl;
          }
        }
      }
      if (!imageUrl && msg.image_url?.url) imageUrl = msg.image_url.url;
      if (!imageUrl && msg.images) {
        const imgArr = Array.isArray(msg.images) ? msg.images : Object.values(msg.images);
        for (const img of imgArr) {
          if (typeof img === "string") { imageUrl = img; break; }
          if (img?.url) { imageUrl = img.url; break; }
          if (img?.image_url?.url) { imageUrl = img.image_url.url; break; }
        }
      }
    }
    if (!imageUrl) imageUrl = result?.data?.[0]?.url || "";
    if (imageUrl && imageUrl.startsWith("data:")) {
      const ext = imageUrl.startsWith("data:image/png") ? "png" : "jpg";
      const buffer = Buffer.from(imageUrl.split(",")[1], "base64");
      const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
      const relativeDir = `uploads/ai-images/${companyId || "unknown"}`;
      const absoluteDir = path.join(__dirname, "..", relativeDir);
      if (!fs.existsSync(absoluteDir)) fs.mkdirSync(absoluteDir, { recursive: true });
      fs.writeFileSync(path.join(absoluteDir, filename), buffer);
      imageUrl = `/${relativeDir}/${filename}`;
    }

    return res.status(200).json({
      success: true,
      data: {
        imageUrl,
        model: result.model || model,
        usage: result.usage || null,
      },
    });
  } catch (error) {
    const status = error.response?.status || 500;
    const detail = error.response?.data?.error?.message || error.message;
    return res.status(status).json({ success: false, message: detail });
  }
};

exports.getModelConfig = async (req, res) => {
  try {
    const template = await aiServiceAdminClient.getAgentTemplate("social-media-image-agent");
    const model = template?.model_policy?.default || ALLOWED_MODELS[0];
    res.json({ success: true, data: { model, allowedModels: ALLOWED_MODELS } });
  } catch {
    res.json({ success: true, data: { model: ALLOWED_MODELS[0], allowedModels: ALLOWED_MODELS } });
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
        return { filename: f, url: `/uploads/ai-images/${companyId || "unknown"}/${f}`, createdAt: stat.birthtime || stat.mtime, size: stat.size };
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
