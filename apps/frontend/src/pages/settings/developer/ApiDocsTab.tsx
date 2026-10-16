import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  MagnifyingGlassIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { getApiUrl } from "../../../config/environment";
import { getDevStrings } from "./devI18n";
import { copyText } from "./devApi";
import {
  API_BASE_PATH,
  buildCurl,
  buildOpenApiDocument,
  buildPostmanCollection,
  DevApiEndpoint,
  DEV_API_GROUPS,
  downloadJsonFile,
  requireEndpoint,
} from "./apiCatalog";

const methodBadgeClass = (method: string) =>
  method === "GET"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-amber-50 text-amber-700 border-amber-200";

const ApiDocsTab: React.FC = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const s = useMemo(() => getDevStrings(lang), [lang]);

  const docsOrigin = window.location.origin;
  const tryBase = `${getApiUrl()}/public/ext`;

  const [selectedId, setSelectedId] = useState("products-list");
  const [query, setQuery] = useState("");
  const [tryKey, setTryKey] = useState("");
  const [tryResult, setTryResult] = useState<string | null>(null);
  const [tryError, setTryError] = useState<string | null>(null);
  const [tryBusy, setTryBusy] = useState(false);

  const selected = useMemo(() => requireEndpoint(selectedId), [selectedId]);

  const filtersQuery = (endpoint: DevApiEndpoint) =>
    (endpoint.params || [])
      .filter((param) => !param.required && param.example)
      .map((param) => `${param.name}=${encodeURIComponent(param.example as string)}`)
      .join("&");

  const filteredGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return DEV_API_GROUPS;
    return DEV_API_GROUPS.map((group) => ({
      ...group,
      endpoints: group.endpoints.filter(
        (endpoint) =>
          endpoint.path.toLowerCase().includes(needle) ||
          endpoint.summary_en.toLowerCase().includes(needle) ||
          endpoint.summary_ar.includes(query.trim()),
      ),
    })).filter((group) => group.endpoints.length > 0);
  }, [query]);

  const handleCopyCurl = async () => {
    const done = await copyText(buildCurl(selected, docsOrigin, tryKey));
    if (done) toast.success(s.common.copied);
  };

  const handleTry = async () => {
    if (!tryKey.trim()) return;
    setTryBusy(true);
    setTryResult(null);
    setTryError(null);
    try {
      const resolvedPath = selected.path.replace(
        "{id}",
        selected.params?.find((param) => param.required)?.example || "id",
      );
      const queryString = filtersQuery(selected);
      const response = await fetch(`${tryBase}${resolvedPath}${queryString ? `?${queryString}` : ""}`, {
        headers: { authorization: `Bearer ${tryKey.trim()}` },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setTryError(`HTTP ${response.status} — ${body ? JSON.stringify(body) : response.statusText}`);
      } else {
        setTryResult(JSON.stringify(body, null, 2));
      }
    } catch (err) {
      setTryError((err as Error).message);
    } finally {
      setTryBusy(false);
    }
  };

  const paramLabel = (key: "name" | "type" | "required" | "description") => {
    const map = {
      name: s.docs.paramName,
      type: s.docs.paramType,
      required: s.docs.paramRequired,
      description: s.docs.paramDescription,
    };
    return map[key];
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{s.docs.title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{s.docs.description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {s.docs.baseUrl}:{" "}
            <code dir="ltr" className="rounded bg-muted px-1.5 py-0.5 font-mono tabular-nums">
              {docsOrigin}
              {API_BASE_PATH}
            </code>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadJsonFile("maxp-postman-collection.json", buildPostmanCollection(docsOrigin))}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            <span className="ms-1">{s.docs.downloadPostman}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadJsonFile("maxp-openapi.json", buildOpenApiDocument(docsOrigin))}
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            <span className="ms-1">{s.docs.downloadOpenApi}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-3">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={s.docs.searchPlaceholder}
              className="ps-8"
            />
          </div>
          <nav className="max-h-[520px] space-y-3 overflow-y-auto pe-1">
            {filteredGroups.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">{s.docs.noResults}</p>
            )}
            {filteredGroups.map((group) => (
              <div key={group.id}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {lang === "en" ? group.name_en : group.name_ar}
                </p>
                <ul className="space-y-0.5">
                  {group.endpoints.map((endpoint) => (
                    <li key={endpoint.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(endpoint.id);
                          setTryResult(null);
                          setTryError(null);
                        }}
                        className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-start text-sm transition-colors ${
                          selected.id === endpoint.id
                            ? "bg-muted text-foreground"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        }`}
                      >
                        <span className="font-mono text-[10px] font-semibold text-foreground/70">{endpoint.method}</span>
                        <span dir="ltr" className="truncate font-mono text-xs">
                          {endpoint.path}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 space-y-4 rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={methodBadgeClass(selected.method)}>
              {selected.method}
            </Badge>
            <code dir="ltr" className="font-mono text-sm font-medium text-foreground">
              {API_BASE_PATH}
              {selected.path}
            </code>
            {selected.scope && (
              <Badge variant="secondary" className="font-mono text-[10px]">
                {selected.scope}
              </Badge>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {lang === "en" ? selected.summary_en : selected.summary_ar}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              {lang === "en" ? selected.description_en : selected.description_ar}
            </p>
          </div>

          <div className="rounded-md border border-border bg-muted/40 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">cURL</p>
              <Button variant="ghost" size="sm" onClick={() => void handleCopyCurl()}>
                <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                <span className="ms-1 text-xs">{s.docs.copyCurl}</span>
              </Button>
            </div>
            <pre dir="ltr" className="mt-1 overflow-x-auto font-mono text-xs leading-relaxed text-foreground">
              {buildCurl(selected, docsOrigin, tryKey)}
            </pre>
          </div>

          {selected.params && selected.params.length > 0 && (
            <div className="overflow-hidden rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{paramLabel("name")}</TableHead>
                    <TableHead>{paramLabel("type")}</TableHead>
                    <TableHead>{paramLabel("required")}</TableHead>
                    <TableHead>{paramLabel("description")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selected.params.map((param) => (
                    <TableRow key={param.name}>
                      <TableCell>
                        <code dir="ltr" className="font-mono text-xs">
                          {param.name}
                        </code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{param.type}</TableCell>
                      <TableCell className="text-xs">
                        {param.required ? (
                          <Badge variant="secondary" className="text-[10px]">
                            {s.docs.required}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">{s.docs.optional}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground text-pretty">
                        {lang === "en" ? param.description_en : param.description_ar}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="rounded-md border border-border">
            <div className="border-b border-border px-2.5 py-2">
              <p className="text-xs font-medium text-muted-foreground">{s.docs.responseTitle}</p>
            </div>
            <pre dir="ltr" className="max-h-72 overflow-auto p-2.5 font-mono text-xs leading-relaxed text-foreground">
              {JSON.stringify(selected.responseExample, null, 2)}
            </pre>
          </div>

          <div className="space-y-2 rounded-md border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground">{s.docs.tryItHint}</p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[220px] flex-1 space-y-1">
                <Label htmlFor="dev-try-key" className="text-xs">
                  {s.docs.authHint}
                </Label>
                <Input
                  id="dev-try-key"
                  value={tryKey}
                  onChange={(event) => setTryKey(event.target.value)}
                  placeholder="mxp_live_…"
                  dir="ltr"
                  className="font-mono text-xs"
                />
              </div>
              <Button size="sm" onClick={() => void handleTry()} disabled={tryBusy || !tryKey.trim()}>
                <PlayIcon className="h-4 w-4" />
                <span className="ms-1">{s.docs.tryIt}</span>
              </Button>
            </div>
            {tryError && (
              <pre dir="ltr" className="overflow-x-auto rounded bg-destructive/10 p-2 font-mono text-xs text-destructive">
                {tryError}
              </pre>
            )}
            {tryResult && (
              <pre dir="ltr" className="max-h-64 overflow-auto rounded bg-muted p-2 font-mono text-xs text-foreground">
                {tryResult}
              </pre>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ApiDocsTab;
