import type { AppExplanation } from "./groups";

/**
 * فهرس بحث نصّي بسيط للشروحات.
 *
 * سبب الوجود: البحث القديم كان بيعمل `content.includes(needle)` على HTML خام،
 * فكلمة زي "class" كانت بترجّع شروحات ملهاش علاقة. هنا بنجرّد الوسوم مرة واحدة
 * (لا على كل ضغطة زرار) وبنوحّد الحروف العربية قبل المطابقة.
 */
export interface SearchEntry {
  title: string;
  body: string;
}

const TAG_RE = /<[^>]*>/g;
const BLOCK_TAG_RE = /<\/(p|div|li|h[1-6]|tr|blockquote)>/gi;
const ENTITY_RE = /&(nbsp|amp|quot|lt|gt|rsquo|lsquo|hellip|#\d+);/gi;

/** يحوّل HTML الشرح لنص عادي للمطابقة فقط (العرض بيفضل HTML بعد التنقية) */
export const stripHtml = (html: string): string =>
  html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(BLOCK_TAG_RE, " ")
    .replace(TAG_RE, " ")
    .replace(ENTITY_RE, " ");

/** توحيد الحروف: تشكيل، تطويل، همزات، تاء مربوطة، ألف مقصورة */
export const normalizeArabic = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0670\u0640\u200e\u200f]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ؤئ]/g, "ء")
    .replace(/\s+/g, " ")
    .trim();

/** فهرس جاهز للبحث — يُبنى مرة عند تحميل الشروحات */
export const buildSearchIndex = (items: AppExplanation[]): Map<string, SearchEntry> => {
  const index = new Map<string, SearchEntry>();
  for (const item of items) {
    index.set(item.id, {
      title: normalizeArabic(item.title),
      body: normalizeArabic(stripHtml(item.content || "")),
    });
  }
  return index;
};

export const matchesQuery = (entry: SearchEntry | undefined, needle: string): boolean => {
  if (!needle) return true;
  if (!entry) return false;
  return entry.title.includes(needle) || entry.body.includes(needle);
};
