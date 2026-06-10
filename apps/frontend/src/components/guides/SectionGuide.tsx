import { useState } from "react";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
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
import { findGuideForPath } from "@/config/sectionGuideRegistry";

export function SectionGuide() {
  const { t } = useTranslation();
  const location = useLocation();
  const guide = findGuideForPath(location.pathname);
  const [open, setOpen] = useState(false);

  if (!guide) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className="business-icon-button"
        title={t("guides.help")}
        onClick={() => setOpen(true)}
      >
        <QuestionMarkCircleIcon className="h-5 w-5" />
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(guide.titleKey)}</DialogTitle>
          <DialogDescription>{t(guide.descriptionKey)}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <ol className="space-y-4 p-1">
            {guide.stepKeys.map((key, i) => (
              <li key={key} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  {i + 1}
                </span>
                <p className="text-sm text-muted-foreground">{t(key)}</p>
              </li>
            ))}
          </ol>
          {guide.videoUrl && (
            <div className="mt-6">
              <video
                src={guide.videoUrl}
                controls
                className="w-full rounded-lg border"
              >
                {t("guides.videoNotSupported")}
              </video>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
