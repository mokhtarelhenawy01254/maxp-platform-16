import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { getDirection } from "../../../i18n";
import { getDevStrings } from "./devI18n";
import { devFetch } from "./devApi";
import { DevCredential, DevScopeDef, formatDateTime } from "./devTypes";
import KeyRevealDialog from "./KeyRevealDialog";

const DEFAULT_READ_SCOPES = [
  "products:read",
  "inventory:read",
  "orders:read",
  "customers:read",
  "coupons:read",
  "analytics:read",
];

const ApiKeysTab: React.FC = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const s = useMemo(() => getDevStrings(lang), [lang]);

  const [credentials, setCredentials] = useState<DevCredential[]>([]);
  const [scopeDefs, setScopeDefs] = useState<DevScopeDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>(DEFAULT_READ_SCOPES);
  const [rateLimit, setRateLimit] = useState("60");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const apiScopes = useMemo(() => scopeDefs.filter((scope) => !scope.group.startsWith("video")), [scopeDefs]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [credentialsResponse, scopesResponse] = await Promise.all([
        devFetch<{ credentials: DevCredential[] }>("/credentials?type=API"),
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
          credentialType: "API",
          scopes: selectedScopes,
          rateLimitPerMin: Number(rateLimit) || 60,
          expiresInDays: expiresInDays ? Number(expiresInDays) : null,
        }),
      });
      setCreateOpen(false);
      setName("");
      setExpiresInDays("");
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

  const scopeLabel = (key: string) => {
    const def = scopeDefs.find((scope) => scope.key === key);
    if (!def) return key;
    return lang === "en" ? def.label_en : def.label_ar;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{s.keys.title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{s.keys.description}</p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <PlusIcon className="h-4 w-4" />
          <span className="ms-1">{s.keys.createKey}</span>
        </Button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{s.common.loading}</p>
      ) : error ? (
        <div className="py-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
            {s.common.retry}
          </Button>
        </div>
      ) : credentials.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          {s.keys.empty}
        </p>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{s.keys.nameColumn}</TableHead>
                <TableHead>{s.keys.prefixColumn}</TableHead>
                <TableHead className="hidden md:table-cell">{s.keys.lastUsed}</TableHead>
                <TableHead>{s.keys.statusColumn}</TableHead>
                <TableHead className="text-end">{s.keys.actionsColumn}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credentials.map((credential) => (
                <TableRow key={credential.id}>
                  <TableCell>
                    <div className="font-medium text-foreground">{credential.name}</div>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {credential.scopes.slice(0, 3).map((scope) => (
                        <Badge key={scope} variant="secondary" className="text-[10px]">
                          {scopeLabel(scope)}
                        </Badge>
                      ))}
                      {credential.scopes.length > 3 && (
                        <Badge variant="secondary" className="text-[10px]">
                          +{credential.scopes.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums">
                      {credential.maskedKey}
                    </code>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground tabular-nums">
                    {credential.lastUsedAt ? formatDateTime(credential.lastUsedAt, lang) : s.keys.neverUsed}
                  </TableCell>
                  <TableCell>
                    <Badge variant={credential.isActive ? "default" : "secondary"}>
                      {credential.isActive ? s.keys.active : s.keys.inactive}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-2">
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent dir={getDirection()} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{s.keys.createTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="dev-key-name">{s.common.name}</Label>
              <Input
                id="dev-key-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={s.keys.namePlaceholder}
                maxLength={120}
              />
            </div>

            <div className="space-y-2">
              <Label>{s.keys.scopesLabel}</Label>
              <p className="text-xs text-muted-foreground">{s.keys.scopesHint}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {apiScopes.map((scope) => (
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dev-key-rate">{s.keys.rateLimitLabel}</Label>
                <Input
                  id="dev-key-rate"
                  type="number"
                  min={10}
                  max={600}
                  value={rateLimit}
                  onChange={(event) => setRateLimit(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">{s.common.perMinute}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dev-key-expiry">{s.keys.expiresLabel}</Label>
                <Input
                  id="dev-key-expiry"
                  type="number"
                  min={1}
                  value={expiresInDays}
                  onChange={(event) => setExpiresInDays(event.target.value)}
                  placeholder={s.keys.expiresNever}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={busy}>
              {s.common.cancel}
            </Button>
            <Button onClick={() => void handleCreate()} disabled={busy || !name.trim()}>
              {busy ? s.common.loading : s.keys.createKey}
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

export default ApiKeysTab;
