import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, AlertCircle, Sparkles } from "lucide-react";
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

const AGENT_ICONS = ["🤖", "💼", "🎧", "📦", "📣", "💬", "📊", "🧠", "⚡", "🎯", "🛒", "🔧"];

const TEMPLATE_ICON: Record<string, string> = {
  sales: "💼", "sales-agent": "💼",
  support: "🎧", "support-agent": "🎧",
  inventory: "📦", "inventory-pricing-agent": "📦",
  marketing: "📣", "marketing-agent": "📣",
  facebook: "💬", "facebook-sales-support-agent": "💬",
  sas: "📊", "sas-sales-agent": "📊",
  ceo: "🧠", "manager-ceo": "🧠",
  competitor: "🔍", analyst: "🔍",
  order: "🛒", "order-agent": "🛒", "order-confirmation-agent": "✅",
  shipping: "🚚", "shipping-agent": "🚚",
  "stock-target-monitor-agent": "📈", stock: "📈", target: "📈",
  customer: "🤝",
  dental: "🦷", medical: "🩺", clinic: "🏥", hotel: "🏨", course: "🎓",
};

const getTemplateIcon = (slug: string) => {
  for (const [key, icon] of Object.entries(TEMPLATE_ICON)) {
    if (slug.includes(key)) return icon;
  }
  return "🤖";
};

export default function CreateAgentDialog({
  open,
  onOpenChange,
  templates,
  templatesLoading: _templatesLoading,
  onCreated,
}: CreateAgentDialogProps) {
  const { t } = useTranslation();
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentIcon, setNewAgentIcon] = useState("🤖");
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
      if (!res.ok || data.success === false || !data.id) {
        throw new Error(data.error || data.detail || data.message || t("agentProfiles.toast.createFailed", "فشل إنشاء الوكيل"));
      }

      onOpenChange(false);
      setNewAgentName("");
      setNewAgentIcon("🤖");
      setNewAgentDesc("");
      setNewAgentTemplate(null);
      onCreated(data.id, data.name || trimmedName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("agentProfiles.toast.createFailed", "فشل إنشاء الوكيل");
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!creating) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <span className="size-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-sm">
              <Sparkles className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            </span>
            {t("agentProfiles.create.title", "إضافة وكيل ذكي جديد")}
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-4">
          {/* اختيار القالب */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
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
              <SelectTrigger className="h-9 text-xs">
                <SelectValue>
                  {newAgentTemplate
                    ? `${getTemplateIcon(newAgentTemplate)} ${templates.find((t) => t.slug === newAgentTemplate)?.name || ""}`
                    : `⚙️ ${t("agentProfiles.create.custom", "مخصص")}`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">⚙️ {t("agentProfiles.create.custom", "مخصص")}</SelectItem>
                {templates.map((tpl) => (
                  <SelectItem key={tpl.slug} value={tpl.slug}>
                    {getTemplateIcon(tpl.slug)} {tpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* الاسم والأيقونة */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="create-agent-name" className="text-xs font-semibold text-muted-foreground block mb-1.5">
                {t("agentProfiles.create.name", "الاسم")}
              </label>
              <Input
                id="create-agent-name"
                placeholder={t("agentProfiles.create.namePlaceholder", "أدخل اسم الوكيل")}
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                disabled={creating}
                className="h-9 text-xs"
              />
            </div>

            <div className="shrink-0">
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                {t("agentProfiles.icon.label", "أيقونة")}
              </label>
              <div className="grid grid-cols-4 gap-1">
                {AGENT_ICONS.slice(0, 8).map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewAgentIcon(icon)}
                    className={`size-8 flex items-center justify-center rounded-md text-sm border transition-colors ${
                      newAgentIcon === icon
                        ? "border-primary bg-primary/10"
                        : "border-border/60 hover:border-foreground/30"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* وصف الوكيل */}
          <div>
            <label htmlFor="create-agent-desc" className="text-xs font-semibold text-muted-foreground block mb-1.5">
              {t("agentProfiles.create.description", "الوصف (اختياري)")}
            </label>
            <Input
              id="create-agent-desc"
              placeholder={t("agentProfiles.create.descPlaceholder", "وصف مختصر لدور الوكيل")}
              value={newAgentDesc}
              onChange={(e) => setNewAgentDesc(e.target.value)}
              disabled={creating}
              className="h-9 text-xs"
            />
          </div>

          {/* Preview */}
          {newAgentName && (
            <div className="flex items-center gap-2.5 p-2.5 bg-muted/40 rounded-lg border border-border/50">
              <span className="text-xl shrink-0">{newAgentIcon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-foreground truncate">{newAgentName}</p>
                <span className="text-[10px] text-muted-foreground">
                  {selectedTemplate ? selectedTemplate.name : t("agentProfiles.create.custom", "مخصص")}
                </span>
              </div>
            </div>
          )}

          {createError && (
            <div className="flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs">
              <AlertCircle className="size-3.5 shrink-0 mt-0.5" />
              <span>{createError}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={creating}
            className="h-8 text-xs px-3"
          >
            {t("agentProfiles.create.cancel", "إلغاء")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !newAgentName.trim()}
            className="h-8 text-xs px-4"
          >
            {creating ? <Loader2 className="ml-1.5 size-3 animate-spin" /> : <Plus className="ml-1.5 size-3" />}
            {creating ? t("agentProfiles.create.creating", "جارٍ الإنشاء...") : t("agentProfiles.create.submit", "إنشاء")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
