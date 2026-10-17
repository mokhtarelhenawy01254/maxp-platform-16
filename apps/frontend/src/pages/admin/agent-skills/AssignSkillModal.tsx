import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus, Search, Check, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { AgentDefinition, SkillDefinition } from "./types";

interface AssignSkillModalProps {
  open: boolean;
  skill: SkillDefinition | null;
  agents: AgentDefinition[];
  onClose: () => void;
  onSave: (selectedAgentIds: string[]) => Promise<void>;
}

export const AssignSkillModal: React.FC<AssignSkillModalProps> = ({
  open,
  skill,
  agents,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && skill) {
      setSelected(
        new Set(
          agents
            .filter((a) => (a.allowedSkills || []).includes(skill.id))
            .map((a) => a.id)
        )
      );
      setSearch("");
      setError(null);
    }
  }, [open, skill, agents]);

  const filtered = useMemo(() => {
    if (!search.trim()) return agents;
    const q = search.toLowerCase();
    return agents.filter((a) =>
      [a.name, a.role, a.id].some((v) => String(v).toLowerCase().includes(q))
    );
  }, [agents, search]);

  const toggle = (id: string) =>
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((a) => a.id)));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(Array.from(selected));
      onClose();
    } catch (err: any) {
      setError(err.message || t("common.saveError"));
    } finally {
      setSaving(false);
    }
  };

  if (!skill) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="size-5 text-primary" />
            <span>تعيين المهارة لوكلاء المنشأة</span>
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-muted-foreground">
            {skill.displayName || skill.id} ({skill.id})
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="relative mb-2">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث في الوكلاء..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>تم اختيار {selected.size} من أصل {filtered.length}</span>
          <Button size="sm" variant="link" onClick={toggleAll} className="h-6 px-1 text-xs">
            {selected.size === filtered.length ? "إلغاء تحديد الكل" : "تحديد الكل"}
          </Button>
        </div>

        <div className="max-h-[300px] space-y-1.5 overflow-y-auto p-0.5">
          {filtered.map((agent) => {
            const checked = selected.has(agent.id);
            const already = (agent.allowedSkills || []).includes(skill.id);

            return (
              <div
                key={agent.id}
                onClick={() => toggle(agent.id)}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 transition-all",
                  checked
                    ? "border-primary bg-primary/5"
                    : "border-border/70 hover:bg-muted/40"
                )}
              >
                <div
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                    checked
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground"
                  )}
                >
                  {checked && <Check className="size-3" />}
                </div>

                <div className="size-6 rounded-full bg-primary/10 border border-border/60 flex items-center justify-center text-[10px] font-mono font-bold text-primary shrink-0">
                  {agent.name.charAt(0)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-foreground">{agent.name}</p>
                  <span className="text-[10px] text-muted-foreground">{agent.role}</span>
                </div>

                {already && !checked && (
                  <Badge variant="outline" className="h-4 text-[9px] font-mono text-muted-foreground">
                    حالي
                  </Badge>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="py-6 text-center text-xs text-muted-foreground">
              لا توجد نتائج مطابقة للبحث
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-3 border-t pt-3">
          <Button variant="outline" onClick={onClose} disabled={saving} className="h-8 text-xs">
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={saving} className="h-8 text-xs font-bold gap-1.5">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            <span>حفظ التعيينات</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
