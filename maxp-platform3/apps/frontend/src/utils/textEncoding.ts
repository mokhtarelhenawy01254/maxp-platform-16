const CP1252_REVERSE_MAP = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

const MOJIBAKE_PATTERN =
  /(?:Ã.|Â.|â€|â€™|â€œ|â€¢|Ëœ|™|œ|ž|�|[ØÙÐÑ][^\s])/;
const utf8Decoder = new TextDecoder("utf-8", { fatal: false });

const decodeCp1252Utf8 = (value: string): string | null => {
  const bytes: number[] = [];

  for (const character of value) {
    const codePoint = character.codePointAt(0);

    if (codePoint == null) {
      return null;
    }

    if (CP1252_REVERSE_MAP.has(codePoint)) {
      bytes.push(CP1252_REVERSE_MAP.get(codePoint)!);
      continue;
    }

    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }

    return null;
  }

  return utf8Decoder.decode(new Uint8Array(bytes));
};

export const looksLikeMojibake = (value: unknown): value is string =>
  typeof value === "string" && MOJIBAKE_PATTERN.test(value);

export const repairMojibakeText = (value: unknown, fallback = ""): string => {
  if (typeof value !== "string") {
    return fallback;
  }

  let normalized = value;

  for (let index = 0; index < 5; index += 1) {
    if (!looksLikeMojibake(normalized)) {
      break;
    }

    const decoded = decodeCp1252Utf8(normalized);

    if (!decoded || decoded === normalized) {
      break;
    }

    if (decoded.includes("\ufffd") && !normalized.includes("\ufffd")) {
      break;
    }

    normalized = decoded;
  }

  return normalized;
};
