import React, { useEffect, useMemo, useRef, useState } from "react";
import { PLATFORM_LANDING_VARIANTS } from "./platformLandingRegistry";

/**
 * أداة مقارنة داخلية (لا تُربط من أي مكان عام):
 * /preview/landing-compare — النسختين في شاشة واحدة.
 * ديسكتوب: جنب بعض بعرض 1440 مقلَّص للملاءمة. موبايل: تبديل بين النسختين بعرض 390.
 */

type CompareMode = "desktop" | "mobile";

const FRAME_WIDTH: Record<CompareMode, number> = { desktop: 1440, mobile: 390 };
const FRAME_HEIGHT: Record<CompareMode, number> = { desktop: 2400, mobile: 2400 };

const VARIANTS = [
  { id: "enterprise-os", label: "الحالية — Enterprise OS" },
  { id: "merchant-daylight", label: "نسخة التاجر النهارية" },
  { id: "merchant-dossier", label: "نسخة الملف — tasteskill v2" },
  { id: "merchant-performs", label: "نسخة الشاشة الشغّالة" },
  { id: "merchant-annual", label: "تقرير التاجر المطبوع" },
  { id: "merchant-poster", label: "بوستر الشارع" },
] as const;

const useScale = (frameWidth: number, paneWidth: number) =>
  useMemo(() => (paneWidth > 0 ? Math.min(1, paneWidth / frameWidth) : 1), [frameWidth, paneWidth]);

const ComparePane: React.FC<{
  variantId: string;
  label: string;
  mode: CompareMode;
  reloadKey: number;
}> = ({ variantId, label, mode, reloadKey }) => {
  const paneRef = useRef<HTMLDivElement | null>(null);
  const [paneWidth, setPaneWidth] = useState(0);

  useEffect(() => {
    const element = paneRef.current;
    if (!element || typeof ResizeObserver === "undefined") {
      setPaneWidth(element?.clientWidth || 0);
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width || 0;
      setPaneWidth(width);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scale = useScale(FRAME_WIDTH[mode], paneWidth - 2);
  const frameHeight = Math.min(FRAME_HEIGHT[mode] * scale, 760);

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-slate-900">{label}</p>
          <p className="truncate text-[11px] text-slate-500">/preview/platform-home/{variantId}</p>
        </div>
        <a
          href={`/preview/platform-home/${variantId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-none rounded-lg border border-slate-200 px-2.5 py-1.5 text-[12px] font-semibold text-slate-700 no-underline hover:bg-slate-50"
        >
          افتح كامل
        </a>
      </header>

      <div
        ref={paneRef}
        className="relative overflow-hidden bg-slate-50"
        style={{ height: `${frameHeight}px` }}
      >
        <iframe
          key={`${variantId}-${mode}-${reloadKey}`}
          title={label}
          src={`/preview/platform-home/${variantId}`}
          loading="eager"
          style={{
            width: `${FRAME_WIDTH[mode]}px`,
            height: `${FRAME_HEIGHT[mode]}px`,
            border: "0",
            transform: `scale(${scale})`,
            transformOrigin: "top right",
            position: "absolute",
            top: 0,
            right: 0,
          }}
        />
      </div>
    </section>
  );
};

const PlatformLandingComparePage: React.FC = () => {
  const [mode, setMode] = useState<CompareMode>("desktop");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    document.title = "مقارنة نسخ اللاند | Max P";
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 p-3" dir="rtl">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <div className="min-w-0">
            <h1 className="text-[15px] font-bold text-slate-900">مقارنة نسخ الصفحة الرئيسية</h1>
            <p className="text-[11.5px] text-slate-500">
              {PLATFORM_LANDING_VARIANTS.length} نسخ مسجّلة — النسخة الشغّالة حاليًا على الجمهور هي
              Enterprise OS
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(
                [
                  { id: "desktop", label: "ديسكتوب 1440" },
                  { id: "mobile", label: "موبايل 390" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={mode === option.id}
                  onClick={() => setMode(option.id)}
                  className={`rounded-md px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    mode === option.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              إعادة تحميل
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row">
          {VARIANTS.map((variant) => (
            <ComparePane
              key={variant.id}
              variantId={variant.id}
              label={variant.label}
              mode={mode}
              reloadKey={reloadKey}
            />
          ))}
        </div>

        <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11.5px] text-slate-500">
          الصفحة دي للتجربة الداخلية فقط. تفعيل أي نسخة للجمهور بيتم من إعدادات السوبر أدمن —
          من غير أي تعديل كود.
        </p>
      </div>
    </div>
  );
};

export default PlatformLandingComparePage;
