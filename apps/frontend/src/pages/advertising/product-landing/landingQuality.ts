import type { EditorState } from "./types";

export type LandingQualitySeverity = "critical" | "warning";

export interface LandingQualityIssue {
  id: string;
  severity: LandingQualitySeverity;
  label: string;
}

const STOCK_VIDEO_DOMAIN_PATTERN =
  /(mixkit|pexels|unsplash|coverr|videvo|pixabay|storyblocks)\./i;

/**
 * Live quality report for the landing editor — same critical rules the
 * backend enforces on publish (identical before/after, stock videos) plus
 * advisory warnings (empty SEO, media without images). Critical issues
 * block publishing from the UI; the backend remains the source of truth.
 */
export const getLandingQualityIssues = (
  editor: EditorState,
): LandingQualityIssue[] => {
  const issues: LandingQualityIssue[] = [];
  const sections = Array.isArray(editor.sections) ? editor.sections : [];

  for (const section of sections) {
    if (!section?.enabled) continue;
    const content = (section.content || {}) as Record<string, unknown>;

    if (section.type === "BEFORE_AFTER") {
      const before = typeof content.beforeImage === "string" ? content.beforeImage.trim() : "";
      const after = typeof content.afterImage === "string" ? content.afterImage.trim() : "";
      if (before && after && before === after) {
        issues.push({
          id: `before-after-same:${section.id}`,
          severity: "critical",
          label: 'قسم "قبل وبعد" بنفس الصورة في الجهتين — ارفع صورتين مختلفتين',
        });
      }
    }

    if (section.type === "VIDEO_REEL") {
      const videoUrl = typeof content.videoUrl === "string" ? content.videoUrl.trim() : "";
      if (videoUrl && STOCK_VIDEO_DOMAIN_PATTERN.test(videoUrl)) {
        issues.push({
          id: `stock-video:${section.id}`,
          severity: "critical",
          label: "فيديو القسم من مكتبة جاهزة (stock) — ارفع فيديو حقيقي للمنتج",
        });
      }
    }

    if (section.type === "MEDIA") {
      const images = Array.isArray(content.images) ? content.images : [];
      if (images.length === 0 && !content.mainImage) {
        issues.push({
          id: `media-empty:${section.id}`,
          severity: "warning",
          label: "قسم صور فاضي — الصفحة بتتحسن جدًا بصور منتج حقيقية",
        });
      }
    }
  }

  if (!editor.seo?.title?.trim() || !editor.seo?.description?.trim()) {
    issues.push({
      id: "seo-empty",
      severity: "warning",
      label: "عنوان/وصف المشاركة (SEO) فاضي — اللينك هيظهر عام في واتساب وفيسبوك",
    });
  }

  return issues;
};

export const hasCriticalLandingIssues = (issues: LandingQualityIssue[]): boolean =>
  issues.some((issue) => issue.severity === "critical");
