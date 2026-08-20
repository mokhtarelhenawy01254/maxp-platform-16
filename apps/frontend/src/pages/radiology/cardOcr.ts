import { createWorker } from "tesseract.js";

const OCR_BASE = `${import.meta.env.BASE_URL || "/"}tesseract/`;

let workerPromise: Promise<Awaited<ReturnType<typeof createWorker>> | null> | null = null;

async function getWorker() {
  if (!workerPromise) {
    workerPromise = (async () => {
      try {
        const w = await createWorker("eng", 1, {
          workerPath: `${OCR_BASE}worker.min.js`,
          langPath: OCR_BASE,
          corePath: `${OCR_BASE}tesseract-core.wasm.js`,
        });
        return w;
      } catch (e) {
        console.error("Tesseract init failed:", e);
        return null;
      }
    })();
  }
  return workerPromise;
}

export interface CardOcrResult {
  nationalId?: string;
  confidence: number;
}

const normalizeDigits = (raw: string): string =>
  raw
    .replace(/[┘á-┘⌐]/g, d => String("┘á┘í┘ó┘ú┘ñ┘Ñ┘ª┘º┘¿┘⌐".indexOf(d)))
    .replace(/[█░-█╣]/g, d => String("█░█▒█▓█│█┤█╡█╢█╖█╕█╣".indexOf(d)))
    .replace(/\D/g, "");

const findNationalId = (text: string): string | null => {
  const digits = normalizeDigits(text);
  if (!digits) return null;
  const match = digits.match(/\d{14}/);
  return match ? match[0] : null;
};

export async function extractNationalIdFromImage(image: File | Blob): Promise<CardOcrResult> {
  const worker = await getWorker();
  if (!worker) return { confidence: 0 };
  try {
    await worker.setParameters({ tessedit_char_whitelist: "0123456789 " });
    const { data } = await worker.recognize(image);
    const nationalId = findNationalId(data.text || "");
    return { nationalId: nationalId || undefined, confidence: data.confidence || 0 };
  } catch (e) {
    console.error("OCR failed:", e);
    return { confidence: 0 };
  }
}
