import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Save, GitFork, MessageSquareOff, MessageSquare, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";

interface AgentSummary {
  id: string;
  name: string;
  role: string;
  status: string;
  allowedChannels: string[];
  allowedTools: string[];
}

interface ChannelConfig {
  channel: string;
  label: string;
  icon: string;
  agentId: string | null;
  toolName: string;
  toolActive: boolean;
}

const CHANNELS: { key: string; label: string; icon: string; tool: string }[] = [
  { key: "MESSENGER", label: "Messenger", icon: "💬", tool: "facebook.reply" },
  { key: "WHATSAPP", label: "WhatsApp", icon: "💚", tool: "whatsapp.send" },
  { key: "INSTAGRAM", label: "Instagram", icon: "📸", tool: "" },
  { key: "TELEGRAM", label: "Telegram", icon: "✈️", tool: "" },
  { key: "DASHBOARD", label: "Dashboard", icon: "🖥️", tool: "" },
];

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(buildApiUrl(path), {
    ...init,
    headers: { ...tokenManager.createAuthHeaders(), "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || data.message || `Error ${res.status}`);
  return data as T;
}

export default function ChannelRoutingPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [channelConfigs, setChannelConfigs] = useState<ChannelConfig[]>([]);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [dirtyChannels, setDirtyChannels] = useState<Set<string>>(new Set());
  const initialConfigsRef = React.useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ agents: AgentSummary[] }>("/agent-manager/agents");
      const agentsList = data.agents || [];
      setAgents(agentsList);

      const activeAgents = agentsList.filter((a) => a.status === "ACTIVE");
      const autoReplyResp = await apiFetch<{ autoReplyEnabled: boolean }>("/agent-manager/auto-reply").catch(() => ({ autoReplyEnabled: true }));
      setAutoReplyEnabled(autoReplyResp.autoReplyEnabled !== false);
      const configs: ChannelConfig[] = CHANNELS.map((ch) => {
        const assigned = activeAgents.find((a) =>
          (a.allowedChannels || []).map((c) => c.toUpperCase()).includes(ch.key)
        );
        return {
          channel: ch.key,
          label: ch.label,
          icon: ch.icon,
          agentId: assigned?.id || null,
          toolName: ch.tool,
          toolActive: !ch.tool || activeAgents.some((a) =>
            (a.allowedTools || []).includes(ch.tool)
          ),
        };
      });
      setChannelConfigs(configs);
      initialConfigsRef.current = JSON.stringify(configs);
      setDirtyChannels(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("aiHub.channelRouting.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAgentChange = (channel: string, agentId: string) => {
    setChannelConfigs((prev) =>
      prev.map((c) => (c.channel === channel ? { ...c, agentId: agentId || null } : c))
    );
    setDirtyChannels((prev) => new Set(prev).add(channel));
    setDirty(true);
  };

  const handleAutoReplyToggle = (enabled: boolean) => {
    setAutoReplyEnabled(enabled);
    setDirty(true);
  };

  const handleAssignAll = (agentId: string) => {
    setChannelConfigs((prev) => prev.map((c) => ({ ...c, agentId: agentId || null })));
    setDirtyChannels(new Set(CHANNELS.map((c) => c.key)));
    setDirty(true);
  };

  const handleReset = () => {
    if (!initialConfigsRef.current) return;
    setChannelConfigs(JSON.parse(initialConfigsRef.current));
    setDirtyChannels(new Set());
    setDirty(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const agentMap = new Map(agents.filter((a) => a.status === "ACTIVE").map((a) => [a.id, { ...a }]));
      for (const config of channelConfigs) {
        const prevAgent = [...agentMap.values()].find((a) =>
          (a.allowedChannels || []).map((c) => c.toUpperCase()).includes(config.channel)
        );
        if (prevAgent && prevAgent.id !== config.agentId) {
          const updated = (prevAgent.allowedChannels || []).filter(
            (c) => c.toUpperCase() !== config.channel
          );
          await apiFetch(`/agent-manager/agents/${prevAgent.id}`, {
            method: "PUT",
            body: JSON.stringify({ allowedChannels: updated }),
          });
          agentMap.set(prevAgent.id, { ...prevAgent, allowedChannels: updated });
        }
        if (config.agentId) {
          const target = agentMap.get(config.agentId);
          if (target) {
            const current = (target.allowedChannels || []).map((c) => c.toUpperCase());
            if (!current.includes(config.channel)) {
              const updated = [...(target.allowedChannels || []), config.channel];
              await apiFetch(`/agent-manager/agents/${config.agentId}`, {
                method: "PUT",
                body: JSON.stringify({ allowedChannels: updated }),
              });
              agentMap.set(config.agentId, { ...target, allowedChannels: updated });
            }
          }
        }
      }
      await apiFetch("/agent-manager/auto-reply", {
        method: "PUT",
        body: JSON.stringify({ enabled: autoReplyEnabled }),
      });
      toast.success(t("aiHub.channelRouting.saved"));
      setDirty(false);
      setDirtyChannels(new Set());
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("aiHub.channelRouting.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <GitFork className="size-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">{t("aiHub.channelRouting.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("aiHub.channelRouting.subtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} disabled={!dirty || saving} className="gap-1.5">
            <Undo2 className="size-4" />
            {t("aiHub.channelRouting.reset")}
          </Button>
          <Button onClick={handleSave} disabled={!dirty || saving} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {t("aiHub.channelRouting.save")}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t("aiHub.channelRouting.cardTitle")}</CardTitle>
              <CardDescription>{t("aiHub.channelRouting.cardDesc")}</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              {agents.filter((a) => a.status === "ACTIVE").length > 0 && (
                <div className="flex items-center gap-2 max-sm:hidden">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{t("aiHub.channelRouting.assignAll")}</span>
                  <Select onValueChange={handleAssignAll}>
                    <SelectTrigger className="w-[140px] h-8">
                      <SelectValue placeholder={t("aiHub.channelRouting.assignAllPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t("aiHub.channelRouting.noRouting")}</SelectItem>
                      {agents.filter((a) => a.status === "ACTIVE").map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name || a.id}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-2">
                {autoReplyEnabled ? (
                  <MessageSquare className="size-4 text-green-600" />
                ) : (
                  <MessageSquareOff className="size-4 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">{t("aiHub.channelRouting.autoReply")}</span>
                <Switch checked={autoReplyEnabled} onCheckedChange={handleAutoReplyToggle} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">{t("aiHub.channelRouting.channel")}</TableHead>
                <TableHead>{t("aiHub.channelRouting.agent")}</TableHead>
                <TableHead className="w-[140px]">{t("aiHub.channelRouting.toolStatus")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {channelConfigs.map((config) => (
                <TableRow key={config.channel} className={dirtyChannels.has(config.channel) ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.icon}</span>
                      <span>{config.label}</span>
                      {dirtyChannels.has(config.channel) && (
                        <span className="size-1.5 rounded-full bg-amber-500" title={t("aiHub.channelRouting.modified")} />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={config.agentId || ""}
                      onValueChange={(val) => handleAgentChange(config.channel, val)}
                    >
                      <SelectTrigger className="w-[240px]">
                        <SelectValue placeholder={t("aiHub.channelRouting.selectPlaceholder")}>
                          {config.agentId ? (agents.find((a) => a.id === config.agentId)?.name || config.agentId) : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t("aiHub.channelRouting.noRouting")}</SelectItem>
                        {agents
                          .filter((a) => a.status === "ACTIVE")
                          .map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name || agent.id}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {config.toolName ? (
                      <Badge variant={config.toolActive ? "default" : "secondary"}>
                        {config.toolActive ? t("aiHub.channelRouting.active") : t("aiHub.channelRouting.inactive")}
                      </Badge>
                    ) : (
                      <Badge variant="outline">{t("aiHub.channelRouting.comingSoon")}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

    </div>
  );
}
