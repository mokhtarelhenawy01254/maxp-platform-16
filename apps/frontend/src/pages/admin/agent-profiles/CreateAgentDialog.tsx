import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, AlertCircle, Bot, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import tokenManager from "../../../utils/tokenManager";
import { buildApiUrl } from "../../../utils/urlHelper";

interface TemplateItem {
  slug: string;
  name: string;
  role: string;
  allowedTools: string[];
  allowedSkills: string[];
}

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: TemplateItem[];
  templatesLoading: boolean;
  onCreated: (agentId: string, agentName: string) => void;
}

export default function CreateAgentDialog({
  open,
  onOpenChange,
  templates,
  templatesLoading: _templatesLoading,
  onCreated,
}: CreateAgentDialogProps) {
  const { t } = useTranslation();
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentIcon] = useState("agent");
  const [newAgentDesc, setNewAgentDesc] = useState("");
  const [newAgentTemplate, setNewAgentTemplate] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const selectedTemplate = templates.find((tpl) => tpl.slug === newAgentTemplate);

  const handleCreate = async () => {
    const trimmedName = newAgentName.trim();
    if (!trimmedName || creating) return;

    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch(buildApiUrl("/agent/agents"), {
        method: "POST",
        headers: {
          ...tokenManager.createAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          role: selectedTemplate?.role || "CUSTOM",
          templateSlug: newAgentTemplate || null,
          icon: newAgentIcon,
          description: newAgentDesc.trim() || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.message || `Status: ${res.status}`);
      }

      const createdAgent = data.data || data.agent || data;
      const createdId = createdAgent.id || createdAgent.agentId || trimmedName;

      onCreated(createdId, trimmedName);
      onOpenChange(false);
      setNewAgentName("");
      setNewAgentDesc("");
      setNewAgentTemplate(null);
    } catch (err: any) {
      setCreateError(err.message || t("agentProfiles.create.error", "فشل إنشاء الوكيل"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border border-border/80 rounded-xl shadow-2xl p-4 sm:p-5" dir="rtl">
        <DialogHeader className="pb-2 border-b border-border/60">
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base font-bold text-foreground">
            <span className="size-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Bot className="size-4 text-primary" />
            </span>
            <span>{t("agentProfiles.create.title", "إضافة وكيل ذكي جديد")}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-3 text-xs">
          {/* اختيار القالب */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
              {t("agentProfiles.create.template", "قالب الوكيل")}
            </label>
            <Select
              value={newAgentTemplate || "custom"}
              onValueChange={(v) => {
                const slug = v === "custom" ? null : v;
                setNewAgentTemplate(slug);
                if (slug) {
                  const tpl = templates.find((t) => t.slug === slug);
                  if (tpl && !newAgentName) setNewAgentName(tpl.name);
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs bg-background/50 border-border/70">
                <SelectValue>
                  {newAgentTemplate
                    ? templates.find((t) => t.slug === newAgentTemplate)?.name || ""
                    : t("agentProfiles.create.custom", "مخصص")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">{t("agentProfiles.create.custom", "مخصص")}</SelectItem>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.slug} value={tpl.slug}>
                    {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* الاسم */}
          <div>
            <label htmlFor="create-agent-name" className="text-[11px] font-semibold text-muted-foreground block mb-1">
              {t("agentProfiles.create.name", "الاسم *")}
            </label>
            <Input
              id="create-agent-name"
              placeholder={t("agentProfiles.create.namePlaceholder", "أدخل اسم الوكيل")}
              value={newAgentName}
              onChange={(e) => setNewAgentName(e.target.value)}
              disabled={creating}
              className="h-8 text-xs bg-background/50 border-border/70"
            />
          </div>

          {/* وصف الوكيل */}
          <div>
            <label htmlFor="create-agent-desc" className="text-[11px] font-semibold text-muted-foreground block mb-1">
              {t("agentProfiles.create.description", "الوصف (اختياري)")}
            </label>
            <Input
              id="create-agent-desc"
              placeholder={t("agentProfiles.create.descPlaceholder", "وصف مختصر لدور الوكيل")}
              value={newAgentDesc}
              onChange={(e) => setNewAgentDesc(e.target.value)}
              disabled={creating}
              className="h-8 text-xs bg-background/50 border-border/70"
            />
          </div>

          {/* Preview */}
          {newAgentName && (
            <div className="flex items-center gap-2.5 p-2.5 bg-muted/20 rounded-lg border border-border/60">
              <div className="size-8 rounded-full bg-primary/10 border border-border/60 flex items-center justify-center text-xs font-mono font-bold text-primary shrink-0">
                {newAgentName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{newAgentName}</p>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {selectedTemplate ? selectedTemplate.name : t("agentProfiles.create.custom", "مخصص")}
                </span>
              </div>
            </div>
          )}

          {createError && (
            <div className="flex items-start gap-2 p-2 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs">
              <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
              <span>{createError}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2 border-t border-border/60">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
            className="h-8 text-xs px-3 font-mono active:scale-[0.98]"
          >
            {t("agentProfiles.create.cancel", "إلغاء")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !newAgentName.trim()}
            className="h-8 text-xs px-4 font-semibold active:scale-[0.98]"
          >
            {creating ? <Loader2 className="ml-1.5 size-3 animate-spin" /> : <Plus className="ml-1.5 size-3" />}
            {creating ? t("agentProfiles.create.creating", "جارٍ الإنشاء...") : t("agentProfiles.create.submit", "إنشاء الوكيل")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
