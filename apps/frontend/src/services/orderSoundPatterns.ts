export type OrderSoundPattern =
  | "alarm"
  | "urgent"
  | "classic"
  | "digital"
  | "smooth"
  | "cash"
  | "kaching"
  | "coins"
  | "coinwin"
  | "magiccoins"
  | "goldcoin";

interface OrderSoundPatternNote {
  freq: number;
  duration: number;
  gap: number;
}

export interface OrderSoundEvent {
  freq: number;
  start: number;
  duration: number;
  waveform: OscillatorType;
}

// نغمات صوت الطلبات المولّدة بـ Web Audio (الأنماط القديمة)
// الأنماط الجديدة (الكاش/العملات) بتشتغل من ملفات صوت حقيقية في public/sounds
const ORDER_SOUND_PATTERN_NOTES: Record<
  OrderSoundPattern,
  OrderSoundPatternNote[]
> = {
  alarm: [
    { freq: 1150, duration: 0.19, gap: 0.16 },
    { freq: 800, duration: 0.19, gap: 0.16 },
  ],
  urgent: [
    { freq: 1200, duration: 0.08, gap: 0.04 },
    { freq: 1200, duration: 0.08, gap: 0.04 },
    { freq: 1200, duration: 0.08, gap: 0.16 },
  ],
  classic: [
    { freq: 880, duration: 0.35, gap: 0.05 },
    { freq: 660, duration: 0.45, gap: 0.1 },
  ],
  digital: [
    { freq: 660, duration: 0.09, gap: 0.01 },
    { freq: 880, duration: 0.09, gap: 0.01 },
    { freq: 1100, duration: 0.09, gap: 0.01 },
    { freq: 1320, duration: 0.12, gap: 0.08 },
  ],
  smooth: [
    { freq: 523.25, duration: 0.2, gap: 0.05 },
    { freq: 659.25, duration: 0.2, gap: 0.05 },
    { freq: 783.99, duration: 0.2, gap: 0.05 },
    { freq: 1046.5, duration: 0.35, gap: 0.15 },
  ],
  cash: [],
  kaching: [],
  coins: [],
  coinwin: [],
  magiccoins: [],
  goldcoin: [],
};

// قائمة النغمات المعروضة في الإعدادات
export const ORDER_SOUND_PATTERNS: Array<{
  id: OrderSoundPattern;
  label: string;
  description: string;
  audioUrl?: string;
}> = [
  {
    id: "cash",
    label: "نغمة الكاش",
    description: "كاشير المحافظ — كا تشينق حقيقية تفرّح",
    audioUrl: "/sounds/register-cha-ching.mp3",
  },
  {
    id: "kaching",
    label: "كاش ريجيستر",
    description: "رنة الكاشير الكلاسيكية الواضحة",
    audioUrl: "/sounds/cash-register-kaching.mp3",
  },
  {
    id: "coins",
    label: "عملات",
    description: "رنين عملات معدنية نازلة",
    audioUrl: "/sounds/clinking-coins.mp3",
  },
  {
    id: "coinwin",
    label: "فوز عملات",
    description: "إشعار فوز بعملات مرحة",
    audioUrl: "/sounds/coin-win-notification.mp3",
  },
  {
    id: "magiccoins",
    label: "عملات سحرية",
    description: "عملات متألقة بحس سحري",
    audioUrl: "/sounds/magical-coin-win.mp3",
  },
  {
    id: "goldcoin",
    label: "جائزة ذهبية",
    description: "قطعة ذهبية تفوز بجائزة",
    audioUrl: "/sounds/gold-coin-prize.mp3",
  },
  { id: "alarm", label: "صفّارة إنذار", description: "صفّارة قوية متقطعة" },
  { id: "urgent", label: "عاجل", description: "صفّقات سريعة متتالية" },
  { id: "classic", label: "كلاسيكي", description: "جرس دينج دونج" },
  { id: "digital", label: "رقمي", description: "نغمة رنين رقمية صاعدة" },
  { id: "smooth", label: "ناعم", description: "نغمة مريحة هادئة" },
];

// إرجاع رابط ملف الصوت للنغمات المبنية على ملفات حقيقية
export const getOrderSoundAudioUrl = (
  pattern: OrderSoundPattern,
): string | null => {
  const entry = ORDER_SOUND_PATTERNS.find((item) => item.id === pattern);
  return entry?.audioUrl ?? null;
};

// توليد نوتات النغمة المولّدة حتى نهاية المدة
export const buildPatternEvents = (
  pattern: OrderSoundPattern,
  startTime: number,
  durationSeconds: number,
): OrderSoundEvent[] => {
  const seq =
    ORDER_SOUND_PATTERN_NOTES[pattern] || ORDER_SOUND_PATTERN_NOTES.alarm;
  const defaultWaveform: OscillatorType =
    pattern === "smooth"
      ? "sine"
      : pattern === "classic"
        ? "triangle"
        : "square";

  const events: OrderSoundEvent[] = [];

  const end = startTime + durationSeconds;
  let cursor = startTime;

  while (cursor < end) {
    for (const note of seq) {
      const start = cursor;
      if (start >= end) {
        break;
      }
      events.push({
        freq: note.freq,
        start,
        duration: Math.min(note.duration, end - start),
        waveform: defaultWaveform,
      });
      cursor += note.duration + note.gap;
    }
  }

  return events;
};
