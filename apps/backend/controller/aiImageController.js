const axios = require("axios");
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
    const { prompt, model = "google/gemini-3.1-flash-image", aspectRatio = "1:1", style, negativePrompt, size } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ success: false, message: "الصورة مطلوب" });
    }
    if (!ALLOWED_MODELS.includes(model)) {
      return res.status(400).json({ success: false, message: "موديل غير مدعوم" });
    }

    const apiKey = await getOpenRouterKey();

    const systemPrompt = [
      "You are a professional social media image designer. Generate a high-quality image based on the user's request.",
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

    const response = await axios.post(
      `${OPENROUTER_BASE}/chat/completions`,
      {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
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
      if (!imageUrl && Array.isArray(msg.images)) {
        for (const img of msg.images) {
          if (typeof img === "string") { imageUrl = img; break; }
          if (img.url) { imageUrl = img.url; break; }
          if (img.image_url?.url) { imageUrl = img.image_url.url; break; }
        }
      }
    }
    if (!imageUrl) imageUrl = result?.data?.[0]?.url || "";
    const mdMatch = typeof imageUrl === "string" && imageUrl.match(/!\[.*?\]\((.*?)\)/);
    if (mdMatch) imageUrl = mdMatch[1];
    const sf = (v, fb = "") => (v == null ? fb : String(v));
    const choice = result?.choices?.[0];
    const choiceMsg = choice?.message;
    console.log("[AI-IMAGE] RESULT TOP KEYS:", Object.keys(result).join(","));
    console.log("[AI-IMAGE] CHOICE KEYS:", choice ? Object.keys(choice).join(",") : "NO_CHOICES");
    console.log("[AI-IMAGE] CHOICE_MSG KEYS:", choiceMsg ? Object.keys(choiceMsg).join(",") : "NO_MSG");
    console.log("[AI-IMAGE] FULL CHOICE:", sf(JSON.stringify(choice)).slice(0, 6000));
    if (choiceMsg) {
      console.log("[AI-IMAGE] MSG images:", sf(JSON.stringify(choiceMsg.images)).slice(0, 500));
      console.log("[AI-IMAGE] MSG image_url:", sf(JSON.stringify(choiceMsg.image_url)).slice(0, 500));
      console.log("[AI-IMAGE] MSG type:", choiceMsg.type);
      console.log("[AI-IMAGE] MSG content type:", typeof choiceMsg.content, Array.isArray(choiceMsg.content) ? "array" : sf(choiceMsg.content).slice(0, 200));
    }
    console.log("[AI-IMAGE] result.urls:", sf(JSON.stringify(result.urls)).slice(0, 500));
    console.log("[AI-IMAGE] result.data:", sf(JSON.stringify(result.data)).slice(0, 500));
    console.log("[AI-IMAGE] FINAL imageUrl length:", imageUrl?.length || 0, "starts with:", imageUrl?.slice(0, 50));
    console.log("[AI-IMAGE] imageUrl empty?", !imageUrl, "is data URL?", imageUrl?.startsWith("data:"));

    return res.status(200).json({
      success: true,
      data: {
        imageUrl,
        model: result.model || model,
        usage: result.usage || null,
      },
    });
  } catch (error) {
    console.error("❌ [AI-IMAGE] Generation failed:", error.message);
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

exports.getModels = async (req, res) => {
  res.json({ success: true, data: ALLOWED_MODELS });
};
