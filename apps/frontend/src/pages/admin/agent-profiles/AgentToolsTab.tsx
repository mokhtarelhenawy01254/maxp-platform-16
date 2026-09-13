import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Wrench,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  SlidersHorizontal,
  FileCode,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import tokenManager from "../../../utils/tokenManager";
import { buildApiUrl } from "../../../utils/urlHelper";

interface AgentToolsTabProps {
  allowedTools: string[];
  agentId: string;
  agentName: string;
  companyId?: string;
  onRefresh?: () => void;
}

interface ToolMeta {
  name: string;
  description?: string;
  sideEffects?: "read" | "write";
  group?: string;
}

const KNOWN_GROUP_LABELS: Record<string, string> = {
  order: "طلبات ومبيعات",
  product: "كتالوج المنتجات",
  inventory: "المخزون والمستودعات",
  customer: "بيانات العملاء",
  shipping: "الشحن والتوصيل",
  facebook: "فيسبوك وانستجرام",
  whatsapp: "واتساب ماسنجر",
  governance: "الحوكمة والرقابة",
  system: "النظام والبيئة",
  mcp: "بروتوكول MCP",
};

export default function AgentToolsTab({
  allowedTools,
  agentName,
  companyId,
}: AgentToolsTabProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [toolMetadata, setToolMetadata] = useState<Map<string, ToolMeta>>(new Map());
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "read" | "write">("all");

  /* ── Load tools metadata ── */
  useEffect(() => {
    let cancelled = false;
    async function loadMeta() {
      try {
        const queryParam = companyId ? `?companyId=${encodeURIComponent(companyId)}` : "";
        const res = await fetch(buildApiUrl(`agent/tools${queryParam}`), {
          headers: {
            ...tokenManager.createAuthHeaders(),
            "Content-Type": "application/json",
          },
        });
        const data = await res.json().catch(() => ({}));
        if (!cancelled && data.success && Array.isArray(data.tools)) {
          const map = new Map<string, ToolMeta>();
          for (const item of data.tools) {
            map.set(item.name, {
              name: item.name,
              description: item.description,
              sideEffects: item.sideEffects,
              group: item.group,
            });
          }
          setToolMetadata(map);
        }
      } catch {
        // Fallback to local heuristic metadata
      }
    }
    loadMeta();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  /* ── Enriched tool list with sideEffects calculation ── */
  const enrichedTools = useMemo(() => {
    return allowedTools.map((toolName) => {
      const meta = toolMetadata.get(toolName);
      const isWriteHeuristic =
        toolName.includes("create") ||
        toolName.includes("update") ||
        toolName.includes("delete") ||
        toolName.includes("send") ||
        toolName.includes("cancel") ||
        toolName.includes("refund") ||
        toolName.includes("post") ||
        toolName.includes("set") ||
        toolName.includes("remove") ||
        toolName.includes("assign");

      const sideEffects: "read" | "write" = meta?.sideEffects || (isWriteHeuristic ? "write" : "read");

      // Extract group prefix if not in metadata (e.g. "order.status" -> "order")
      const group = meta?.group || (toolName.includes(".") ? toolName.split(".")[0] : undefined);

      return {
        name: toolName,
        description: meta?.description,
        sideEffects,
        group,
      };
    });
  }, [allowedTools, toolMetadata]);

  /* ── Stats ── */
  const readToolsCount = useMemo(
    () => enrichedTools.filter((tItem) => tItem.sideEffects === "read").length,
    [enrichedTools]
  );
  const writeToolsCount = useMemo(
    () => enrichedTools.filter((tItem) => tItem.sideEffects === "write").length,
    [enrichedTools]
  );

  /* ── Filtered tools ── */
  const filteredTools = useMemo(() => {
    let list = enrichedTools;
    if (typeFilter === "read") {
      list = list.filter((tItem) => tItem.sideEffects === "read");
    } else if (typeFilter === "write") {
      list = list.filter((tItem) => tItem.sideEffects === "write");
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (tItem) =>
          tItem.name.toLowerCase().includes(q) ||
          tItem.description?.toLowerCase().includes(q) ||
          tItem.group?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [enrichedTools, typeFilter, searchQuery]);

  return (
    <div className="max-w-4xl space-y-5">
      {/* ── Summary Stats Banner ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border/70 bg-card p-3.5 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Wrench className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("agentProfiles.tools.totalAllowed", "إجمالي الأدوات المصرحة")}</p>
            <p className="text-xl font-black text-foreground">{allowedTools.length}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-3.5 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("agentProfiles.tools.readTools", "أدوات قراءة واستعلام")}</p>
            <p className="text-xl font-black text-blue-600 dark:text-blue-400">{readToolsCount}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border/70 bg-card p-3.5 flex items-center gap-3">
          <div className="size-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldAlert className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("agentProfiles.tools.writeTools", "أدوات تنفيذ وحركات")}</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400">{writeToolsCount}</p>
          </div>
        </div>
      </div>

      {/* ── Filter Bar & Actions ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/50 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("agentProfiles.tools.searchPlaceholder", "بحث في اسم الأداة أو الوصف...")}
              className="h-8 pr-8 text-xs bg-card"
            />
          </div>

          <div className="flex items-center bg-muted/50 p-0.5 rounded-lg border border-border/40 shrink-0">
            <button
              onClick={() => setTypeFilter("all")}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md font-medium transition-all",
                typeFilter === "all"
                  ? "bg-card text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("common.all", "الكل")}
            </button>
            <button
              onClick={() => setTypeFilter("read")}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md font-medium transition-all",
                typeFilter === "read"
                  ? "bg-card text-blue-600 dark:text-blue-400 shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("agentProfiles.tools.filterRead", "قراءة")}
            </button>
            <button
              onClick={() => setTypeFilter("write")}
              className={cn(
                "px-2.5 py-1 text-xs rounded-md font-medium transition-all",
                typeFilter === "write"
                  ? "bg-card text-amber-600 dark:text-amber-400 shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("agentProfiles.tools.filterWrite", "تنفيذ")}
            </button>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/admin/ai-hub?tab=tools")}
          className="h-8 text-xs gap-1.5 bg-card"
        >
          <SlidersHorizontal className="size-3 text-primary" />
          <span>{t("agentProfiles.tools.manageTools", "إدارة صلاحيات الأدوات")}</span>
          <ExternalLink className="size-3 opacity-60 ml-0.5" />
        </Button>
      </div>

      {/* ── Tools Cards Grid / Empty State ── */}
      {filteredTools.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredTools.map((tItem) => {
            const isWrite = tItem.sideEffects === "write";
            const groupName = tItem.group
              ? KNOWN_GROUP_LABELS[tItem.group.toLowerCase()] || tItem.group
              : null;

            return (
              <div
                key={tItem.name}
                className={cn(
                  "p-3.5 rounded-xl border bg-card transition-all duration-150 flex flex-col justify-between gap-2.5",
                  isWrite
                    ? "border-amber-500/20 hover:border-amber-500/40"
                    : "border-border/70 hover:border-primary/40"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <FileCode className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="font-mono text-xs font-bold text-foreground truncate" title={tItem.name}>
                        {tItem.name}
                      </span>
                    </div>

                    {isWrite ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
                        <ShieldAlert className="size-2.5" />
                        {t("agentProfiles.tools.sideEffectWrite", "تنفيذ وتعديل")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full shrink-0">
                        <ShieldCheck className="size-2.5" />
                        {t("agentProfiles.tools.sideEffectRead", "قراءة واستعلام")}
                      </span>
                    )}
                  </div>

                  {tItem.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {tItem.description}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 italic">
                      {t("agentProfiles.tools.noDescription", "أداة قياسية مدمجة في منصة MaxP")}
                    </p>
                  )}
                </div>

                {groupName && (
                  <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="size-3 opacity-60" />
                      <span>{groupName}</span>
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono py-0 h-4">
                      {tItem.group}
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : allowedTools.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-card/50 p-8 text-center space-y-3">
          <div className="size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
            <Wrench className="size-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="text-sm font-bold text-foreground">
              {t("agentProfiles.tools.emptyTitle", "لا توجد أدوات مصرحة")}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                "agentProfiles.tools.emptyDesc",
                `لم يتم منح أي صلاحيات أدوات لـ ${agentName} حتى الآن. يمكنك تزويده بصلاحيات من لوحة الأدوات.`
              )}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/admin/ai-hub?tab=tools")}
            className="h-8 text-xs gap-1.5"
          >
            <Wrench className="size-3" />
            {t("agentProfiles.tools.assignTools", "تخصيص أدوات للوكيل")}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-xs text-muted-foreground">
          {t("agentProfiles.tools.noMatch", "لا توجد أدوات مطابقة لبحثك.")}
        </div>
      )}
    </div>
  );
}
