import React, { useState, useEffect, useMemo } from "react";
import { UserPlus, Search, Check, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import { AgentDefinition } from "./types";

interface AssignToolModalProps {
  open: boolean;
  toolName: string;
  agents: AgentDefinition[];
  onClose: () => void;
  onSave: (selectedAgentIds: Set<string>) => Promise<void>;
}

export const AssignToolModal: React.FC<AssignToolModalProps> = ({
  open,
  toolName,
  agents,
  onClose,
  onSave,
}) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setSelected(
        new Set(
          agents
            .filter((a) => a.allowedTools?.includes(toolName))
            .map((a) => a.id)
        )
      );
      setSearch("");
      setError(null);
    }
  }, [open, toolName, agents]);

  const filtered = useMemo(() => {
    if (!search.trim()) return agents;
    const q = search.toLowerCase();
    return agents.filter((a) =>
      [a.name, a.role, a.id].some((v) => String(v).toLowerCase().includes(q))
    );
  }, [agents, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((a) => a.id)));
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(selected);
      onClose();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء حفظ تعيينات الأداة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <UserPlus className="size-5 text-primary" />
              <span>تجهيز الأداة للوكلاء</span>
            </div>
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground" dir="ltr">
            {toolName}
          </DialogDescription>
        </DialogHeader>

        {saving && <div className="h-0.5 w-full animate-pulse bg-primary" />}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="relative mb-2">
          <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث في أسماء أو أدوار الوكلاء..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-8 text-xs h-8"
          />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            تم تحديد {selected.size} من إجمالي {filtered.length} وكيل
          </span>
          <Button
            size="sm"
            variant="link"
            onClick={toggleAll}
            className="text-xs h-auto p-0 text-primary cursor-pointer"
          >
            {selected.size === filtered.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
          </Button>
        </div>

        <div className="max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
          {filtered.map((agent) => {
            const checked = selected.has(agent.id);
            const already = agent.allowedTools?.includes(toolName);

            return (
              <div
                key={agent.id}
                onClick={() => toggle(agent.id)}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition-all text-xs",
                  checked
                    ? "border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10"
                    : "border-border hover:bg-muted/40"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                      checked
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-muted-foreground/50"
                    )}
                  >
                    {checked && <Check className="size-3" />}
                  </div>
                  <div className="size-6 rounded-full bg-primary/10 border border-border/60 flex items-center justify-center text-[10px] font-mono font-bold text-primary shrink-0">
                    {agent.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-foreground">{agent.name}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {agent.role}
                    </span>
                  </div>
                </div>

                {already && !checked && (
                  <Badge variant="outline" className="h-4 text-[0.6rem] shrink-0 text-muted-foreground">
                    مجهزة حالياً
                  </Badge>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="text-xs h-8 cursor-pointer"
          >
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="text-xs h-8 gap-1.5 font-bold cursor-pointer"
          >
            {saving ? <LoadingSpinner size="sm" /> : <Check className="size-3.5" />}
            <span>{saving ? "جارٍ الحفظ..." : "تأكيد التجهيز"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
