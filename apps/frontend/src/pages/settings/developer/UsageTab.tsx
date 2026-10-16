import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDevStrings } from "./devI18n";
import { devFetch } from "./devApi";
import { DevUsageSummary, formatNumber } from "./devTypes";

const UsageTab: React.FC = () => {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const s = useMemo(() => getDevStrings(lang), [lang]);

  const [days, setDays] = useState("30");
  const [usage, setUsage] = useState<DevUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await devFetch<{ usage: DevUsageSummary }>(`/usage?days=${days}`);
      setUsage(response.usage);
    } catch (err) {
      setError((err as Error).message || s.common.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [days, s.common.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxDaily = useMemo(
    () => Math.max(1, ...(usage?.daily || []).map((row) => row.count)),
    [usage],
  );

  const stats = [
    { label: s.usage.totalRequests, value: usage?.totals.requests ?? 0, tone: "text-foreground" },
    { label: s.usage.okRequests, value: usage?.totals.ok ?? 0, tone: "text-emerald-600" },
    { label: s.usage.errorRequests, value: usage?.totals.errors ?? 0, tone: "text-destructive" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">{s.usage.title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{s.usage.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{s.usage.window}</span>
          <Select
            value={days}
            onValueChange={(value) => {
              if (value) setDays(value);
            }}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{s.usage.last7}</SelectItem>
              <SelectItem value="30">{s.usage.last30}</SelectItem>
              <SelectItem value="90">{s.usage.last90}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{s.common.loading}</p>
      ) : error ? (
        <div className="py-10 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
            {s.common.retry}
          </Button>
        </div>
      ) : !usage || usage.totals.requests === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          {s.usage.empty}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`mt-1 text-2xl font-semibold tabular-nums ${stat.tone}`}>
                  {formatNumber(stat.value)}
                </p>
              </div>
            ))}
          </div>

          <section className="rounded-lg border border-border p-3">
            <h3 className="text-sm font-semibold text-foreground">{s.usage.dailyTitle}</h3>
            <ul className="mt-3 space-y-1.5">
              {usage.daily.map((row) => (
                <li key={row.date} className="flex items-center gap-3">
                  <span dir="ltr" className="w-24 shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {row.date}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-foreground/70"
                      style={{ width: `${Math.max(4, Math.round((row.count / maxDaily) * 100))}%` }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-end text-xs tabular-nums text-foreground">
                    {formatNumber(row.count)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="rounded-lg border border-border p-3">
              <h3 className="text-sm font-semibold text-foreground">{s.usage.byKeyTitle}</h3>
              <ul className="mt-2 divide-y divide-border">
                {usage.byCredential.map((row) => (
                  <li key={row.credentialId} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-foreground">{row.name}</p>
                      {row.maskedKey && (
                        <code dir="ltr" className="font-mono text-[11px] tabular-nums text-muted-foreground">
                          {row.maskedKey}
                        </code>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {row.credentialType && (
                        <Badge variant="outline" className="text-[10px]">
                          {row.credentialType}
                        </Badge>
                      )}
                      <span className="text-sm tabular-nums text-foreground">{formatNumber(row.count)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-border p-3">
              <h3 className="text-sm font-semibold text-foreground">{s.usage.topEndpointsTitle}</h3>
              <ul className="mt-2 divide-y divide-border">
                {usage.topEndpoints.map((row) => (
                  <li key={row.label} className="flex items-center justify-between gap-3 py-2">
                    <code dir="ltr" className="truncate font-mono text-xs text-foreground">
                      {row.label}
                    </code>
                    <span className="text-sm tabular-nums text-foreground">{formatNumber(row.count)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageTab;
