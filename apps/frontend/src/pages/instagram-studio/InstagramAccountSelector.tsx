import React from "react";
import { Instagram } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import type { InstagramTarget } from "./instagramStudioService";

interface InstagramAccountSelectorProps {
  targets: InstagramTarget[];
  value: string;
  onChange: (igId: string) => void;
  disabled?: boolean;
}

const InstagramAccountSelector: React.FC<InstagramAccountSelectorProps> = ({
  targets,
  value,
  onChange,
  disabled,
}) => {
  const selected = targets.find((target) => target.igId === value) || null;

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[11px] font-medium text-muted-foreground">
        حساب Instagram
      </span>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          data-testid="instagram-account-selector"
          className="h-9 w-full max-w-[320px] text-xs border-border/70 bg-card gap-1.5"
        >
          <Instagram className="h-3.5 w-3.5 text-pink-600 shrink-0" />
          <SelectValue placeholder="اختر حساب Instagram" />
        </SelectTrigger>
        <SelectContent>
          {targets.map((target) => (
            <SelectItem key={target.igId} value={target.igId} className="text-xs">
              <span className="flex items-center gap-1.5">
                <span className="font-medium tabular-nums" dir="ltr">
                  {target.igUsername ? `@${target.igUsername}` : target.igId}
                </span>
                <span className="text-muted-foreground">— {target.pageName}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected && (
        <span className="text-[11px] text-muted-foreground truncate">
          صفحة Facebook: {selected.pageName}
        </span>
      )}
    </div>
  );
};

export default InstagramAccountSelector;
