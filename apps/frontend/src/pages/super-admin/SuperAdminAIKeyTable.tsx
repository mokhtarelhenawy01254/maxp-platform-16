import React from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Copy, FlaskConical, Zap, Info, Trash2, KeyRound, ArrowUp, ArrowDown, ArrowUpDown,
} from "lucide-react";
import type { AiKey } from "../../types/ai-admin";

export type SortKey = "name" | "provider" | "key_type" | "is_active" | "current_usage" | "created_at";
export type SortDir = "asc" | "desc";
export interface SortConfig { key: SortKey; dir: SortDir; }

export function sortKeys(keys: AiKey[], sort: SortConfig | null): AiKey[] {
  if (!sort) return keys;
  const k = sort.key;
  const d = sort.dir === "asc" ? 1 : -1;
  return [...keys].sort((a, b) => {
    let av: unknown = a[k], bv: unknown = b[k];
    if (k === "is_active") { av = a.is_active ? 1 : 0; bv = b.is_active ? 1 : 0; }
    if (k === "current_usage") { av = a.current_usage ?? 0; bv = b.current_usage ?? 0; }
    if (av == null) return 1; if (bv == null) return -1;
    const cmp = typeof av === "string" ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number);
    return cmp * d;
  });
}

export function SortHeader({ label, sortKey, sort, onSort }: { label: string; sortKey: SortKey; sort: SortConfig | null; onSort: (k: SortKey) => void }) {
  const active = sort?.key === sortKey;
  return (
    <TableHead className="cursor-pointer select-none whitespace-nowrap text-xs text-muted-foreground" onClick={() => onSort(sortKey)}>
      <span className="flex items-center gap-1">
        {label}
        {active && sort ? (sort.dir === "asc" ? <ArrowUp className="size-3 text-primary" /> : <ArrowDown className="size-3 text-primary" />) : <ArrowUpDown className="size-3 text-muted-foreground/40" />}
      </span>
    </TableHead>
  );
}

interface KeyTableProps {
  sortedKeys: AiKey[];
  allSelected: boolean;
  selectedIds: Set<string>;
  sort: SortConfig | null;
  onSort: (k: SortKey) => void;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onToggleStatus: (k: AiKey) => void;
  onCopyKey: (apiKey?: string, masked?: string) => void;
  onTest: (k: AiKey) => void;
  onEdit: (k: AiKey) => void;
  onDetail: (k: AiKey) => void;
  onDelete: (k: AiKey) => void;
  usagePercent: (k: AiKey) => number;
  usageBarColor: (pct: number) => string;
}

export function KeyManagerTable({
  sortedKeys,
  allSelected,
  selectedIds,
  sort,
  onSort,
  onToggleSelect,
  onToggleSelectAll,
  onToggleStatus,
  onCopyKey,
  onTest,
  onEdit,
  onDetail,
  onDelete,
  usagePercent,
  usageBarColor,
}: KeyTableProps) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block rounded-lg border border-border/70 bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-b border-border/70 hover:bg-transparent">
              <TableHead className="w-10">
                <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} className="size-3.5 rounded border-border" />
              </TableHead>
              <SortHeader label="اسم المفتاح" sortKey="name" sort={sort} onSort={onSort} />
              <SortHeader label="المزود" sortKey="provider" sort={sort} onSort={onSort} />
              <TableHead className="text-xs text-muted-foreground">رمز المفتاح</TableHead>
              <SortHeader label="النوع" sortKey="key_type" sort={sort} onSort={onSort} />
              <SortHeader label="الحالة" sortKey="is_active" sort={sort} onSort={onSort} />
              <SortHeader label="الاستهلاك" sortKey="current_usage" sort={sort} onSort={onSort} />
              <TableHead className="text-center text-xs text-muted-foreground">الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedKeys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <KeyRound className="size-7 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">لا توجد مفاتيح مطابقة لمعايير البحث</p>
                </TableCell>
              </TableRow>
            ) : (
              sortedKeys.map((k) => {
                const up = usagePercent(k);
                return (
                  <TableRow
                    key={k.id}
                    className="border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors text-xs"
                    onClick={() => onDetail(k)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(k.id)} onChange={() => onToggleSelect(k.id)} className="size-3.5 rounded border-border" />
                    </TableCell>
                    <TableCell className="font-medium text-foreground">{k.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-mono border-border/70 bg-muted/20">
                        {k.provider}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-[11px] text-muted-foreground" dir="ltr">
                        {k.api_key_masked || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        k.key_type === "CENTRAL"
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                          : "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                      }`}>
                        {k.key_type === "CENTRAL" ? "مركزي" : "شركة"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleStatus(k); }}
                        className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                          k.is_active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
                        }`}
                      >
                        {k.is_active ? "نشط" : "متوقف"}
                      </button>
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-300 ${usageBarColor(up)}`} style={{ width: `${Math.min(up, 100)}%` }} />
                        </div>
                        <span className="text-[10px] font-mono tabular-nums text-muted-foreground">{up}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="size-7" title="نسخ" onClick={() => onCopyKey(k.api_key, k.api_key_masked)}>
                          <Copy className="size-3.5 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7" title="اختبار" onClick={() => onTest(k)}>
                          <FlaskConical className="size-3.5 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7" title="تعديل" onClick={() => onEdit(k)}>
                          <Zap className="size-3.5 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7" title="تفاصيل" onClick={() => onDetail(k)}>
                          <Info className="size-3.5 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" className="size-7 hover:bg-destructive/10 hover:text-destructive" title="حذف" onClick={() => onDelete(k)}>
                          <Trash2 className="size-3.5 text-destructive/70" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile list */}
      <div className="sm:hidden space-y-2">
        {sortedKeys.length === 0 ? (
          <div className="text-center py-8 p-4 rounded-lg border border-border/70 bg-card">
            <KeyRound className="size-6 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">لا توجد مفاتيح مطابقة</p>
          </div>
        ) : (
          sortedKeys.map((k) => {
            const up = usagePercent(k);
            return (
              <Card key={k.id} className="border border-border/70 bg-card" onClick={() => onDetail(k)}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-foreground">{k.name}</p>
                      <span className="text-[10px] text-muted-foreground">{k.provider} · {k.key_type === "CENTRAL" ? "مركزي" : "شركة"}</span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleStatus(k); }}
                      className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                        k.is_active ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"
                      }`}
                    >
                      {k.is_active ? "نشط" : "متوقف"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${usageBarColor(up)}`} style={{ width: `${Math.min(up, 100)}%` }} />
                    </div>
                    <span className="text-[10px] font-mono tabular-nums text-muted-foreground">{k.current_usage}/{k.max_requests_per_day}</span>
                  </div>
                  <div className="flex items-center justify-end gap-1 pt-1 border-t border-border/60" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => onCopyKey(k.api_key, k.api_key_masked)}><Copy className="size-3.5 text-muted-foreground" /></Button>
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => onTest(k)}><FlaskConical className="size-3.5 text-muted-foreground" /></Button>
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => onEdit(k)}><Zap className="size-3.5 text-muted-foreground" /></Button>
                    <Button size="icon" variant="ghost" className="size-7 text-destructive hover:bg-destructive/10" onClick={() => onDelete(k)}><Trash2 className="size-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
