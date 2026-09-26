const fs = require("fs");
const path = require("path");
const { getSharedPrismaClient } = require("../services/sharedDatabase");
const sharp = require("sharp");
const { getMetaGraphApiVersion } = require("../config/metaApi");
const { decryptField } = require("../utils/fieldEncryption");

const FACEBOOK_GRAPH_API_VERSION = getMetaGraphApiVersion();
const META_GRAPH_API_BASE_URL = (
  process.env.META_GRAPH_API_BASE_URL || "https://graph.facebook.com"
).replace(/\/$/, "");
const META_MEDIA_REFERENCE_PREFIX = "meta-media:";
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36";
const DEFAULT_ACCEPT_HEADER =
  "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
const DIRECT_ALLOWED_URL_PATTERNS = [
  /^https?:\/\/(?:www\.)?maxp\.online\//i,
  /^https:\/\/(?:www\.)?mokhtarelhenawy\.online\//i,
  /^http:\/\/mokhtarelhenawy\.online\//i,
  /^https:\/\/(?:[^/]+\.)?fbcdn\.net\//i,
  /^https:\/\/(?:[^/]+\.)?fbsbx\.com\//i,
  /^https:\/\/(?:[^/]+\.)?facebook\.com\//i,
  /^https:\/\/files\.easy-orders\.net\//i,
  /^https:\/\/images\.unsplash\.com\//i,
  /^https:\/\/lh3\.googleusercontent\.com\/aida-public\//i,
  /^https:\/\/pps\.whatsapp\.net\//i,
];
const MIN_TRANSFORM_WIDTH = 64;
const MAX_TRANSFORM_WIDTH = 1600;
const MIN_TRANSFORM_QUALITY = 40;
const MAX_TRANSFORM_QUALITY = 90;
const DEFAULT_TRANSFORM_QUALITY = 76;
const DEFAULT_TRANSFORM_FORMAT = "webp";
const TRANSFORMABLE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
]);
const SUPPORTED_TRANSFORM_FORMATS = new Set(["webp", "avif", "jpeg"]);
const FALLBACK_AVATAR_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" role="img" aria-label="Avatar unavailable">
  <rect width="96" height="96" rx="48" fill="#eef2f7"/>
  <circle cx="48" cy="36" r="18" fill="#c7d2e0"/>
  <path d="M18 82c4-15 16-24 30-24s26 9 30 24" fill="#c7d2e0"/>
</svg>`.trim();
let whatsAppSessionColumnSetPromise = null;

const parseJsonSafely = (value, fallback = null) => {
  if (!value || typeof value !== "string") {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const firstQueryValue = (value) => (Array.isArray(value) ? value[0] : value);

const parsePositiveInteger = (value) => {
  const parsed = Number(firstQueryValue(value));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
};

const clampNumber = (value, min, max) => Math.min(Math.max(value, min), max);

const getDatabaseUrl = () => process.env.POSTGRES_URL || process.env.DATABASE_URL || "";

const isMysqlDatabase = () => getDatabaseUrl().toLowerCase().startsWith("mysql://");

const quoteSqlIdentifier = (identifier) =>
  isMysqlDatabase() ? `\`${identifier}\`` : `"${identifier}"`;

const escapeSqlLiteral = (value) => String(value || "").replace(/'/g, "''");

const parseMetaMediaReference = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized.startsWith(META_MEDIA_REFERENCE_PREFIX)) {
    return null;
  }

  const mediaId = normalized.slice(META_MEDIA_REFERENCE_PREFIX.length).trim();
  return mediaId || null;
};

const normalizeImageTransformOptions = (query = {}) => {
  const requestedWidth = parsePositiveInteger(query.w || query.width);
  const requestedQuality = parsePositiveInteger(query.q || query.quality);
  const requestedFormat = String(firstQueryValue(query.format) || "")
    .trim()
    .toLowerCase();
  const format = SUPPORTED_TRANSFORM_FORMATS.has(requestedFormat)
    ? requestedFormat
    : null;
  const shouldTransform = Boolean(requestedWidth || requestedQuality || format);

  return {
    shouldTransform,
    width: requestedWidth
      ? clampNumber(requestedWidth, MIN_TRANSFORM_WIDTH, MAX_TRANSFORM_WIDTH)
      : null,
    quality: requestedQuality
      ? clampNumber(
          requestedQuality,
          MIN_TRANSFORM_QUALITY,
          MAX_TRANSFORM_QUALITY,
        )
      : DEFAULT_TRANSFORM_QUALITY,
    format: format || (shouldTransform ? DEFAULT_TRANSFORM_FORMAT : null),
  };
};

const normalizeContentType = (contentType) =>
  String(contentType || "image/jpeg").split(";")[0].trim().toLowerCase();

const isTransformableContentType = (contentType) =>
  TRANSFORMABLE_CONTENT_TYPES.has(normalizeContentType(contentType));

const transformImageBuffer = async (buffer, transformOptions) => {
  const pipeline = sharp(buffer, { animated: false }).rotate();

  if (transformOptions.width) {
    pipeline.resize({
      width: transformOptions.width,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  if (transformOptions.format === "avif") {
    pipeline.avif({ quality: transformOptions.quality });
  } else if (transformOptions.format === "jpeg") {
    pipeline.jpeg({
      quality: transformOptions.quality,
      mozjpeg: true,
    });
  } else {
    pipeline.webp({
      quality: transformOptions.quality,
      effort: 4,
    });
  }

  const result = await pipeline.toBuffer();
  pipeline.destroy();
  return result;
};

const isAllowedDirectUrl = (targetUrl) => {
  if (typeof targetUrl !== "string" || !targetUrl.trim()) {
    return false;
  }

  if (
    targetUrl.includes("/uploads/") ||
    targetUrl.startsWith("/uploads/") ||
    targetUrl.startsWith("uploads/")
  ) {
    return true;
  }

  if (DIRECT_ALLOWED_URL_PATTERNS.some((pattern) => pattern.test(targetUrl))) {
    return true;
  }

  if (targetUrl.includes("/wp-content/uploads/")) {
    return true;
  }

  return /\.(jpg|jpeg|png|webp|gif|svg|mp3|m4a|aac|ogg|oga|opus|wav|webm|weba|mp4)(\?.*)?$/i.test(targetUrl);
};

const isFacebookExpiringMediaUrl = (targetUrl) => {
  if (typeof targetUrl !== "string" || !targetUrl.trim()) {
    return false;
  }

  try {
    const { hostname } = new URL(targetUrl);
    const normalizedHostname = hostname.toLowerCase();
    return (
      normalizedHostname.endsWith("fbcdn.net")
      || normalizedHostname.endsWith("fbsbx.com")
      || normalizedHostname === "lookaside.facebook.com"
      || normalizedHostname.endsWith(".facebook.com")
    );
  } catch {
    return false;
  }
};

const isAvatarLikeUrl = (targetUrl) => {
  if (typeof targetUrl !== "string" || !targetUrl.trim()) {
    return false;
  }

  const normalized = targetUrl.toLowerCase();
  return (
    normalized.includes("pps.whatsapp.net")
    || normalized.includes("/t61.24694-24/")
    || normalized.includes("profile_pic")
    || normalized.includes("lookaside.facebook.com")
    || normalized.includes("avatar")
  );
};

const getFacebookFriendlyHeaders = (targetUrl) => {
  let hostname = "";

  try {
    hostname = new URL(targetUrl).hostname.toLowerCase();
  } catch {
    hostname = "";
  }

  const isFacebookCdn =
    hostname.includes("fbcdn.net") ||
    hostname.includes("fbsbx.com") ||
    hostname.includes("facebook.com");
  const isAudioOrVideo =
    /\.(mp3|m4a|aac|ogg|oga|opus|wav|webm|weba|mp4)(\?.*)?$/i.test(targetUrl) ||
    /audio|voice|audioclip|file_stream\.php/i.test(targetUrl);
  const acceptHeader = isAudioOrVideo ? "*/*" : DEFAULT_ACCEPT_HEADER;

  return {
    "User-Agent": DEFAULT_USER_AGENT,
    Accept: acceptHeader,
    "Accept-Language": "en-US,en;q=0.9",
    ...(isFacebookCdn ? { Referer: "https://www.facebook.com/" } : {}),
  };
};

const getMetaGraphHeaders = (accessToken, accept = "application/json") => ({
  Authorization: `Bearer ${accessToken}`,
  "User-Agent": DEFAULT_USER_AGENT,
  Accept: accept,
});

const uploadRoots = [
  path.resolve(__dirname, "../uploads"),
  path.resolve(__dirname, "../../uploads"),
  path.resolve(__dirname, "uploads"),
  path.resolve(process.cwd(), "uploads"),
].filter((root, index, roots) => roots.indexOf(root) === index);

const resolveLocalUploadFilePath = (targetUrl) => {
  if (typeof targetUrl !== "string" || !targetUrl.trim()) {
    return null;
  }

  let pathname = targetUrl.trim();
  if (pathname.startsWith("http://") || pathname.startsWith("https://")) {
    try {
      pathname = new URL(pathname).pathname;
    } catch {
      return null;
    }
  }

  let relative = "";
  if (pathname.startsWith("/uploads/")) {
    relative = pathname.substring("/uploads/".length);
  } else if (pathname.startsWith("uploads/")) {
    relative = pathname.substring("uploads/".length);
  } else if (pathname.includes("/uploads/")) {
    const idx = pathname.indexOf("/uploads/");
    relative = pathname.substring(idx + "/uploads/".length);
  } else {
    return null;
  }

  try {
    relative = decodeURIComponent(relative).replace(/^\/+/, "");
  } catch {
    relative = relative.replace(/^\/+/, "");
  }

  if (!relative) {
    return null;
  }

  for (const root of uploadRoots) {
    const candidatePath = path.resolve(root, relative);
    if (
      candidatePath !== root &&
      !candidatePath.startsWith(`${root}${path.sep}`)
    ) {
      continue;
    }

    try {
      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
        return candidatePath;
      }
    } catch {
      continue;
    }
  }

  return null;
};

const sendBufferWithRange = (req, res, buffer, contentType, statusCode = 200) => {
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Content-Type", contentType);

  const totalLength = buffer.length;
  const rangeHeader = req.headers.range;

  if (rangeHeader && typeof rangeHeader === "string" && rangeHeader.startsWith("bytes=")) {
    const rangeParts = rangeHeader.replace(/bytes=/, "").split("-");
    let start = parseInt(rangeParts[0], 10);
    let end = rangeParts[1] ? parseInt(rangeParts[1], 10) : totalLength - 1;

    if (isNaN(start)) {
      start = totalLength - end;
      end = totalLength - 1;
    }
    if (isNaN(end) || end >= totalLength) {
      end = totalLength - 1;
    }

    if (start >= totalLength || start > end) {
      res.setHeader("Content-Range", `bytes */${totalLength}`);
      return res.status(416).end();
    }

    const chunkLength = end - start + 1;
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${totalLength}`);
    res.setHeader("Content-Length", String(chunkLength));
    return res.send(buffer.subarray(start, end + 1));
  }

  res.setHeader("Content-Length", String(totalLength));
  return res.status(statusCode).send(buffer);
};

const sendLocalFileResponse = async (req, res, filePath, transformOptions) => {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".avif": "image/avif",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".ogg": "audio/ogg",
    ".oga": "audio/ogg",
    ".opus": "audio/opus",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".weba": "audio/webm",
    ".mp4": "video/mp4",
  };
  const originalContentType = mimeMap[ext] || "application/octet-stream";
  const shouldTransform =
    transformOptions?.shouldTransform && isTransformableContentType(originalContentType);

  res.setHeader(
    "Content-Type",
    shouldTransform ? `image/${transformOptions.format}` : originalContentType,
  );
  res.setHeader(
    "Cache-Control",
    shouldTransform
      ? "public, max-age=604800, stale-while-revalidate=2592000"
      : "public, max-age=3600, stale-while-revalidate=86400",
  );
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Accept-Ranges", "bytes");

  if ((req.method || "").toUpperCase() === "HEAD") {
    return res.status(200).end();
  }

  const responseBuffer = await fs.promises.readFile(filePath);

  if (!shouldTransform) {
    return sendBufferWithRange(req, res, responseBuffer, originalContentType, 200);
  }

  try {
    const transformedBuffer = await transformImageBuffer(
      responseBuffer,
      transformOptions,
    );
    return sendBufferWithRange(
      req,
      res,
      transformedBuffer,
      `image/${transformOptions.format}`,
      200,
    );
  } catch (error) {
    console.warn("⚠️ [IMAGE-PROXY] Local file transform failed, serving original:", {
      filePath,
      message: error?.message,
    });
    return sendBufferWithRange(req, res, responseBuffer, originalContentType, 200);
  }
};

const detectMediaContentType = (buffer, fallbackContentType = "") => {
  if (!buffer || buffer.length < 4) return fallbackContentType;
  // MP4 / M4A (ftyp box at offset 4)
  if (buffer.length >= 8 && buffer.toString("ascii", 4, 8) === "ftyp") {
    return "audio/mp4";
  }
  // ID3v2 for MP3
  if (buffer.toString("ascii", 0, 3) === "ID3") {
    return "audio/mpeg";
  }
  // MP3 frame sync (0xFF followed by 0xFB, 0xF3, 0xF2, 0xE0-0xFF)
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    if ((buffer[1] & 0xf6) === 0xf0) {
      return "audio/aac";
    }
    return "audio/mpeg";
  }
  // OggS (Ogg container / Opus / Vorbis)
  if (buffer.toString("ascii", 0, 4) === "OggS") {
    return "audio/ogg";
  }
  // RIFF .... WAVE
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.length >= 12 && buffer.toString("ascii", 8, 12) === "WAVE") {
    return "audio/wav";
  }
  // WebM / Matroska
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return "audio/webm";
  }
  return fallbackContentType;
};

const sendRemoteResponse = async (req, res, response, transformOptions) => {
  let contentType = response.headers.get("content-type") || "";
  const cacheControl = response.headers.get("cache-control");

  const targetUrl = req.query.url ? String(req.query.url).toLowerCase() : "";
  const isAudioRequested =
    req.query.media === "audio" ||
    req.query.type === "audio" ||
    /audioclip|audio|voice|file_stream\.php/i.test(targetUrl);

  if (
    !contentType ||
    contentType === "application/octet-stream" ||
    contentType === "binary/octet-stream" ||
    contentType.startsWith("text/")
  ) {
    if (/\.(mp3)(\?.*)?$/i.test(targetUrl)) contentType = "audio/mpeg";
    else if (/\.(m4a)(\?.*)?$/i.test(targetUrl)) contentType = "audio/mp4";
    else if (/\.(aac)(\?.*)?$/i.test(targetUrl)) contentType = "audio/aac";
    else if (/\.(ogg|oga|opus)(\?.*)?$/i.test(targetUrl)) contentType = "audio/ogg";
    else if (/\.(wav)(\?.*)?$/i.test(targetUrl)) contentType = "audio/wav";
    else if (/\.(webm|weba)(\?.*)?$/i.test(targetUrl)) contentType = "audio/webm";
    else if (/\.(mp4)(\?.*)?$/i.test(targetUrl)) contentType = "video/mp4";
    else if (isAudioRequested) contentType = "audio/mp4";
    else if (!contentType) contentType = "image/jpeg";
  }

  res.setHeader(
    "Cache-Control",
    cacheControl || "public, max-age=3600, stale-while-revalidate=86400",
  );
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Accept-Ranges", "bytes");

  if ((req.method || "").toUpperCase() === "HEAD") {
    res.setHeader("Content-Type", contentType);
    return res.status(200).end();
  }

  const buffer = await response.arrayBuffer();
  const responseBuffer = Buffer.from(buffer);

  // Inspect payload magic bytes to detect actual audio types (M4A/AAC/MP3/OGG)
  const detectedAudioType = detectMediaContentType(responseBuffer);
  if (detectedAudioType) {
    contentType = detectedAudioType;
  } else if (
    isAudioRequested &&
    (!contentType ||
      contentType === "application/octet-stream" ||
      contentType === "binary/octet-stream" ||
      contentType.startsWith("text/") ||
      contentType.startsWith("image/"))
  ) {
    contentType = "audio/mp4";
  }

  const isAudioOrVideoBuffer =
    contentType.startsWith("audio/") ||
    contentType.startsWith("video/") ||
    Boolean(detectedAudioType);

  const shouldTransform =
    !isAudioOrVideoBuffer &&
    transformOptions?.shouldTransform &&
    isTransformableContentType(contentType);

  res.setHeader(
    "Content-Type",
    shouldTransform ? `image/${transformOptions.format}` : contentType,
  );

  if (!shouldTransform) {
    return sendBufferWithRange(req, res, responseBuffer, contentType, 200);
  }

  try {
    const transformedBuffer = await transformImageBuffer(
      responseBuffer,
      transformOptions,
    );
    return sendBufferWithRange(
      req,
      res,
      transformedBuffer,
      `image/${transformOptions.format}`,
      200,
    );
  } catch (error) {
    console.warn("⚠️ [IMAGE-PROXY] Image transform failed, serving original:", {
      contentType,
      width: transformOptions.width,
      format: transformOptions.format,
      message: error?.message,
    });
    return sendBufferWithRange(req, res, responseBuffer, contentType, 200);
  }
};

const sendInlineAssetResponse = (req, res, { body, contentType, cacheControl }) => {
  res.setHeader("Content-Type", contentType);
  res.setHeader(
    "Cache-Control",
    cacheControl || "public, max-age=3600, stale-while-revalidate=86400",
  );
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

  if ((req.method || "").toUpperCase() === "HEAD") {
    return res.status(200).end();
  }

  return res.status(200).send(body);
};

const sendCustomerAvatarFallback = (req, res) =>
  sendInlineAssetResponse(req, res, {
    body: FALLBACK_AVATAR_SVG,
    contentType: "image/svg+xml; charset=utf-8",
    cacheControl: "public, max-age=300, stale-while-revalidate=86400",
  });

const fetchRemoteAsset = async (targetUrl) => {
  let finalUrl = targetUrl;
  if (typeof finalUrl === "string" && finalUrl.startsWith("/")) {
    const localPort = process.env.PORT || 3007;
    finalUrl = `http://127.0.0.1:${localPort}${finalUrl}`;
  }
  return fetch(finalUrl, {
    method: "GET",
    headers: getFacebookFriendlyHeaders(finalUrl),
    redirect: "follow",
  });
};

const extractRemoteFailureDetails = async (response) => {
  try {
    return (await response.text()).slice(0, 160);
  } catch {
    return "";
  }
};

const getMessageMediaUrlFromPayload = (payload, targetIndex = null, targetAttachmentId = null) => {
  const attachmentsList = payload?.attachments?.data;
  if (!Array.isArray(attachmentsList) || attachmentsList.length === 0) {
    return null;
  }

  let attachment = null;
  if (targetAttachmentId) {
    attachment = attachmentsList.find(
      (a) => String(a.id || "").trim() === String(targetAttachmentId).trim()
    );
  }
  if (!attachment && Number.isInteger(targetIndex) && targetIndex >= 0 && targetIndex < attachmentsList.length) {
    attachment = attachmentsList[targetIndex];
  }
  if (!attachment) {
    attachment = attachmentsList[0];
  }

  return (
    attachment.image_data?.url ||
    attachment.file_url ||
    attachment.url ||
    attachment.payload?.url ||
    attachment.payload?.image_url ||
    attachment.image?.url ||
    null
  );
};

const getStoredMessageMediaUrl = (message, targetIndex = null, targetAttachmentId = null) => {
  if (!message) {
    return null;
  }

  const attachments = parseJsonSafely(message.attachments, null);
  if (Array.isArray(attachments) && attachments.length > 0) {
    let attachment = null;
    if (targetAttachmentId) {
      attachment = attachments.find(
        (a) =>
          String(a?.id || a?.attachmentId || "").trim() ===
          String(targetAttachmentId).trim()
      );
    }
    if (!attachment && Number.isInteger(targetIndex) && targetIndex >= 0 && targetIndex < attachments.length) {
      attachment = attachments[targetIndex];
    }
    if (!attachment) {
      attachment = attachments[0];
    }

    const resolvedUrl = (
      attachment?.image_data?.url ||
      attachment?.file_url ||
      attachment?.url ||
      attachment?.payload?.url ||
      attachment?.payload?.image_url ||
      attachment?.image?.url ||
      null
    );

    if (resolvedUrl) {
      return resolvedUrl;
    }
  }

  if (isAllowedDirectUrl(message.content)) {
    return message.content;
  }

  return null;
};

const resolveWhatsAppMetaMediaConfig = (session) => {
  const accessToken = session?.metaAccessToken ? decryptField(session.metaAccessToken) : null;
  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    apiVersion:
      session?.metaApiVersion ||
      getMetaGraphApiVersion(),
  };
};

const getWhatsAppSessionColumnSet = async (prisma) => {
  if (!whatsAppSessionColumnSetPromise) {
    whatsAppSessionColumnSetPromise = prisma
      .$queryRawUnsafe(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'whatsapp_sessions'
      `)
      .then((rows) => new Set(rows.map((row) => row.column_name)))
      .catch((error) => {
        whatsAppSessionColumnSetPromise = null;
        throw error;
      });
  }

  return whatsAppSessionColumnSetPromise;
};

const getMetaConfigValueFromMetadata = (metadata, key) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const nestedBuckets = [
    metadata,
    metadata.meta,
    metadata.metaCloud,
    metadata.whatsappMeta,
    metadata.providerConfig,
  ];

  for (const bucket of nestedBuckets) {
    if (
      bucket &&
      typeof bucket === "object" &&
      !Array.isArray(bucket) &&
      typeof bucket[key] === "string" &&
      bucket[key].trim()
    ) {
      return bucket[key].trim();
    }
  }

  return null;
};

const resolveLegacyWhatsAppSessionMetaConfig = async (prisma, sessionId) => {
  if (!sessionId) {
    return null;
  }

  const columnSet = await getWhatsAppSessionColumnSet(prisma);
  const selectColumns = ["metadata"];

  if (columnSet.has("metaAccessToken")) {
    selectColumns.push("metaAccessToken");
  }

  if (columnSet.has("metaApiVersion")) {
    selectColumns.push("metaApiVersion");
  }

  const sql = `
    SELECT ${selectColumns.map(quoteSqlIdentifier).join(", ")}
    FROM ${quoteSqlIdentifier("whatsapp_sessions")}
    WHERE ${quoteSqlIdentifier("id")} = $1
    LIMIT 1
  `;
  const rows = await prisma.$queryRawUnsafe(sql, sessionId);
  const sessionRow = Array.isArray(rows) ? rows[0] : null;

  if (!sessionRow) {
    return null;
  }

  const metadata = parseJsonSafely(sessionRow.metadata, {});
  return {
    metaAccessToken:
      sessionRow.metaAccessToken ||
      getMetaConfigValueFromMetadata(metadata, "metaAccessToken") ||
      getMetaConfigValueFromMetadata(metadata, "accessToken"),
    metaApiVersion:
      sessionRow.metaApiVersion ||
      getMetaConfigValueFromMetadata(metadata, "metaApiVersion") ||
      getMetaConfigValueFromMetadata(metadata, "apiVersion"),
  };
};

const findPageTokenForConversation = async (prisma, conversation) => {
  const metadata = parseJsonSafely(conversation?.metadata, {});
  const pageId = metadata?.pageId || null;
  const companyId = conversation?.companyId || null;

  if (!companyId) {
    return null;
  }

  const page = await prisma.facebookPage.findFirst({
    where: {
      companyId,
      ...(pageId ? { pageId } : {}),
    },
    select: {
      pageId: true,
      pageAccessToken: true,
    },
    orderBy: pageId ? undefined : { updatedAt: "desc" },
  });

  return page?.pageAccessToken || null;
};

const resolveFreshMessageMediaUrl = async (
  prisma,
  messageId,
  targetIndex = null,
  targetAttachmentId = null,
) => {
  if (!messageId) {
    return null;
  }

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      conversation: {
        select: {
          companyId: true,
          metadata: true,
        },
      },
    },
  });

  if (!message?.conversation) {
    return null;
  }

  const storedMediaUrl = getStoredMessageMediaUrl(
    message,
    targetIndex,
    targetAttachmentId,
  );
  const metadata = parseJsonSafely(message.metadata, {});
  const facebookMessageId = metadata?.facebookMessageId;
  if (!facebookMessageId) {
    return storedMediaUrl || null;
  }

  if (storedMediaUrl && !isFacebookExpiringMediaUrl(storedMediaUrl)) {
    return storedMediaUrl;
  }

  const pageAccessToken = await findPageTokenForConversation(
    prisma,
    message.conversation,
  );
  if (!pageAccessToken) {
    return storedMediaUrl || null;
  }

  const graphUrl =
    `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/${facebookMessageId}` +
    `?fields=attachments{id,image_data{url},file_url,url,payload}` +
    `&access_token=${encodeURIComponent(pageAccessToken)}`;

  const graphResponse = await fetch(graphUrl, {
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!graphResponse.ok) {
    const failureText = await extractRemoteFailureDetails(graphResponse);
    console.warn("⚠️ [IMAGE-PROXY] Graph refresh failed for message media:", {
      messageId,
      facebookMessageId,
      status: graphResponse.status,
      failureText,
    });
    return storedMediaUrl || null;
  }

  const graphPayload = await graphResponse.json();
  return (
    getMessageMediaUrlFromPayload(
      graphPayload,
      targetIndex,
      targetAttachmentId,
    ) ||
    storedMediaUrl ||
    null
  );
};

const resolveFreshCustomerAvatarUrl = async (prisma, customerId) => {
  if (!customerId) {
    return null;
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      companyId: true,
      avatar: true,
      facebookId: true,
      metadata: true,
    },
  });

  if (!customer) {
    return null;
  }

  if (customer.avatar) {
    return customer.avatar;
  }

  const metadata = parseJsonSafely(customer.metadata, {});
  const metadataAvatar =
    metadata?.profilePicture ||
    metadata?.facebookProfile?.profile_pic ||
    metadata?.avatar ||
    null;

  if (!customer.facebookId || !customer.companyId) {
    return metadataAvatar;
  }

  const latestConversation = await prisma.conversation.findFirst({
    where: {
      customerId,
      companyId: customer.companyId,
      channel: "FACEBOOK",
    },
    select: {
      metadata: true,
      companyId: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const pageAccessToken = latestConversation
    ? await findPageTokenForConversation(prisma, latestConversation)
    : null;

  if (!pageAccessToken) {
    return metadataAvatar;
  }

  const graphUrl =
    `https://graph.facebook.com/${FACEBOOK_GRAPH_API_VERSION}/${customer.facebookId}` +
    `?fields=profile_pic&access_token=${encodeURIComponent(pageAccessToken)}`;

  const graphResponse = await fetch(graphUrl, {
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Accept: "application/json",
    },
  });

  if (!graphResponse.ok) {
    const failureText = await extractRemoteFailureDetails(graphResponse);
    console.warn("⚠️ [IMAGE-PROXY] Graph refresh failed for customer avatar:", {
      customerId,
      facebookId: customer.facebookId,
      status: graphResponse.status,
      failureText,
    });

    return metadataAvatar;
  }

  const graphPayload = await graphResponse.json();
  return graphPayload?.profile_pic || metadataAvatar;
};

const resolveWhatsAppMessageMedia = async (prisma, whatsAppMessageId) => {
  if (!whatsAppMessageId) {
    return null;
  }

  const message = await prisma.whatsAppMessage.findUnique({
    where: { id: whatsAppMessageId },
    select: {
      id: true,
      mediaUrl: true,
      sessionId: true,
    },
  });

  const storedMediaUrl =
    typeof message?.mediaUrl === "string" ? message.mediaUrl.trim() : "";
  if (!storedMediaUrl) {
    return null;
  }

  const metaMediaId = parseMetaMediaReference(storedMediaUrl);
  if (!metaMediaId) {
    return { url: storedMediaUrl };
  }

  const sessionMetaConfig = await resolveLegacyWhatsAppSessionMetaConfig(
    prisma,
    message.sessionId,
  );
  const metaConfig = resolveWhatsAppMetaMediaConfig(sessionMetaConfig);
  if (!metaConfig) {
    console.warn(
      "⚠️ [IMAGE-PROXY] Missing Meta Cloud credentials for WhatsApp media proxy:",
      {
        whatsAppMessageId,
      },
    );
    return {
      status: 404,
      details: "Missing Meta Cloud credentials for WhatsApp media",
    };
  }

  const graphResponse = await fetch(
    `${META_GRAPH_API_BASE_URL}/${metaConfig.apiVersion}/${metaMediaId}`,
    {
      method: "GET",
      headers: getMetaGraphHeaders(metaConfig.accessToken),
      redirect: "follow",
    },
  );

  if (!graphResponse.ok) {
    const failureText = await extractRemoteFailureDetails(graphResponse);
    console.warn(
      "⚠️ [IMAGE-PROXY] Meta Graph media lookup failed for WhatsApp message:",
      {
        whatsAppMessageId,
        metaMediaId,
        status: graphResponse.status,
        failureText,
      },
    );
    return {
      status: graphResponse.status || 502,
      details: failureText || "Meta media lookup failed",
    };
  }

  const graphPayload = await graphResponse.json();
  const downloadUrl =
    typeof graphPayload?.url === "string" ? graphPayload.url.trim() : "";

  if (!downloadUrl) {
    console.warn(
      "⚠️ [IMAGE-PROXY] Meta Graph response missing download URL for WhatsApp message:",
      {
        whatsAppMessageId,
        metaMediaId,
      },
    );
    return {
      status: 502,
      details: "Meta media response missing download URL",
    };
  }

  const mediaResponse = await fetch(downloadUrl, {
    method: "GET",
    headers: getMetaGraphHeaders(metaConfig.accessToken, "*/*"),
    redirect: "follow",
  });

  if (!mediaResponse.ok) {
    const failureText = await extractRemoteFailureDetails(mediaResponse);
    console.warn(
      "⚠️ [IMAGE-PROXY] Meta media download failed for WhatsApp message:",
      {
        whatsAppMessageId,
        metaMediaId,
        status: mediaResponse.status,
        failureText,
      },
    );
    return {
      status: mediaResponse.status || 502,
      details: failureText || "Meta media download failed",
    };
  }

  return { response: mediaResponse };
};

const proxyImage = async (req, res) => {
  try {
    const targetUrl =
      typeof req.query.url === "string" && req.query.url.trim()
        ? req.query.url.trim()
        : "";
    const messageId =
      typeof req.query.messageId === "string" && req.query.messageId.trim()
        ? req.query.messageId.trim()
        : "";
    const customerId =
      typeof req.query.customerId === "string" && req.query.customerId.trim()
        ? req.query.customerId.trim()
        : "";
    const whatsAppMessageId =
      typeof req.query.whatsAppMessageId === "string" &&
      req.query.whatsAppMessageId.trim()
        ? req.query.whatsAppMessageId.trim()
        : "";
    const attachmentIndexParam = req.query.index ?? req.query.attachmentIndex;
    const attachmentIndex =
      attachmentIndexParam !== undefined &&
      attachmentIndexParam !== null &&
      attachmentIndexParam !== ""
        ? parseInt(String(attachmentIndexParam), 10)
        : null;
    const attachmentId =
      typeof req.query.attachmentId === "string" && req.query.attachmentId.trim()
        ? req.query.attachmentId.trim()
        : "";
    const transformOptions = normalizeImageTransformOptions(req.query);
    const isAvatarRequest = Boolean(
      (customerId && !messageId) ||
      isAvatarLikeUrl(targetUrl) ||
      req.query.type === "avatar" ||
      req.query.fallback === "avatar"
    );

    if (!targetUrl && !messageId && !customerId && !whatsAppMessageId) {
      return res.status(400).json({
        error:
          "At least one of url, messageId, customerId, or whatsAppMessageId is required",
      });
    }

    const prisma =
      messageId || customerId || whatsAppMessageId ? getSharedPrismaClient() : null;
    const candidateUrls = [];
    const seenUrls = new Set();
    let lastFailureStatus = 502;
    let lastFailureText = "";

    const addCandidateUrl = (value) => {
      if (!value || typeof value !== "string" || !value.trim()) {
        return;
      }

      const normalized = value.trim();
      if (!isAllowedDirectUrl(normalized) || seenUrls.has(normalized)) {
        return;
      }

      seenUrls.add(normalized);
      candidateUrls.push(normalized);
    };

    addCandidateUrl(targetUrl);

    if (messageId) {
      addCandidateUrl(
        await resolveFreshMessageMediaUrl(
          prisma,
          messageId,
          attachmentIndex,
          attachmentId,
        ),
      );
    }

    if (customerId) {
      addCandidateUrl(await resolveFreshCustomerAvatarUrl(prisma, customerId));
    }

    if (whatsAppMessageId) {
      const whatsAppMediaResult = await resolveWhatsAppMessageMedia(
        prisma,
        whatsAppMessageId,
      );

      if (whatsAppMediaResult?.response) {
        return sendRemoteResponse(
          req,
          res,
          whatsAppMediaResult.response,
          transformOptions,
        );
      }

      addCandidateUrl(whatsAppMediaResult?.url);

      if (whatsAppMediaResult?.status) {
        lastFailureStatus = whatsAppMediaResult.status;
        lastFailureText = whatsAppMediaResult.details || "";
      }
    }

    if (candidateUrls.length === 0) {
      if (isAvatarRequest) {
        console.warn("⚠️ [IMAGE-PROXY] No proxyable avatar asset was found, serving fallback avatar:", {
          customerId: customerId || null,
          targetUrl: targetUrl || null,
        });
        return sendCustomerAvatarFallback(req, res);
      }

      return res.status(lastFailureStatus === 502 ? 404 : lastFailureStatus).json({
        error: "No proxyable asset was found",
        details: lastFailureText || undefined,
      });
    }

    for (const candidateUrl of candidateUrls) {
      const localFilePath = resolveLocalUploadFilePath(candidateUrl);
      if (localFilePath) {
        return await sendLocalFileResponse(
          req,
          res,
          localFilePath,
          transformOptions,
        );
      }

      const response = await fetchRemoteAsset(candidateUrl);
      if (response.ok) {
        return sendRemoteResponse(req, res, response, transformOptions);
      }

      lastFailureStatus = response.status || lastFailureStatus;
      lastFailureText = await extractRemoteFailureDetails(response);

      console.warn("⚠️ [IMAGE-PROXY] Remote asset fetch failed, trying fallback:", {
        candidateUrl,
        status: response.status,
        messageId: messageId || null,
        customerId: customerId || null,
        whatsAppMessageId: whatsAppMessageId || null,
        lastFailureText,
      });
    }

    if (isAvatarRequest) {
      console.warn("⚠️ [IMAGE-PROXY] Avatar fetch failed for all candidates, serving fallback avatar:", {
        customerId: customerId || null,
        targetUrl: targetUrl || null,
        lastFailureStatus,
      });
      return sendCustomerAvatarFallback(req, res);
    }

    return res.status(lastFailureStatus).json({
      error: "Failed to fetch image",
      details: lastFailureText || undefined,
    });
  } catch (error) {
    console.error("❌ [IMAGE-PROXY] Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = { normalizeImageTransformOptions, proxyImage };
