import React, { useState, useEffect } from "react";
import { Building2 } from "lucide-react";
import { apiClient } from "../../services/apiClient";
import AIChatPage from "../admin/AIChatPage";

interface Company {
  id: string;
  name: string;
}

const SuperAdminAIChatPage: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await apiClient.get("/super-admin/companies/quick-list");
        if (data.success) setCompanies(data.companies);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="flex flex-col" style={{ height: "calc(100dvh - 64px)" }}>
      {/* Company selector bar */}
      <div className="flex shrink-0 items-center gap-3 border-b bg-card px-6 py-3">
        <Building2 className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">الشركة:</span>
        {loading ? (
          <span className="text-sm text-muted-foreground">جاري التحميل...</span>
        ) : (
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">اختر شركة...</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {selectedCompanyId ? (
          <AIChatPage key={selectedCompanyId} companyId={selectedCompanyId} fullHeight />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            اختر شركة لعرض محادثات الذكاء الاصطناعي
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminAIChatPage;
