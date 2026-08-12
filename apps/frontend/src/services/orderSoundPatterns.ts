export type OrderSoundPattern =
  | "alarm"
  | "urgent"
  | "classic"
  | "digital"
  | "smooth"
  | "cash"
  | "coins"
  | "happy";

interface OrderSoundHarmonic {
  ratio: number;
  gain: number;
}

interface OrderSoundPatternNote {
  freq: number;
  duration: number;
  gap: number;
  waveform?: OscillatorType;
  harmonics?: OrderSoundHarmonic[];
}

export interface OrderSoundEvent {
  freq: number;
  start: number;
  duration: number;
  waveform: OscillatorType;
  harmonics?: OrderSoundHarmonic[];
}

// البارتيلات المعدنية لنغمة الكاش — بتدّي الطابع المعدني اللامع
// لجرس الكاشير ورنين العملات بدل الصفّارة الحادة
const CASH_BELL_HARMONICS: OrderSoundHarmonic[] = [
  { ratio: 2.0, gain: 0.55 },
  { ratio: 2.98, gain: 0.3 },
  { ratio: 4.32, gain: 0.14 },
];

// نغمات صوت الطلبات — كل نغمة بتكوين نوتات مختلف
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
  // "كا-تشينق" لامعة صاعدة زي نغمة الكاشير بتاعة المحافظ المصرية
  // (فودافون كاش / إنستاباي / أورنج كاش)
  cash: [
    {
      freq: 1046.5,
      duration: 0.12,
      gap: 0.03,
      waveform: "triangle",
      harmonics: CASH_BELL_HARMONICS,
    },
    {
      freq: 1567.98,
      duration: 0.18,
      gap: 0.04,
      waveform: "triangle",
      harmonics: CASH_BELL_HARMONICS,
    },
    {
      freq: 2093,
      duration: 0.24,
      gap: 0.38,
      waveform: "triangle",
      harmonics: CASH_BELL_HARMONICS,
    },
  ],
  // رنين عملات نازلة (فلوس بتقع) — أجراس معدنية صغيرة متساقطة
  coins: [
    {
      freq: 2637,
      duration: 0.09,
      gap: 0.03,
      waveform: "triangle",
      harmonics: CASH_BELL_HARMONICS,
    },
    {
      freq: 2093,
      duration: 0.09,
      gap: 0.03,
      waveform: "triangle",
      harmonics: CASH_BELL_HARMONICS,
    },
    {
      freq: 1661.2,
      duration: 0.09,
      gap: 0.03,
      waveform: "triangle",
      harmonics: CASH_BELL_HARMONICS,
    },
    {
      freq: 1318.5,
      duration: 0.12,
      gap: 0.32,
      waveform: "triangle",
      harmonics: CASH_BELL_HARMONICS,
    },
  ],
  // لحن مبهج صاعد (زي أجراس الريحة الحلوة) — قصير وفرحان
  happy: [
    { freq: 659.25, duration: 0.12, gap: 0.05, waveform: "triangle" },
    { freq: 783.99, duration: 0.12, gap: 0.05, waveform: "triangle" },
    { freq: 1046.5, duration: 0.12, gap: 0.05, waveform: "triangle" },
    { freq: 783.99, duration: 0.12, gap: 0.05, waveform: "triangle" },
    { freq: 1046.5, duration: 0.3, gap: 0.25, waveform: "triangle" },
  ],
};

// قائمة النغمات المعروضة في الإعدادات
export const ORDER_SOUND_PATTERNS: Array<{
  id: OrderSoundPattern;
  label: string;
  description: string;
}> = [
  { id: "cash", label: "نغمة الكاش", description: "كاشير المحافظ — كا تشينق تفرّح" },
  { id: "coins", label: "عملات", description: "رنين عملات نازلة (فلوس)" },
  { id: "happy", label: "مبهج", description: "لحن مرحة صاعد قصير" },
  { id: "alarm", label: "صفّارة إنذار", description: "صفّارة قوية متقطعة" },
  { id: "urgent", label: "عاجل", description: "صفّقات سريعة متتالية" },
  { id: "classic", label: "كلاسيكي", description: "جرس دينج دونج" },
  { id: "digital", label: "رقمي", description: "نغمة رنين رقمية صاعدة" },
  { id: "smooth", label: "ناعم", description: "نغمة مريحة هادئة" },
];

// توليد نوتات النغمة المختارة حتى نهاية المدة
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
        waveform: note.waveform ?? defaultWaveform,
        harmonics: note.harmonics,
      });
      cursor += note.duration + note.gap;
    }
  }

  return events;
};
