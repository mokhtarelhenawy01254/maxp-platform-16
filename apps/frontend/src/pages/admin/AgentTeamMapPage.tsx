import { useTranslation } from 'react-i18next';
import React, { useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { GitBranch, Users, ExternalLink, RefreshCw } from 'lucide-react';
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { AdminPageHeader } from "@/components/Admin";

interface AgentNode {
  id: string;
  name: string;
  role: string;
  status: string;
  model?: string | null;
  templateSlug?: string | null;
  departmentName?: string | null;
  departmentIcon?: string | null;
  managerType?: string | null;
  children?: AgentNode[];
}

const apiRequest = async <T,>(path: string): Promise<T> => {
  const response = await fetch(buildApiUrl(path), {
    headers: tokenManager.createAuthHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || `Request failed: ${response.status}`);
  }
  return data as T;
};

const roleTone = (role: string) => {
  if (role === "CEO") return { border: "#2563eb", bg: "#eff6ff" };
  if (role === "MARKETING") return { border: "#db2777", bg: "#fdf2f8" };
  if (role === "SALES") return { border: "#16a34a", bg: "#f0fdf4" };
  if (role === "SUPPORT") return { border: "#f59e0b", bg: "#fffbeb" };
  if (role === "INVENTORY" || role === "PRICING") return { border: "#0891b2", bg: "#ecfeff" };
  return { border: "#64748b", bg: "#f8fafc" };
};

export default function AgentTeamMapPage() {
  const { t } = useTranslation();
  const [tree, setTree] = useState<AgentNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await apiRequest("agent-manager/me");
      const data = await apiRequest<{ success: true; tree: AgentNode[] }>("agent/team-map");
      setTree(data.tree || []);
    } catch (err: any) {
      setError(err.message || t("agentTeamMap.loadError"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  return (
    <div
      className="min-h-[calc(100dvh-64px)] bg-background p-4 md:p-6"
      dir="rtl"
    >
      <AdminPageHeader
        title={t("agentTeamMap.title")}
        subtitle={t("agentTeamMap.subtitle")}
        icon={<GitBranch className="size-7" />}
        actions={<>
          <Button variant="outline" asChild className="backdrop-blur-sm"><RouterLink to="/admin/ai-agents"><ExternalLink className="mr-1 size-4" />{t("agentTeamMap.manageFiles")}</RouterLink></Button>
          <Button variant="ghost" size="icon" onClick={loadTree} className="backdrop-blur-sm">{loading ? <LoadingSpinner size="sm" /> : <RefreshCw className="size-5" />}</Button>
        </>}
      />

      {error && (
        <div
          className="mb-4 rounded-2xl border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive backdrop-blur-sm"
          role="alert"
        >
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="icon-xs" onClick={() => setError(null)}>
              <ExternalLink className="size-3" />
            </Button>
          </div>
        </div>
      )}

      <div
        className="min-h-[560px] overflow-auto rounded-2xl border bg-card/60 p-4 backdrop-blur-xl md:p-8"
      >
        {loading ? (
          <div className="grid min-h-[420px] place-items-center">
            <LoadingSpinner size="lg" />
          </div>
        ) : tree.length === 0 ? (
          <div className="grid min-h-[420px] place-items-center text-center">
            <p className="text-muted-foreground">{t("agentTeamMap.emptyState")}</p>
          </div>
        ) : (
          <div className="flex min-w-[980px] items-start justify-center gap-0">
            {tree.map((node) => (
              <TreeBranch key={node.id} node={node} depth={0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TreeBranch({ node, depth }: { node: AgentNode; depth: number }) {
  const children = node.children || [];
  return (
    <div className="relative px-3 text-center">
      <AgentCard node={node} depth={depth} />
      {children.length > 0 && (
        <>
          <div className="mx-auto h-7 w-0.5 bg-gradient-to-b from-border/60 to-border/20" />
          <div className="relative flex items-start justify-center pt-3">
            <div
              className="absolute top-0 h-0.5 bg-gradient-to-r from-border/20 via-border/60 to-border/20"
              style={{
                left: children.length === 1 ? "50%" : 24,
                right: children.length === 1 ? "50%" : 24,
              }}
            />
            {children.map((child) => (
              <div key={child.id} className="relative">
                <div className="absolute left-1/2 top-[-24px] h-6 w-0.5 bg-gradient-to-b from-border/60 to-border/20" />
                <TreeBranch node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AgentCard({ node, depth }: { node: AgentNode; depth: number }) {
  const { t } = useTranslation();
  const tone = roleTone(node.role);
  const { derivedTheme } = useTheme();
  const isDark = derivedTheme === "dark";

  return (
    <div
      className="min-h-[126px] w-[240px] rounded-2xl border-[1.5px] p-4 backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
      style={{
        borderColor: tone.border,
        backgroundColor: isDark ? `${tone.bg}22` : `${tone.bg}cc`,
        boxShadow: depth === 0
          ? `0 18px 48px ${tone.border}1f`
          : `0 4px 16px ${tone.border}0d`,
      }}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2">
          <div
            className="flex size-7 items-center justify-center rounded-lg backdrop-blur-sm"
            style={{ backgroundColor: `${tone.border}18`, color: tone.border }}
          >
            <Users className="size-4" />
          </div>
          <span className="truncate font-black">{node.name}</span>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <Badge variant={node.role === "CEO" ? "default" : "outline"} className="text-xs backdrop-blur-sm">
            {node.role}
          </Badge>
          <Badge variant="outline" className="text-xs backdrop-blur-sm">
            {node.status}
          </Badge>
          <Badge variant="outline" className="text-xs backdrop-blur-sm">
            {node.managerType || (node.role === "CEO" ? "CEO" : "AGENT")}
          </Badge>
        </div>
        {node.departmentName && (
          <p className="truncate text-xs text-muted-foreground/80">
            {node.departmentIcon || ""} {node.departmentName}
          </p>
        )}
        <p className="truncate font-mono text-xs text-muted-foreground/60">
          {node.templateSlug || "custom"} · {node.model || "default"}
        </p>
        <Button variant="link" size="sm" asChild className="backdrop-blur-sm">
          <RouterLink to={`/admin/agent-profiles?agent=${node.id}`}>
            <ExternalLink className="mr-1 size-3.5" />
            {t("agentTeamMap.openAgent")}
          </RouterLink>
        </Button>
      </div>
    </div>
  );
}
