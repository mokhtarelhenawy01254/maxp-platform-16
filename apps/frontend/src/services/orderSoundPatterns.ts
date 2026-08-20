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

// ┘å╪║┘à╪º╪¬ ╪╡┘ê╪¬ ╪º┘ä╪╖┘ä╪¿╪º╪¬ ╪º┘ä┘à┘ê┘ä┘æ╪»╪⌐ ╪¿┘Ç Web Audio (╪º┘ä╪ú┘å┘à╪º╪╖ ╪º┘ä┘é╪»┘è┘à╪⌐)
// ╪º┘ä╪ú┘å┘à╪º╪╖ ╪º┘ä╪¼╪»┘è╪»╪⌐ (╪º┘ä┘â╪º╪┤/╪º┘ä╪╣┘à┘ä╪º╪¬) ╪¿╪¬╪┤╪¬╪║┘ä ┘à┘å ┘à┘ä┘ü╪º╪¬ ╪╡┘ê╪¬ ╪¡┘é┘è┘é┘è╪⌐ ┘ü┘è public/sounds
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

// ┘é╪º╪ª┘à╪⌐ ╪º┘ä┘å╪║┘à╪º╪¬ ╪º┘ä┘à╪╣╪▒┘ê╪╢╪⌐ ┘ü┘è ╪º┘ä╪Ñ╪╣╪»╪º╪»╪º╪¬
export const ORDER_SOUND_PATTERNS: Array<{
  id: OrderSoundPattern;
  label: string;
  description: string;
  audioUrl?: string;
}> = [
  {
    id: "cash",
    label: "┘å╪║┘à╪⌐ ╪º┘ä┘â╪º╪┤",
    description: "┘â╪º╪┤┘è╪▒ ╪º┘ä┘à╪¡╪º┘ü╪╕ ΓÇö ┘â╪º ╪¬╪┤┘è┘å┘é ╪¡┘é┘è┘é┘è╪⌐ ╪¬┘ü╪▒┘æ╪¡",
    audioUrl: "/sounds/register-cha-ching.mp3",
  },
  {
    id: "kaching",
    label: "┘â╪º╪┤ ╪▒┘è╪¼┘è╪│╪¬╪▒",
    description: "╪▒┘å╪⌐ ╪º┘ä┘â╪º╪┤┘è╪▒ ╪º┘ä┘â┘ä╪º╪│┘è┘â┘è╪⌐ ╪º┘ä┘ê╪º╪╢╪¡╪⌐",
    audioUrl: "/sounds/cash-register-kaching.mp3",
  },
  {
    id: "coins",
    label: "╪╣┘à┘ä╪º╪¬",
    description: "╪▒┘å┘è┘å ╪╣┘à┘ä╪º╪¬ ┘à╪╣╪»┘å┘è╪⌐ ┘å╪º╪▓┘ä╪⌐",
    audioUrl: "/sounds/clinking-coins.mp3",
  },
  {
    id: "coinwin",
    label: "┘ü┘ê╪▓ ╪╣┘à┘ä╪º╪¬",
    description: "╪Ñ╪┤╪╣╪º╪▒ ┘ü┘ê╪▓ ╪¿╪╣┘à┘ä╪º╪¬ ┘à╪▒╪¡╪⌐",
    audioUrl: "/sounds/coin-win-notification.mp3",
  },
  {
    id: "magiccoins",
    label: "╪╣┘à┘ä╪º╪¬ ╪│╪¡╪▒┘è╪⌐",
    description: "╪╣┘à┘ä╪º╪¬ ┘à╪¬╪ú┘ä┘é╪⌐ ╪¿╪¡╪│ ╪│╪¡╪▒┘è",
    audioUrl: "/sounds/magical-coin-win.mp3",
  },
  {
    id: "goldcoin",
    label: "╪¼╪º╪ª╪▓╪⌐ ╪░┘ç╪¿┘è╪⌐",
    description: "┘é╪╖╪╣╪⌐ ╪░┘ç╪¿┘è╪⌐ ╪¬┘ü┘ê╪▓ ╪¿╪¼╪º╪ª╪▓╪⌐",
    audioUrl: "/sounds/gold-coin-prize.mp3",
  },
  { id: "alarm", label: "╪╡┘ü┘æ╪º╪▒╪⌐ ╪Ñ┘å╪░╪º╪▒", description: "╪╡┘ü┘æ╪º╪▒╪⌐ ┘é┘ê┘è╪⌐ ┘à╪¬┘é╪╖╪╣╪⌐" },
  { id: "urgent", label: "╪╣╪º╪¼┘ä", description: "╪╡┘ü┘æ┘é╪º╪¬ ╪│╪▒┘è╪╣╪⌐ ┘à╪¬╪¬╪º┘ä┘è╪⌐" },
  { id: "classic", label: "┘â┘ä╪º╪│┘è┘â┘è", description: "╪¼╪▒╪│ ╪»┘è┘å╪¼ ╪»┘ê┘å╪¼" },
  { id: "digital", label: "╪▒┘é┘à┘è", description: "┘å╪║┘à╪⌐ ╪▒┘å┘è┘å ╪▒┘é┘à┘è╪⌐ ╪╡╪º╪╣╪»╪⌐" },
  { id: "smooth", label: "┘å╪º╪╣┘à", description: "┘å╪║┘à╪⌐ ┘à╪▒┘è╪¡╪⌐ ┘ç╪º╪»╪ª╪⌐" },
];

// ╪Ñ╪▒╪¼╪º╪╣ ╪▒╪º╪¿╪╖ ┘à┘ä┘ü ╪º┘ä╪╡┘ê╪¬ ┘ä┘ä┘å╪║┘à╪º╪¬ ╪º┘ä┘à╪¿┘å┘è╪⌐ ╪╣┘ä┘ë ┘à┘ä┘ü╪º╪¬ ╪¡┘é┘è┘é┘è╪⌐
export const getOrderSoundAudioUrl = (
  pattern: OrderSoundPattern,
): string | null => {
  const entry = ORDER_SOUND_PATTERNS.find((item) => item.id === pattern);
  return entry?.audioUrl ?? null;
};

// ╪¬┘ê┘ä┘è╪» ┘å┘ê╪¬╪º╪¬ ╪º┘ä┘å╪║┘à╪⌐ ╪º┘ä┘à┘ê┘ä┘æ╪»╪⌐ ╪¡╪¬┘ë ┘å┘ç╪º┘è╪⌐ ╪º┘ä┘à╪»╪⌐
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
