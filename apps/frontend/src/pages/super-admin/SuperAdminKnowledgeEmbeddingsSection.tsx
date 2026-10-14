import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { BookOpen, RefreshCw, Play, CheckCircle, AlertCircle, Search } from "lucide-react";
import { cn } from "../../lib/utils";
import { JobCard, JobState } from "./SuperAdminEmbeddingsJobCard";

export interface KnowledgeCompanyStat {
  company_id: string;
  total_faqs: number;
  total_policies: number;
  embedded_faqs: number;
  embedded_policies: number;
  missing_faqs: number;
  missing_policies: number;
}

export interface KnowledgeStatusData {
  job: JobState;
  summary: {
    total_faqs: number;
    total_policies: number;
    embedded_faqs: number;
    embedded_policies: number;
    missing_faqs: number;
    missing_policies: number;
  };
  companies: KnowledgeCompanyStat[];
}

interface KnowledgeSectionProps {
  kData: KnowledgeStatusData | null;
  kIsRunning: boolean;
  kSyncing: boolean;
  companyMap: Record<string, string>;
  onTriggerSync: (companyId?: string) => void;
}

export function SuperAdminKnowledgeEmbeddingsSection({
  kData,
  kIsRunning,
  kSyncing,
  companyMap,
  onTriggerSync,
}: KnowledgeSectionProps) {
  const [knowledgeSearch, setKnowledgeSearch] = useState("");

  const kJob = kData?.job;
  const kSummary = kData?.summary;
  const kCompanies = kData?.companies ?? [];

  const filteredKCompanies = kCompanies.filter((c) => {
    if (!knowledgeSearch.trim()) return true;
    const q = knowledgeSearch.trim().toLowerCase();
    return (companyMap[c.company_id] || "").toLowerCase().includes(q) || c.company_id.toLowerCase().includes(q);
  });

  return (
    <div className="rounded-lg border border-border/70 bg-card p-4 space-y-3.5">
      <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-purple-600 dark:text-purple-400" />
          <h2 className="text-xs font-semibold text-foreground">تضمينات المعرفة والسياسات (Knowledge Embeddings)</h2>
        </div>
        <Button
          size="sm"
          onClick={() => onTriggerSync()}
          disabled={kIsRunning || kSyncing}
          className="h-7 text-xs font-mono gap-1.5 active:scale-[0.98]"
        >
          {kIsRunning ? (
            <>
              <RefreshCw className="size-3 animate-spin" />
              <span>جارٍ المزامنة...</span>
            </>
          ) : (
            <>
              <Play className="size-3" />
              <span>مزامنة المعرفة</span>
            </>
          )}
        </Button>
      </div>

      <JobCard job={kJob} scheduleHour={3} scheduleMinute={30} />

      {kSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded-md border border-border/60 bg-muted/20 p-2">
            <p className="text-base font-bold font-mono tabular-nums text-foreground">{kSummary.total_faqs.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">إجمالي الأسئلة</p>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/20 p-2">
            <p className="text-base font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{kSummary.embedded_faqs.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">أسئلة مُضَمَّنة</p>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/20 p-2">
            <p className="text-base font-bold font-mono tabular-nums text-foreground">{kSummary.total_policies.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">إجمالي السياسات</p>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/20 p-2">
            <p className="text-base font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{kSummary.embedded_policies.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">سياسات مُضَمَّنة</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث باسم الشركة أو المعرف..."
              value={knowledgeSearch}
              onChange={(e) => setKnowledgeSearch(e.target.value)}
              className="w-full h-7 rounded border border-border/70 bg-background/50 pr-7 pl-3 text-xs font-mono outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-border/70">
            {filteredKCompanies.length} / {kCompanies.length} شركة
          </Badge>
        </div>

        <div className="rounded border border-border/60 divide-y divide-border/40 overflow-hidden bg-background/30 text-xs">
          {filteredKCompanies.length === 0 ? (
            <div className="py-6 text-center text-xs font-mono text-muted-foreground">
              لا توجد بيانات للمعرفة
            </div>
          ) : (
            filteredKCompanies.map((c) => {
              const totalK = c.total_faqs + c.total_policies;
              const embeddedK = c.embedded_faqs + c.embedded_policies;
              const missingK = c.missing_faqs + c.missing_policies;
              const pct = totalK > 0 ? Math.round((embeddedK / totalK) * 100) : 100;
              const name = companyMap[c.company_id];
              return (
                <div key={c.company_id} className="p-2.5 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                  <div className="text-muted-foreground">
                    {missingK === 0 ? (
                      <CheckCircle className="size-3.5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="size-3.5 text-amber-500" />
                    )}
                  </div>
                  <div className="w-44 shrink-0">
                    {name ? (
                      <p className="text-xs font-medium text-foreground truncate">{name}</p>
                    ) : (
                      <code className="text-[10px] text-muted-foreground font-mono truncate block">{c.company_id}</code>
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                      <span>
                        أسئلة: {c.embedded_faqs}/{c.total_faqs} | سياسات: {c.embedded_policies}/{c.total_policies}
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full transition-all rounded-full", pct === 100 ? "bg-emerald-500" : pct >= 70 ? "bg-purple-500" : "bg-amber-500")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  {missingK > 0 && (
                    <Badge variant="outline" className="text-[10px] font-mono border-amber-500/30 text-amber-600 bg-amber-500/10 shrink-0">
                      {missingK} ناقص
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant={missingK > 0 ? "default" : "outline"}
                    className="shrink-0 h-6 text-[10px] font-mono gap-1 px-2 active:scale-[0.98]"
                    disabled={kIsRunning || kSyncing}
                    onClick={() => onTriggerSync(c.company_id)}
                  >
                    <Play className="size-2.5" />
                    <span>مزامنة</span>
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
