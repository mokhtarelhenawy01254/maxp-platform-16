import { useState, useMemo } from "react";
import { HelpCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  defaultSectionGuide,
  findGuideForPath,
} from "@/config/sectionGuideRegistry";

export function SectionGuide() {
  const { t } = useTranslation();
  const location = useLocation();
  const guide = useMemo(
    () => findGuideForPath(location.pathname) ?? defaultSectionGuide,
    [location.pathname],
  );
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-lg border border-border/70 bg-card text-muted-foreground hover:text-foreground hover:bg-muted active:scale-95 transition-all shadow-2xs"
        aria-label={t("guides.help")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <HelpCircle className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg bg-card border border-border/80 rounded-2xl shadow-2xl" closeLabel={t("common.close")} dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base font-bold text-foreground">{t(guide.titleKey)}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">{t(guide.descriptionKey)}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-1">
            <ol className="space-y-3 p-1">
              {guide.stepKeys.map((key, i) => (
                <li key={key} className="flex gap-2.5 items-start">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-xs font-mono font-bold text-primary tabular-nums mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1">{t(key)}</p>
                </li>
              ))}
            </ol>
            {guide.videoUrl && (
              <div className="mt-4">
                <video
                  src={guide.videoUrl}
                  controls
                  className="w-full rounded-xl border border-border/70 bg-black shadow-sm"
                >
                  {t("guides.videoNotSupported")}
                </video>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
