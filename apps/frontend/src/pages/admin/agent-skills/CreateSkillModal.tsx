import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, Check, AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import tokenManager from "../../../utils/tokenManager";
import { buildApiUrl } from "../../../utils/urlHelper";
import { ToolDefinition } from "./types";

interface CreateSkillModalProps {
  open: boolean;
  tools: ToolDefinition[];
  onClose: () => void;
  onSaved: () => void;
  companyId?: string;
}

export const CreateSkillModal: React.FC<CreateSkillModalProps> = ({
  open,
  tools,
  onClose,
  onSaved,
  companyId,
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [priority, setPriority] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toolSearch, setToolSearch] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setInstructions("");
      setSelectedTools(new Set());
      setPriority(0);
      setError(null);
      setToolSearch("");
    }
  }, [open]);

  const filteredTools = useMemo(() => {
    if (!toolSearch.trim()) return tools;
    const q = toolSearch.toLowerCase();
    return tools.filter((t) =>
      [t.name, t.description].filter(Boolean).some((v) =>
        String(v).toLowerCase().includes(q)
      )
    );
  }, [tools, toolSearch]);

  const toggleTool = (tn: string) =>
    setSelectedTools((p) => {
      const n = new Set(p);
      if (n.has(tn)) n.delete(tn);
      else n.add(tn);
      return n;
    });

  const handleCreate = async () => {
    if (!name.trim()) {
      setError("اسم المهارة مطلوب");
      return;
    }
    if (!instructions.trim()) {
      setError("التعليمات مطلوبة لتوجيه سلوك الوكيل");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const url = companyId
        ? `agent/skills?companyId=${encodeURIComponent(companyId)}`
        : "agent/skills";
      const response = await fetch(buildApiUrl(url), {
        method: "POST",
        headers: {
          ...tokenManager.createAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          instructions: instructions.trim(),
          tools: Array.from(selectedTools),
          priority,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data.error || "فشل إنشاء المهارة");
      }
      toast.success("تم إنشاء المهارة بنجاح");
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء حفظ المهارة");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="size-5 text-primary" />
            <span>إنشاء مهارة مخصصة جديدة</span>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="size-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3.5 max-h-[65vh] overflow-y-auto pr-1">
          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">اسم المهارة</label>
            <Input
              placeholder="مثال: متابعة عملاء VIP للعيادات"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">الوصف التجاري</label>
            <Input
              placeholder="وصف مختصر للغرض من تفعيل المهارة..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">تعليمات الوكيل (Prompt Instructions)</label>
            <textarea
              className="min-h-[110px] w-full rounded-xl border border-border/80 bg-background p-3 text-xs outline-none focus:ring-1 focus:ring-primary leading-relaxed"
              placeholder="اكتب القواعد والتوجيهات وممنوعات السلوك التي سينفذها الوكيل بدقة..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">
              الأدوات المسموح للوكيل باستدعائها ({selectedTools.size} محددة)
            </label>
            <div className="relative mb-2">
              <Search className="absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="بحث في الأدوات المتاحة..."
                value={toolSearch}
                onChange={(e) => setToolSearch(e.target.value)}
                className="pr-8 h-8 text-xs"
              />
            </div>
            <div className="max-h-[140px] space-y-1 overflow-y-auto rounded-xl border border-border/70 p-2 bg-muted/20">
              {filteredTools.map((tool) => {
                const checked = selectedTools.has(tool.name);
                return (
                  <div
                    key={tool.name}
                    onClick={() => toggleTool(tool.name)}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                      checked
                        ? "bg-primary/10 text-primary font-bold"
                        : "hover:bg-muted text-muted-foreground"
                    )}
                  >
                    <div
                      className={cn(
                        "flex size-3.5 shrink-0 items-center justify-center rounded-sm border",
                        checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground"
                      )}
                    >
                      {checked && <Check className="size-2.5" />}
                    </div>
                    <span className="min-w-0 flex-1 truncate font-mono text-xs" dir="ltr">
                      {tool.name}
                    </span>
                    <span className="text-[0.65rem] text-muted-foreground truncate max-w-[140px]">
                      {tool.description}
                    </span>
                  </div>
                );
              })}
              {filteredTools.length === 0 && (
                <p className="py-2 text-center text-xs text-muted-foreground">
                  لا توجد أدوات مطابقة
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-foreground">أولوية الاستدعاء (Priority)</label>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) || 0)}
              className="w-24 h-8 text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2 border-t pt-3">
          <Button variant="outline" onClick={onClose} disabled={saving} className="h-8 text-xs">
            إلغاء
          </Button>
          <Button onClick={handleCreate} disabled={saving} className="h-8 text-xs font-bold gap-1.5">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
            <span>إنشاء المهارة</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
