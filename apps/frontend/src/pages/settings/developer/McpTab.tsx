import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardDocumentIcon, ExclamationTriangleIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getDirection } from "../../../i18n";
import { getApiUrl } from "../../../config/environment";
import { getDevStrings } from "./devI18n";
import { copyText, devFetch, fetchMcpStatus, McpStatus } from "./devApi";
import { DevCredential, DevScopeDef, formatDateTime } from "./devTypes";
import { PRESENTED_HEADER } from "./apiCatalog";
import KeyRevealDialog from "./KeyRevealDialog";

const MCP_DEFAULT_SCOPES = ["products:read", "inventory:read"];

type ClientKind = "cursor" | "claude" | "cline" | "windsurf";

const MCP_SERVERS = [
  {
    id: "catalog",
    path: "/mcp/catalog",
    tools: ["search", "inventory_check", "product_get"],
  },
  {
    id: "video",
    path: "/mcp/video",
    tools: ["create_video_task", "check_video_status", "list_recent_videos"],
  },
] as const;

const McpTab: React.FC = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const s = useMemo(() => getDevStrings(lang), [lang]);

  const origin = window.location.origin;

  const [credentials, setCredentials] = useState<DevCredential[]>([]);
  const [scopeDefs, setScopeDefs] = useState<DevScopeDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(MCP_DEFAULT_SCOPES);
  const [busy, setBusy] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [client, setClient] = useState<ClientKind>("cursor");

  // Deployment truth comes from the backend probe, never from this file:
  // while the servers are not deployed we must not print a copyable URL.
  const [mcpStatus, setMcpStatus] = useState<McpStatus | null>(null);
  const [statusFailed, setStatusFailed] = useState(false);
  const mcpAvailable = mcpStatus?.available === true;
  const statusPending = mcpStatus === null && !statusFailed;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const status = await fetchMcpStatus();
        if (!cancelled) {
          setMcpStatus(status);
          setStatusFailed(false);
        }
      } catch {
        // Fail closed: unknown status is treated exactly like "not available".
        if (!cancelled) {
          setMcpStatus(null);
          setStatusFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [credentialsResponse, scopesResponse] = await Promise.all([
        devFetch<{ credentials: DevCredential[] }>("/credentials?type=MCP"),
        devFetch<{ scopes: DevScopeDef[] }>("/scopes"),
      ]);
      setCredentials(credentialsResponse.credentials || []);
      setScopeDefs(scopesResponse.scopes || []);
    } catch (err) {
      setError((err as Error).message || s.common.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [s.common.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleScope = (key: string, checked: boolean) => {
    setSelectedScopes((current) =>
      checked ? [...new Set([...current, key])] : current.filter((item) => item !== key),
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const response = await devFetch<{ credential: DevCredential; key: string }>("/credentials", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          credentialType: "MCP",
          scopes: selectedScopes,
          rateLimitPerMin: 60,
        }),
      });
      setCreateOpen(false);
      setName("");
      setRevealedKey(response.key);
      toast.success(s.keys.createdToast);
      await load();
    } catch (err) {
      toast.error((err as Error).message || s.common.loadFailed);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleActive = async (credential: DevCredential) => {
    try {
      await devFetch(`/credentials/${credential.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !credential.isActive }),
      });
      await load();
    } catch (err) {
      toast.error((err as Error).message || s.common.loadFailed);
    }
  };

  const handleDelete = async (credential: DevCredential) => {
    if (!window.confirm(s.common.confirmDelete)) return;
    try {
      await devFetch(`/credentials/${credential.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      toast.error((err as Error).message || s.common.loadFailed);
    }
  };

  const configText = useMemo(() => {
    const credentialValue = revealedKey || "YOUR_MCP_KEY";
    const serverEntries = MCP_SERVERS.map((server) => {
      const url = `${origin}${server.path}`;
      return `    "maxp-${server.id}": {\n      "url": "${url}",\n      "headers": { "${PRESENTED_HEADER}": "Bearer ${credentialValue}" }\n    }`;
    }).join(",\n");
    return `{\n  "mcpServers": {\n${serverEntries}\n  }\n}`;
  }, [origin, revealedKey]);

  const handleCopyConfig = async () => {
    const done = await copyText(configText);
    if (done) toast.success(s.common.copied);
  };

  const scopeLabel = (key: string) => {
    const def = scopeDefs.find((scope) => scope.key === key);
    if (!def) return key;
    return lang === "en" ? def.label_en : def.label_ar;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{s.mcp.title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">
            {mcpAvailable ? s.mcp.description : s.mcp.descriptionUnavailable}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="h-4 w-4" />
          <span className="ms-1">{s.mcp.create}</span>
        </Button>
      </div>

      {!statusPending && !mcpAvailable && (
        <section
          data-testid="mcp-unavailable-banner"
          role="status"
          aria-live="polite"
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-semibold text-foreground">{s.mcp.unavailableTitle}</p>
            <Badge variant="secondary" className="text-[10px]">
              {s.mcp.unavailableBadge}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {s.mcp.reasonLabel}:{" "}
            {statusFailed || !mcpStatus || mcpStatus.reason !== "not_deployed"
              ? s.mcp.reasonUnknown
              : s.mcp.reasonNotDeployed}
          </p>
          <div className="mt-2 rounded-md border border-border/60 bg-background/60 p-2">
            <p className="text-xs font-medium text-foreground">{s.mcp.alternativeTitle}</p>
            <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{s.mcp.alternativeBody}</p>
            <code
              dir="ltr"
              className="mt-1.5 block break-all rounded bg-muted px-1.5 py-1 font-mono text-xs"
            >
              GET {getApiUrl()}/public/ext/analytics/summary
            </code>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{s.mcp.serversTitle}</h3>
        {!mcpAvailable ? (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            {statusPending ? s.mcp.checking : s.mcp.serversUnavailable}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {MCP_SERVERS.map((server) => (
                <div key={server.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {server.id === "catalog" ? s.mcp.catalogServer : s.mcp.videoServer}
                    </p>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      MCP
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{s.mcp.endpointLabel}</p>
                  <code dir="ltr" className="mt-0.5 block break-all rounded bg-muted px-1.5 py-1 font-mono text-xs">
                    {origin}
                    {server.path}
                  </code>
                  <p className="mt-2 text-xs text-muted-foreground">{s.mcp.toolsTitle}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {server.tools.map((tool) => (
                      <Badge key={tool} variant="outline" className="font-mono text-[10px]">
                        {tool}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{s.mcp.serverNote}</p>
          </>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{s.mcp.connectTitle}</h3>
        <div className="rounded-lg border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">{s.mcp.clientLabel}</Label>
              <Select value={client} onValueChange={(value) => setClient(value as ClientKind)}>
                <SelectTrigger className="h-8 w-40 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cursor">Cursor</SelectItem>
                  <SelectItem value="claude">Claude Desktop</SelectItem>
                  <SelectItem value="cline">Cline</SelectItem>
                  <SelectItem value="windsurf">Windsurf</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              size="sm"
              data-testid="mcp-copy-config"
              disabled={!mcpAvailable}
              title={mcpAvailable ? undefined : s.mcp.configUnavailable}
              onClick={() => void handleCopyConfig()}
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
              <span className="ms-1">{s.mcp.copyConfig}</span>
            </Button>
          </div>
          {!mcpAvailable ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {statusPending ? s.mcp.checking : s.mcp.configUnavailable}
            </p>
          ) : (
            <>
              <p className="mt-2 text-xs text-muted-foreground">
                {revealedKey ? s.mcp.configLabel : s.mcp.missingHint}
              </p>
              <pre
                data-testid="mcp-config-preview"
                dir="ltr"
                className="mt-2 max-h-72 overflow-auto rounded bg-muted p-2.5 font-mono text-xs leading-relaxed text-foreground"
              >
                {configText}
              </pre>
            </>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">{s.mcp.title}</h3>
        {loading ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{s.common.loading}</p>
        ) : error ? (
          <div className="py-6 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
              {s.common.retry}
            </Button>
          </div>
        ) : credentials.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            {s.mcp.empty}
          </p>
        ) : (
          <ul className="space-y-2">
            {credentials.map((credential) => (
              <li
                key={credential.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{credential.name}</p>
                    <Badge variant="secondary" className="text-[10px]">
                      {s.mcp.typeBadge}
                    </Badge>
                    <Badge variant={credential.isActive ? "default" : "secondary"} className="text-[10px]">
                      {credential.isActive ? s.keys.active : s.keys.inactive}
                    </Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 font-mono tabular-nums">
                      {credential.maskedKey}
                    </code>
                    <span>
                      {s.keys.lastUsed}:{" "}
                      {credential.lastUsedAt ? formatDateTime(credential.lastUsedAt, lang) : s.keys.neverUsed}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {credential.scopes.map((scope) => (
                      <Badge key={scope} variant="outline" className="text-[10px]">
                        {scopeLabel(scope)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => void handleToggleActive(credential)}>
                    {credential.isActive ? s.keys.revoke : s.keys.enable}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => void handleDelete(credential)}
                    aria-label={s.common.delete}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir={getDirection()} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{s.mcp.create}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dev-mcp-name">{s.common.name}</Label>
              <Input
                id="dev-mcp-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Cursor / Claude Desktop"
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label>{s.keys.scopesLabel}</Label>
              <p className="text-xs text-muted-foreground">{s.keys.scopesHint}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {scopeDefs.map((scope) => (
                  <label key={scope.key} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedScopes.includes(scope.key)}
                      onCheckedChange={(checked) => toggleScope(scope.key, checked === true)}
                    />
                    <span>{lang === "en" ? scope.label_en : scope.label_ar}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>
              {s.common.cancel}
            </Button>
            <Button onClick={() => void handleCreate()} disabled={busy || !name.trim()}>
              {busy ? s.common.loading : s.mcp.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <KeyRevealDialog
        open={Boolean(revealedKey)}
        onOpenChange={(open) => !open && setRevealedKey(null)}
        rawKey={revealedKey || ""}
      />
    </div>
  );
};

export default McpTab;
