import React, { useState, useEffect } from "react";
import { Building2, MessageSquare, RefreshCw, ShieldCheck } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import AIChatPage from "../admin/AIChatPage";
import i18n from "../../i18n";

interface Company {
  id: string;
  name: string;
}

const FALLBACK_COMPANIES: Company[] = [
  { id: "comp-01", name: "مؤسسة الأناقة للأزياء والملابس" },
  { id: "comp-02", name: "معمل الدقة الرقمي لطب الأسنان" },
  { id: "comp-03", name: "سلسلة فروع الأوائل للتجزئة" },
  { id: "comp-04", name: "أكاديمية المستقبل للغات والتدريب" },
];

const SuperAdminAIChatPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>(FALLBACK_COMPANIES);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("comp-01");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await apiClient.get("/super-admin/companies/quick-list");
        if (data.success && Array.isArray(data.companies) && data.companies.length > 0) {
          setCompanies(data.companies);
          setSelectedCompanyId(data.companies[0].id);
        }
      } catch {
        // Fallback active
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden font-sans" dir={i18n.dir()}>
      {/* Single-Surface Top Control Bar */}
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-card px-4 py-2.5 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg border border-border/80 bg-muted/20 flex items-center justify-center text-foreground shrink-0 shadow-2xs">
            <MessageSquare className="size-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-foreground">
                محادثات الذكاء الاصطناعي المركزية
              </h1>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                Multi-Tenant Oversight
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              معاينة وتدقيق جلسات شات الذكاء الاصطناعي والمساعدين لكل شركة ومستأجر
            </p>
          </div>
        </div>

        {/* Company Switcher Pill */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/70 bg-muted/20">
            <Building2 className="size-3.5 text-primary" />
            <span className="text-[11px] text-muted-foreground">الشركة المستهدفة:</span>
            {loading ? (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <RefreshCw className="size-3 animate-spin text-primary" />
                <span>جاري التحميل...</span>
              </span>
            ) : (
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="h-7 rounded border-none bg-transparent px-1 text-xs font-semibold text-foreground focus:outline-none focus:ring-0 cursor-pointer"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id} className="bg-card text-foreground">
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {activeCompany && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              ID: {activeCompany.id}
            </span>
          )}
        </div>
      </div>

      {/* Embedded Chat Surface */}
      <div className="flex-1 min-h-0 overflow-hidden bg-background">
        {selectedCompanyId ? (
          <AIChatPage key={selectedCompanyId} companyId={selectedCompanyId} fullHeight />
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-muted-foreground font-mono text-xs space-y-2">
            <Building2 className="size-8 text-muted-foreground/40" />
            <span>يرجى اختيار شركة لعرض ومتابعة محادثات الذكاء الاصطناعي</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminAIChatPage;
