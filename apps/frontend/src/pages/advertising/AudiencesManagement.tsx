import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, Eye, Users, Sparkles, RotateCcw, Search, CheckCircle2, Clock, Layers } from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { facebookAdsService, FacebookCustomAudience, FacebookLookalikeAudience } from "../../services/facebookAdsService";
import FacebookAdsModuleNav from "../../components/advertising/FacebookAdsModuleNav";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";

const AudiencesManagement: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"custom" | "lookalike">("custom");
  const [customAudiences, setCustomAudiences] = useState<FacebookCustomAudience[]>([]);
  const [lookalikeAudiences, setLookalikeAudiences] = useState<FacebookLookalikeAudience[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const loadAudiences = async () => {
    try {
      setLoading(true);
      if (activeTab === "custom") {
        const data = await facebookAdsService.getCustomAudiences();
        setCustomAudiences(data || []);
      } else {
        const data = await facebookAdsService.getLookalikeAudiences();
        setLookalikeAudiences(data || []);
      }
    } catch (error: any) {
      console.error("Error loading audiences:", error);
      toast.error(error?.response?.data?.error || "فشل في تحميل الجماهير");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAudiences(); }, [activeTab]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAudiences();
    setRefreshing(false);
    tToast.success("AudiencesManagement.success_update_1209");
  };

  const handleDeleteCustomAudience = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("هل أنت متأكد من حذف هذا الجمهور؟")) return;
    try {
      await facebookAdsService.deleteCustomAudience(id);
      tToast.success("AudiencesManagement.success_delete_e963");
      await loadAudiences();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "فشل في حذف الجمهور");
    }
  };

  const getAudienceTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      CUSTOMER_LIST: "قائمة عملاء",
      WEBSITE: "زوار الموقع",
      ENGAGEMENT: "المتفاعلين",
      APP_ACTIVITY: "نشاط التطبيق",
      VIDEO_VIEW: "مشاهدي الفيديو",
    };
    return types[type] || type || "مخصص";
  };

  const filteredCustom = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customAudiences.filter((a) => !q || a.name.toLowerCase().includes(q) || (a.description && a.description.toLowerCase().includes(q)));
  }, [customAudiences, searchQuery]);

  const filteredLookalike = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return lookalikeAudiences.filter((a) => !q || a.name.toLowerCase().includes(q) || (a.description && a.description.toLowerCase().includes(q)));
  }, [lookalikeAudiences, searchQuery]);

  const stats = useMemo(() => {
    const customCount = customAudiences.length;
    const lookalikeCount = lookalikeAudiences.length;
    const totalCount = customCount + lookalikeCount;
    const totalReach = customAudiences.reduce((acc, a) => acc + (a.audienceSize || 0), 0) +
      lookalikeAudiences.reduce((acc, a) => acc + (a.audienceSize || 0), 0);
    return { total: totalCount, customCount, lookalikeCount, totalReach };
  }, [customAudiences, lookalikeAudiences]);

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center h-96" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground font-mono">جاري مزامنة بيانات جماهير فيسبوك...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6" dir="rtl">
      <FacebookAdsModuleNav />

      {/* Top Chassis Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">إدارة الجماهير واستهداف الحملات</h1>
            <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono tabular-nums bg-muted/40 border-border/70 text-muted-foreground">
              {activeTab === "custom" ? filteredCustom.length : filteredLookalike.length} شريحة
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            إدارة شرائح العملاء والجماهير المشابهة لرفع دقة الاستهداف وخفض تكلفة الشراء
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="h-8 gap-1.5 text-xs border-border/70">
            <RotateCcw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} /> تحديث
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(activeTab === "custom" ? "/advertising/facebook-ads/audiences/custom/create" : "/advertising/facebook-ads/audiences/lookalike/create")}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            {activeTab === "custom" ? "جمهور مخصص جديد" : "جمهور مشابه جديد"}
          </Button>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>إجمالي الشرائح</span>
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">{stats.total}</div>
        </div>
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>جماهير مخصصة</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-blue-500">{stats.customCount}</div>
        </div>
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>جماهير مشابهة</span>
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-purple-500">{stats.lookalikeCount}</div>
        </div>
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>الحجم التقديري الإجمالي</span>
            <Layers className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">
            {stats.totalReach > 0 ? stats.totalReach.toLocaleString() : "قيد الحساب"}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 p-1 rounded-lg border border-border/60 bg-muted/20 w-fit">
          <button
            onClick={() => setActiveTab("custom")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === "custom" ? "bg-card text-foreground shadow-sm border border-border/60" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            الجماهير المخصصة ({customAudiences.length})
          </button>
          <button
            onClick={() => setActiveTab("lookalike")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              activeTab === "lookalike" ? "bg-card text-foreground shadow-sm border border-border/60" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            الجماهير المشابهة ({lookalikeAudiences.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="بحث في أسماء الجماهير..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pr-8 text-xs border-border/70 bg-card" />
        </div>
      </div>

      {/* Audiences Single Surface Table */}
      <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
        {activeTab === "custom" ? (
          filteredCustom.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <Users className="h-8 w-8 mx-auto text-muted-foreground/30" />
              <p className="font-semibold text-foreground">لا توجد جماهير مخصصة مسجلة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/20 border-b border-border/70 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">اسم الجمهور</th>
                    <th className="px-4 py-3 font-semibold">المصدر / النوع</th>
                    <th className="px-4 py-3 font-semibold">الحجم التقريبي</th>
                    <th className="px-4 py-3 font-semibold">الحالة</th>
                    <th className="px-4 py-3 font-semibold">تاريخ الإنشاء</th>
                    <th className="px-4 py-3 text-left font-semibold">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredCustom.map((aud) => (
                    <tr key={aud.id} onClick={() => navigate(`/advertising/facebook-ads/audiences/custom/${aud.id}`)} className="hover:bg-muted/30 transition-colors cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground hover:text-primary transition-colors">{aud.name}</div>
                        {aud.description && <div className="text-[11px] text-muted-foreground truncate max-w-xs mt-0.5">{aud.description}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-medium bg-blue-500/10 text-blue-500 border-blue-500/20">
                          {getAudienceTypeLabel(aud.audienceType)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-foreground">
                        {aud.audienceSize ? aud.audienceSize.toLocaleString() : "قيد المعالجة"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${aud.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-muted text-muted-foreground border-border/60"}`}>
                          {aud.status === "ACTIVE" ? "نشط ومتاح" : "معلق"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{new Date(aud.createdAt).toLocaleDateString("ar-EG")}</td>
                      <td className="px-4 py-3 text-left">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => navigate(`/advertising/facebook-ads/audiences/custom/${aud.id}`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600" onClick={(e) => handleDeleteCustomAudience(aud.id, e)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          filteredLookalike.length === 0 ? (
            <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/30" />
              <p className="font-semibold text-foreground">لا توجد جماهير مشابهة مسجلة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-muted/20 border-b border-border/70 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">اسم الجمهور</th>
                    <th className="px-4 py-3 font-semibold">المصدر الأساسي</th>
                    <th className="px-4 py-3 font-semibold">نسبة الشبه</th>
                    <th className="px-4 py-3 font-semibold">الحجم التقريبي</th>
                    <th className="px-4 py-3 font-semibold">الحالة</th>
                    <th className="px-4 py-3 font-semibold">الإنشاء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredLookalike.map((aud) => (
                    <tr key={aud.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-foreground">{aud.name}</div>
                        {aud.description && <div className="text-[11px] text-muted-foreground truncate max-w-xs mt-0.5">{aud.description}</div>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{aud.sourceAudience?.name || "المصدر المحدد"}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono bg-purple-500/10 text-purple-500 border-purple-500/20">
                          {aud.ratio || 1}%
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums text-foreground">
                        {aud.audienceSize ? aud.audienceSize.toLocaleString() : "قيد المعالجة"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${aud.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-muted text-muted-foreground border-border/60"}`}>
                          {aud.status === "ACTIVE" ? "نشط" : "معلق"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{new Date(aud.createdAt).toLocaleDateString("ar-EG")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AudiencesManagement;
