import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Play, CheckCircle, ChevronDown, ChevronRight, Info, Search } from "lucide-react";
import { cn } from "../../lib/utils";

export interface CompanyStat {
  company_id: string;
  total: number;
  embedded: number;
  missing: number;
}

export interface MissingProduct {
  id: string;
  name: string;
  sku: string;
  company_id: string;
}

interface CompanyListProps {
  companies: CompanyStat[];
  companyMap: Record<string, string>;
  missingByCompany: Record<string, MissingProduct[]>;
  isRunning: boolean;
  syncing: string | null;
  onTriggerSync: (companyId?: string) => void;
}

export function SuperAdminProductEmbeddingsCompanyList({
  companies,
  companyMap,
  missingByCompany,
  isRunning,
  syncing,
  onTriggerSync,
}: CompanyListProps) {
  const [productSearch, setProductSearch] = useState("");
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

  const toggleCompany = (id: string) => {
    setExpandedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredCompanies = companies.filter((c) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.trim().toLowerCase();
    return (companyMap[c.company_id] || "").toLowerCase().includes(q) || c.company_id.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث باسم الشركة أو المعرف..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="w-full h-7 rounded border border-border/70 bg-background/50 pr-7 pl-3 text-xs font-mono outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Badge variant="outline" className="text-[10px] font-mono border-border/70">
          {filteredCompanies.length} / {companies.length} شركة
        </Badge>
      </div>

      <div className="rounded border border-border/60 divide-y divide-border/40 overflow-hidden bg-background/30 text-xs">
        {filteredCompanies.length === 0 ? (
          <div className="py-6 text-center text-xs font-mono text-muted-foreground">
            لا توجد شركات مطابقة
          </div>
        ) : (
          filteredCompanies.map((c) => {
            const pct = c.total > 0 ? Math.round((c.embedded / c.total) * 100) : 100;
            const isExpanded = expandedCompanies.has(c.company_id);
            const companyMissing = missingByCompany[c.company_id] ?? [];
            const name = companyMap[c.company_id];
            return (
              <div key={c.company_id}>
                <div className="p-2.5 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                  <button
                    onClick={() => toggleCompany(c.company_id)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    disabled={c.missing === 0}
                  >
                    {c.missing > 0
                      ? (isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />)
                      : <CheckCircle className="size-3.5 text-emerald-500" />
                    }
                  </button>
                  <div className="w-44 shrink-0">
                    {name ? (
                      <p className="text-xs font-medium text-foreground truncate">{name}</p>
                    ) : (
                      <code className="text-[10px] text-muted-foreground font-mono truncate block">{c.company_id}</code>
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                      <span>{c.embedded}/{c.total}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full transition-all rounded-full", pct === 100 ? "bg-emerald-500" : pct >= 70 ? "bg-blue-500" : "bg-amber-500")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {c.missing > 0 && (
                    <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 bg-amber-500/10 shrink-0">
                      {c.missing} ناقص
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant={c.missing > 0 ? "default" : "outline"}
                    className="shrink-0 h-6 text-[10px] font-mono gap-1 px-2 active:scale-[0.98]"
                    disabled={isRunning || syncing !== null}
                    onClick={() => onTriggerSync(c.company_id)}
                  >
                    <Play className="size-2.5" />
                    <span>مزامنة</span>
                  </Button>
                </div>
                {isExpanded && companyMissing.length > 0 && (
                  <div className="bg-amber-500/5 border-t border-amber-500/20 px-8 py-2 space-y-1">
                    <p className="text-[11px] text-muted-foreground font-medium mb-1.5 flex items-center gap-1">
                      <Info className="size-3" />
                      المنتجات غير المُضَمَّنة ({companyMissing.length})
                    </p>
                    {companyMissing.slice(0, 10).map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-xs py-0.5 font-mono">
                        <span className="text-foreground font-medium">{p.name}</span>
                        {p.sku && <code className="text-muted-foreground text-[10px]">{p.sku}</code>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
