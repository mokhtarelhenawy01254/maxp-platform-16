// AI Video Studio — display presets (workflows, camera motions, helpers)
import type { VideoModel } from "./types";

export const WORKFLOWS = [
  {
    id: "TEXT_TO_VIDEO" as const,
    label: "نص إلى فيديو",
    hint: "اكتب وصف المشهد واترجم فيديو",
    needsReferences: false,
  },
  {
    id: "IMAGE_TO_VIDEO" as const,
    label: "صورة إلى فيديو",
    hint: "حرّك صورة منتج أو فريم بادئ",
    needsReferences: true,
  },
  {
    id: "MOTION_TRANSFER" as const,
    label: "نقل حركة (Genjutsu)",
    hint: "انقل حركة فيديو مرجعي لشخصيتك أو منتجك",
    needsReferences: true,
  },
];

export const CAMERA_MOTIONS = [
  { id: "", label: "بدون حركة كاميرا" },
  { id: "slow_push_in", label: "زووم بطيء للداخل" },
  { id: "slow_pull_back", label: "تراجع للخلف" },
  { id: "orbit_left", label: "دوران يسار" },
  { id: "orbit_right", label: "دوران يمين" },
  { id: "pan_left", label: "بان يسار" },
  { id: "pan_right", label: "بان يمين" },
  { id: "crane_up", label: "ارتفاع كرين" },
  { id: "crane_down", label: "هبوط كرين" },
  { id: "crash_zoom", label: "زووم سريع" },
  { id: "handheld", label: "كاميرا يد" },
  { id: "bullet_time", label: "Bullet Time" },
];

export const ASPECT_RATIOS = ["9:16", "16:9", "1:1"];

export const DEFAULT_VIDEO_MODEL = "kling-4.0";
export const STORY_RECOMMENDED_MODELS = ["kling-4.0", "wan-3.0", "wan-2.7"];

export function modelPriceLabel(model: VideoModel): string {
  if (model.kind === "video" && model.priceUsdPerSecond) {
    return `$${model.priceUsdPerSecond.toFixed(3)}/ث`;
  }
  if (model.priceUsdPerImage) return `$${model.priceUsdPerImage.toFixed(3)}/صورة`;
  return "";
}

export function formatEgp(n: number | null | undefined): string {
  const num = Number(n ?? 0);
  return `${num.toLocaleString("en-US", { maximumFractionDigits: 2 })} ج.م`;
}

export function computeEstimateEgp(
  model: VideoModel | undefined,
  durationSeconds: number,
  config: { usdToEgp: number; markupPercent: number; minChargeEgp: number } | undefined,
): number {
  if (!model || !config) return 0;
  const usd =
    model.kind === "video"
      ? (model.priceUsdPerSecond ?? 0) * Math.max(1, durationSeconds)
      : model.priceUsdPerImage ?? 0;
  const egp = usd * config.usdToEgp * (1 + config.markupPercent / 100);
  return Math.max(config.minChargeEgp, Math.round(egp * 100) / 100);
}

export function statusLabel(status: string): string {
  switch (status) {
    case "QUEUED": return "في الانتظار";
    case "PROCESSING": return "قيد التنفيذ";
    case "COMPLETED": return "مكتمل";
    case "FAILED": return "فشل";
    case "CANCELLED": return "ملغي";
    case "RENDERING": return "يترندر";
    case "PENDING": return "لاحقًا";
    case "DRAFT": return "مسودة";
    default: return status;
  }
}

export function typeLabel(type: string): string {
  switch (type) {
    case "TEXT_TO_VIDEO": return "نص إلى فيديو";
    case "IMAGE_TO_VIDEO": return "صورة إلى فيديو";
    case "MOTION_TRANSFER": return "نقل حركة";
    case "CHARACTER_SHEET": return "شيت شخصية";
    case "TEXT_TO_IMAGE": return "صورة";
    default: return type;
  }
}

// ---------- Merchant prefs (localStorage, screen-namespaced per isolation rule) ----------
const PREFS_KEY = "video-studio:prefs";
export const STUDIO_PREFS_EVENT = "video-studio:prefs-changed";

export interface StudioPrefs {
  model?: string;
  aspectRatio?: string;
}

export function getStudioPrefs(): StudioPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as StudioPrefs) : {};
  } catch {
    return {};
  }
}

export function saveStudioPrefs(patch: StudioPrefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...getStudioPrefs(), ...patch }));
    window.dispatchEvent(new CustomEvent(STUDIO_PREFS_EVENT));
  } catch {
    /* storage unavailable — prefs stay session-only */
  }
}
