const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { getSharedPrismaClientAsync } = require('./sharedDatabase');

let ensureTablePromise = null;
let isReviewMediaTableReady = false;

const REVIEW_MEDIA_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS product_review_media (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    media_type TEXT NOT NULL,
    file_url TEXT NOT NULL,
    poster_url TEXT,
    alt_text TEXT,
    file_name TEXT,
    mime_type TEXT,
    file_size INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

const normalizeMediaRow = (row) => ({
  id: row.id,
  reviewId: row.review_id || row.reviewId,
  companyId: row.company_id || row.companyId,
  type: row.media_type || row.mediaType,
  url: row.file_url || row.fileUrl,
  poster: row.poster_url || row.posterUrl || null,
  alt: row.alt_text || row.altText || null,
  fileName: row.file_name || row.fileName || null,
  mimeType: row.mime_type || row.mimeType || null,
  fileSize: Number(row.file_size || row.fileSize || 0) || null,
  createdAt: row.created_at || row.createdAt || null,
});

const resolveFileCandidates = (fileUrl) => {
  if (typeof fileUrl !== 'string' || !fileUrl.startsWith('/uploads/')) {
    return [];
  }

  const relativePath = fileUrl.split('?')[0].replace(/^\/+/, '');
  return [
    path.join(__dirname, '..', relativePath),
    path.join(__dirname, '..', '..', relativePath),
  ];
};

const removeLocalFileIfExists = (fileUrl) => {
  resolveFileCandidates(fileUrl).forEach((candidatePath) => {
    try {
      if (fs.existsSync(candidatePath)) {
        fs.unlinkSync(candidatePath);
      }
    } catch (error) {
      console.error('Failed to delete review media file:', candidatePath, error.message);
    }
  });
};

async function ensureReviewMediaTable(prismaOverride = null) {
  if (isReviewMediaTableReady) {
    return;
  }

  if (ensureTablePromise) {
    return ensureTablePromise;
  }

  ensureTablePromise = (async () => {
    const prisma = prismaOverride || (await getSharedPrismaClientAsync());
    await prisma.$executeRawUnsafe(REVIEW_MEDIA_TABLE_SQL);
    isReviewMediaTableReady = true;
  })();

  try {
    await ensureTablePromise;
  } finally {
    ensureTablePromise = null;
  }
}

async function getReviewMedia(reviewId, prismaOverride = null) {
  if (!reviewId) {
    return [];
  }

  const prisma = prismaOverride || (await getSharedPrismaClientAsync());
  await ensureReviewMediaTable(prisma);

  const rows = await prisma.$queryRaw`
    SELECT
      id,
      review_id,
      company_id,
      media_type,
      file_url,
      poster_url,
      alt_text,
      file_name,
      mime_type,
      file_size,
      created_at
    FROM product_review_media
    WHERE review_id = ${reviewId}
    ORDER BY created_at ASC
  `;

  return Array.isArray(rows) ? rows.map(normalizeMediaRow) : [];
}

async function getReviewMediaMap(reviewIds, prismaOverride = null) {
  const normalizedIds = Array.isArray(reviewIds)
    ? reviewIds.map((id) => String(id || '').trim()).filter(Boolean)
    : [];

  if (normalizedIds.length === 0) {
    return new Map();
  }

  const prisma = prismaOverride || (await getSharedPrismaClientAsync());
  await ensureReviewMediaTable(prisma);

  const entries = await Promise.all(
    normalizedIds.map(async (reviewId) => [reviewId, await getReviewMedia(reviewId, prisma)]),
  );

  return new Map(entries);
}

async function saveReviewMedia({
  reviewId,
  companyId,
  mediaItems,
  prisma: prismaOverride = null,
}) {
  if (!reviewId || !companyId || !Array.isArray(mediaItems) || mediaItems.length === 0) {
    return [];
  }

  const prisma = prismaOverride || (await getSharedPrismaClientAsync());
  await ensureReviewMediaTable(prisma);

  const insertedItems = [];

  for (const item of mediaItems) {
    const type =
      String(item.type || '').trim().toLowerCase() === 'video' ? 'video' : 'image';
    const url = String(item.url || '').trim();
    if (!url) {
      continue;
    }

    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO product_review_media (
        id,
        review_id,
        company_id,
        media_type,
        file_url,
        poster_url,
        alt_text,
        file_name,
        mime_type,
        file_size
      )
      VALUES (
        ${id},
        ${reviewId},
        ${companyId},
        ${type},
        ${url},
        ${item.poster || null},
        ${item.alt || null},
        ${item.fileName || null},
        ${item.mimeType || null},
        ${item.fileSize || null}
      )
    `;

    insertedItems.push({
      id,
      reviewId,
      companyId,
      type,
      url,
      poster: item.poster || null,
      alt: item.alt || null,
      fileName: item.fileName || null,
      mimeType: item.mimeType || null,
      fileSize: item.fileSize || null,
    });
  }

  return insertedItems;
}

async function deleteReviewMediaByReviewIds(reviewIds, prismaOverride = null) {
  const normalizedIds = Array.isArray(reviewIds)
    ? reviewIds.map((id) => String(id || '').trim()).filter(Boolean)
    : [];

  if (normalizedIds.length === 0) {
    return;
  }

  const prisma = prismaOverride || (await getSharedPrismaClientAsync());
  await ensureReviewMediaTable(prisma);

  for (const reviewId of normalizedIds) {
    const mediaItems = await getReviewMedia(reviewId, prisma);
    mediaItems.forEach((item) => removeLocalFileIfExists(item.url));
    await prisma.$executeRaw`
      DELETE FROM product_review_media
      WHERE review_id = ${reviewId}
    `;
  }
}

module.exports = {
  deleteReviewMediaByReviewIds,
  ensureReviewMediaTable,
  getReviewMedia,
  getReviewMediaMap,
  saveReviewMedia,
};
