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

export interface TitleMatchRange {
  start: number;
  end: number;
}

/**
 * يحدد موضع أول تطابق للنص المُبحث عنه داخل العنوان الأصلي — رغم أن
 * normalizeArabic بيحذف حروف (تشكيل/تطويل) فطول النص بيتغير؛ هنا بنبني
 * خريطة من فهرس النص المُوحَّد لفهرس العنوان الأصلي عشان الـ highlight
 * يقص من النص الحقيقي مش المتحول. نفس تحويلات normalizeArabic بالظبط.
 */
export const locateTitleMatch = (title: string, needle: string): TitleMatchRange | null => {
  if (!needle) return null;

  const lower = title.toLowerCase();
  const kept: number[] = [];
  let mapped = "";
  for (let i = 0; i < lower.length; i++) {
    const ch = lower[i];
    if (/[\u064B-\u0652\u0670\u0640\u200e\u200f]/.test(ch)) continue;
    mapped += /[أإآٱ]/.test(ch)
      ? "ا"
      : ch === "ى"
        ? "ي"
        : ch === "ة"
          ? "ه"
          : /[ؤئ]/.test(ch)
            ? "ء"
            : ch;
    kept.push(i);
  }

  /* طي المسافات المتتالية + القص من الطرفين — مع الاحتفاظ بأول فهرس أصلي */
  let text = "";
  const map: number[] = [];
  let spacePending = false;
  let spaceAt = -1;
  for (let j = 0; j < mapped.length; j++) {
    if (/\s/.test(mapped[j])) {
      if (!spacePending) {
        spacePending = true;
        spaceAt = kept[j];
      }
      continue;
    }
    if (text.length > 0 && spacePending) {
      text += " ";
      map.push(spaceAt);
    }
    spacePending = false;
    text += mapped[j];
    map.push(kept[j]);
  }

  const at = text.indexOf(needle);
  if (at < 0) return null;
  const start = map[at];
  const end = map[Math.min(at + needle.length - 1, map.length - 1)] + 1;
  if (typeof start !== "number" || !Number.isFinite(end)) return null;
  return { start, end };
};
