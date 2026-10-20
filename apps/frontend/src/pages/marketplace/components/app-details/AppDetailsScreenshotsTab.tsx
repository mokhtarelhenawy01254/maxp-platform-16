import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface AppDetailsScreenshotsTabProps {
  screenshots: string[];
  screenshotIndex: number;
  onSelectIndex: (index: number) => void;
}

export const AppDetailsScreenshotsTab: React.FC<AppDetailsScreenshotsTabProps> = ({
  screenshots,
  screenshotIndex,
  onSelectIndex,
}) => {
  const { t } = useTranslation();

  if (screenshots.length === 0) return null;

  return (
    <div className="rounded-2xl border bg-card p-5">
      <h2 className="text-xl font-extrabold text-foreground mb-4 text-right">
        {t("marketplace.screenshots")}
      </h2>
      <div className="relative">
        <div className="rounded-xl overflow-hidden bg-muted/30">
          <img
            src={screenshots[screenshotIndex]}
            alt={`Screenshot ${screenshotIndex + 1}`}
            className="w-full object-cover max-h-[500px]"
          />
        </div>
        {screenshots.length > 1 && (
          <>
            <button
              onClick={() =>
                onSelectIndex(
                  (screenshotIndex - 1 + screenshots.length) % screenshots.length
                )
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-background/80 backdrop-blur border shadow-sm hover:bg-background transition-all"
              aria-label="السابق"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() =>
                onSelectIndex((screenshotIndex + 1) % screenshots.length)
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-full bg-background/80 backdrop-blur border shadow-sm hover:bg-background transition-all"
              aria-label="التالي"
            >
              <ChevronRight size={16} />
            </button>
            <div className="flex justify-center gap-1.5 mt-4">
              {screenshots.map((_, i) => (
                <button
                  key={i}
                  onClick={() => onSelectIndex(i)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all",
                    i === screenshotIndex
                      ? "bg-primary w-5"
                      : "bg-muted-foreground/30"
                  )}
                  aria-label={`شريحة ${i + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
