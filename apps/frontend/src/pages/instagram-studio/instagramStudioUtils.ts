/**
 * أدوات مشتركة داخل مجلد Instagram Studio فقط (ليست مكونات عامة).
 */

export const formatIgDate = (value?: string | null): string => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ar-EG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatIgNumber = (value?: number | null): string =>
  typeof value === "number" ? value.toLocaleString("ar-EG") : "0";

const MEDIA_TYPE_LABELS: Record<string, string> = {
  IMAGE: "صورة",
  VIDEO: "فيديو",
  CAROUSEL_ALBUM: "ألبوم",
  REELS: "ريلز",
};

export const getMediaTypeLabel = (type?: string | null): string =>
  (type && MEDIA_TYPE_LABELS[type]) || "منشور";

export const getMediaThumbnail = (media: {
  thumbnail_url?: string | null;
  media_url?: string | null;
}): string | null => media.thumbnail_url || media.media_url || null;

export const CAPTION_LIMIT = 2200;
