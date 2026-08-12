export type OrderSoundPattern =
  | "alarm"
  | "urgent"
  | "classic"
  | "digital"
  | "smooth";

interface OrderSoundPatternNote {
  freq: number;
  duration: number;
  gap: number;
}

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
};

// قائمة النغمات المعروضة في الإعدادات
export const ORDER_SOUND_PATTERNS: Array<{
  id: OrderSoundPattern;
  label: string;
  description: string;
}> = [
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
): Array<{
  freq: number;
  start: number;
  duration: number;
  waveform: OscillatorType;
}> => {
  const seq =
    ORDER_SOUND_PATTERN_NOTES[pattern] || ORDER_SOUND_PATTERN_NOTES.alarm;
  const waveform: OscillatorType =
    pattern === "smooth"
      ? "sine"
      : pattern === "classic"
        ? "triangle"
        : "square";

  const events: Array<{
    freq: number;
    start: number;
    duration: number;
    waveform: OscillatorType;
  }> = [];

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
        waveform,
      });
      cursor += note.duration + note.gap;
    }
  }

  return events;
};
