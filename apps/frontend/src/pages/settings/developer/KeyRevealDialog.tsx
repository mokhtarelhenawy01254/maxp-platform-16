import React from "react";
import { useTranslation } from "react-i18next";
import { CheckIcon, ClipboardDocumentIcon } from "@heroicons/react/24/outline";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getDirection } from "../../../i18n";
import { getDevStrings } from "./devI18n";
import { copyText } from "./devApi";

interface KeyRevealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rawKey: string;
  title?: string;
  note?: string;
}

/**
 * Show-once dialog for freshly created credentials. The raw key never lives
 * anywhere else in the UI.
 */
const KeyRevealDialog: React.FC<KeyRevealDialogProps> = ({
  open,
  onOpenChange,
  rawKey,
  title,
  note,
}) => {
  const { i18n } = useTranslation();
  const s = getDevStrings(i18n.language);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    const done = await copyText(rawKey);
    setCopied(done);
    if (done) toast.success(s.common.copied);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={getDirection()} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title || s.keys.showOnceTitle}</DialogTitle>
          <DialogDescription>{note || s.keys.showOnceNote}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Input readOnly value={rawKey} className="font-mono text-xs" dir="ltr" />
            <Button type="button" variant={copied ? "secondary" : "default"} size="sm" onClick={handleCopy}>
              {copied ? (
                <CheckIcon className="h-4 w-4" />
              ) : (
                <ClipboardDocumentIcon className="h-4 w-4" />
              )}
              <span className="ms-1">{copied ? s.common.copied : s.common.copy}</span>
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {s.common.close}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default KeyRevealDialog;
