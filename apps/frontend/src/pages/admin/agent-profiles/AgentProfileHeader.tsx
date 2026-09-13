import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  PenLine,
  Save,
  X,
  RefreshCw,
  Trash2,
  Loader2,
  FlaskConical,
  GraduationCap,
  GitFork,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface AgentProfileHeaderProps {
  agentId: string;
  agentRole: string;
  agentStatus: string;
  templateSlug: string | null;
  channels: string[];
  editing: boolean;
  setEditing: (v: boolean) => void;
  draftName: string;
  setDraftName: (v: string) => void;
  draftIcon: string;
  setDraftIcon: (v: string) => void;
  hasUnsavedChanges: boolean;
  statusSaving: boolean;
  profileSaving: boolean;
  onToggleStatus: (nextActive: boolean) => void;
  onSave: () => void;
  onDiscard: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  refreshLoading: boolean;
}

const AGENT_ICONS = ["🤖", "💼", "🎧", "📦", "📣", "💬", "📊", "🧠", "⚡", "🎯", "🛒", "🔧"];

export default function AgentProfileHeader({
  agentId,
  agentRole,
  agentStatus,
  templateSlug,
  channels,
  editing,
  setEditing,
  draftName,
  setDraftName,
  draftIcon,
  setDraftIcon,
  hasUnsavedChanges,
  statusSaving,
  profileSaving,
  onToggleStatus,
  onSave,
  onDiscard,
  onDelete,
  onRefresh,
  refreshLoading,
}: AgentProfileHeaderProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const active = agentStatus?.toUpperCase() === "ACTIVE";

  return (
    <div className="px-4 lg:px-6 py-4 border-b border-border/50 bg-card/60 backdrop-blur-sm space-y-3">
      {/* ── Top Identity Row ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="grid grid-cols-4 gap-1">
                {AGENT_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setDraftIcon(icon)}
                    className={`size-7 flex items-center justify-center rounded-md text-sm border transition-colors ${
                      draftIcon === icon
                        ? "border-primary bg-primary/10 font-bold"
                        : "border-border/60 hover:border-foreground/30"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <span className="text-3xl shrink-0 leading-none mt-0.5">{draftIcon || "🤖"}</span>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {editing ? (
                <Input
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="h-8 text-base font-bold w-64 max-w-full"
                />
              ) : (
                <h1 className="text-base font-bold text-foreground truncate">{draftName}</h1>
              )}

              {/* Status indicator */}
              <span
                className={`inline-block size-2.5 rounded-full shrink-0 ${
                  active ? "bg-emerald-500" : "bg-muted-foreground/30"
                }`}
                aria-hidden="true"
              />
              <span className="text-xs text-muted-foreground">
                {active ? t("agentProfiles.header.status.active", "نشط") : t("agentProfiles.header.status.paused", "متوقف")}
              </span>

              {/* Channel Badges */}
              {channels.map((ch) => (
                <span
                  key={ch}
                  className="text-[11px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded font-medium border border-border/40"
                >
                  {t(`agentProfiles.channel.${ch.toLowerCase()}`, ch)}
                </span>
              ))}

              {templateSlug && (
                <span className="text-[11px] font-mono text-muted-foreground/70 bg-muted/40 px-1.5 py-0.5 rounded border border-border/40">
                  {templateSlug}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-1">{agentRole}</p>
          </div>
        </div>

        {/* ── Status Switch & Actions ── */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-1.5">
            <Switch
              checked={active}
              onCheckedChange={onToggleStatus}
              disabled={statusSaving}
              aria-label={t("agentProfiles.header.status.active_toggle", "تفعيل")}
            />
            <span className="text-xs font-medium text-muted-foreground select-none">
              {statusSaving ? "..." : active ? t("agentProfiles.header.status.active_toggle", "مفعل") : t("agentProfiles.header.status.paused_toggle", "متوقف")}
            </span>
          </div>

          {agentRole !== "CEO" && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
              aria-label={t("agentProfiles.header.deleteTitle", "أرشفة الوكيل")}
              title={t("agentProfiles.header.deleteTitle", "أرشفة الوكيل")}
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Bottom Toolbar Row: Quick Links & Save/Discard ── */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 flex-wrap">
        {/* Left / Start: Edit & Quick AI Hub Navigation */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {!editing ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs px-3"
              onClick={() => setEditing(true)}
            >
              <PenLine className="size-3.5 ml-1" />
              {t("agentProfiles.settings.edit", "تعديل")}
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                className="h-8 text-xs px-3"
                onClick={onSave}
                disabled={profileSaving || !hasUnsavedChanges}
              >
                {profileSaving ? (
                  <Loader2 className="size-3.5 animate-spin ml-1" />
                ) : (
                  <Save className="size-3.5 ml-1" />
                )}
                {profileSaving
                  ? t("agentProfiles.header.saving", "جارٍ الحفظ...")
                  : t("agentProfiles.header.save", "حفظ التغييرات")}
              </Button>
              {hasUnsavedChanges && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs px-2.5"
                  onClick={onDiscard}
                  disabled={profileSaving}
                >
                  <X className="size-3.5 ml-1" />
                  {t("agentProfiles.header.discard", "تراجع")}
                </Button>
              )}
            </>
          )}

          {/* Quick Hub Links */}
          <span className="h-4 w-px bg-border/60 mx-1 hidden sm:inline-block" />

          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/admin/ai-hub?tab=sandbox&agent=${encodeURIComponent(agentId)}`)}
            title={t("agentProfiles.header.sandbox", "تجربة متقدمة في الساندبوكس")}
          >
            <FlaskConical className="size-3.5 ml-1 text-primary" />
            <span className="hidden sm:inline">{t("agentProfiles.header.sandbox", "الساندبوكس")}</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/admin/ai-hub?tab=train")}
            title={t("agentProfiles.header.training", "تدريب الوكيل على معلومات المتجر")}
          >
            <GraduationCap className="size-3.5 ml-1 text-indigo-500" />
            <span className="hidden sm:inline">{t("agentProfiles.header.training", "التدريب")}</span>
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/admin/ai-hub?tab=routing")}
            title={t("agentProfiles.header.routing", "توزيع وربط القنوات")}
          >
            <GitFork className="size-3.5 ml-1 text-amber-500" />
            <span className="hidden sm:inline">{t("agentProfiles.header.routing", "القنوات")}</span>
          </Button>
        </div>

        {/* Right / End: Refresh */}
        <div className="flex items-center gap-1 mr-auto">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-foreground"
            onClick={onRefresh}
            disabled={refreshLoading}
            aria-label={t("agentProfiles.header.refresh", "تحديث")}
            title={t("agentProfiles.header.refresh", "تحديث")}
          >
            <RefreshCw className={`size-3.5 ${refreshLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
