import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  Play,
  Image as ImageIcon,
  Search,
  RotateCcw,
  Sparkles,
  Layers,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Clock,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import { apiClient } from "../../services/apiClient";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";

interface OverlayCampaign {
  id: string;
  name: string;
  overlayImage: string;
  status: string;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  _count: { products: number };
}

const statusMap: Record<string, { label: string; class: string }> = {
  ACTIVE: { label: "نشط", class: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  SCHEDULED: { label: "مجدول", class: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  DRAFT: { label: "مسودة", class: "bg-muted text-muted-foreground border-border/60" },
  PAUSED: { label: "موقف", class: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  EXPIRED: { label: "منتهي", class: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
};

const OverlayCampaigns: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<OverlayCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", overlayImage: "", startAt: "", endAt: "" });

  const load = async () => {
    try {
      setLoading(true);
      const { data } = await apiClient.get("/overlay-campaigns");
      setCampaigns(data.data || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل في تحميل الحملات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.overlayImage) {
      tToast.error("OverlayCampaigns.msg_47da");
      return;
    }
    try {
      await apiClient.post("/overlay-campaigns", form);
      tToast.success("OverlayCampaigns.success_create_85f3");
      setShowForm(false);
      setForm({ name: "", overlayImage: "", startAt: "", endAt: "" });
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل في الإنشاء");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("حذف الحملة؟")) return;
    try {
      await apiClient.delete(`/overlay-campaigns/${id}`);
      tToast.success("OverlayCampaigns.msg_1d0b");
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل في الحذف");
    }
  };

  const handleApply = async (id: string) => {
    try {
      const { data } = await apiClient.post(`/overlay-campaigns/${id}/apply`);
      if (data.data?.processing) {
        tToast.success("OverlayCampaigns.msg_02a0");
      } else {
        toast.success(`تم تطبيق الإطار على ${data.data?.results?.length || 0} منتج`);
      }
      setTimeout(() => load(), 2000);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل في التطبيق");
    }
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      const matchStatus = selectedStatus === "ALL" || c.status === selectedStatus;
      const q = searchQuery.trim().toLowerCase();
      return matchStatus && (!q || c.name.toLowerCase().includes(q));
    });
  }, [campaigns, selectedStatus, searchQuery]);

  const stats = useMemo(() => ({
    total: campaigns.length,
    active: campaigns.filter((c) => c.status === "ACTIVE").length,
    scheduled: campaigns.filter((c) => c.status === "SCHEDULED").length,
    totalProducts: campaigns.reduce((acc, c) => acc + (c._count?.products || 0), 0),
  }), [campaigns]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground font-mono">جاري تحميل حملات إطارات المنتجات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6" dir="rtl">
      {/* Top Chassis Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">حملات إطارات وشارات الصور</h1>
            <Badge variant="outline" className="text-xs px-2 py-0.5 font-mono tabular-nums bg-muted/40 border-border/70 text-muted-foreground">
              {filteredCampaigns.length} حملة
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            إضافة إطارات وشارات تسويقية تلقائية على صور الكتالوجات وإعلانات فيسبوك
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={load} className="h-8 gap-1.5 text-xs border-border/70">
            <RotateCcw className="h-3.5 w-3.5" /> تحديث
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)} className="h-8 gap-1.5 text-xs font-medium">
            <Plus className="h-3.5 w-3.5" /> حملة جديدة
          </Button>
        </div>
      </div>

      {/* Telemetry Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>إجمالي الحملات</span>
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">{stats.total}</div>
        </div>
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>حملات نشطة</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-500">{stats.active}</div>
        </div>
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>مجدولة للمستقبل</span>
            <Clock className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-blue-500">{stats.scheduled}</div>
        </div>
        <div className="p-3 rounded-lg border border-border/70 bg-card">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>المنتجات المشمولة</span>
            <Package className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-foreground">{stats.totalProducts.toLocaleString()}</div>
        </div>
      </div>

      {/* Creation Drawer */}
      {showForm && (
        <div className="p-4 rounded-lg border border-border/70 bg-card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <h2 className="text-xs font-bold text-foreground">إنشاء حملة إطار جديدة</h2>
            <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="h-6 text-xs text-muted-foreground">إلغاء</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-muted-foreground mb-1">اسم الحملة</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="مثال: عروض الجمعة البيضاء" className="h-8 text-xs border-border/70" />
            </div>
            <div>
              <label className="block text-muted-foreground mb-1">رابط صورة الإطار (PNG شفاف)</label>
              <Input value={form.overlayImage} onChange={(e) => setForm({ ...form, overlayImage: e.target.value })} placeholder="/uploads/products/frame.png" className="h-8 text-xs border-border/70 font-mono" />
            </div>
            <div>
              <label className="block text-muted-foreground mb-1">تاريخ البدء</label>
              <Input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} className="h-8 text-xs border-border/70 font-mono" />
            </div>
            <div>
              <label className="block text-muted-foreground mb-1">تاريخ الانتهاء</label>
              <Input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} className="h-8 text-xs border-border/70 font-mono" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button size="sm" onClick={handleCreate} className="h-8 text-xs">حفظ ونشر الحملة</Button>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg border border-border/60 bg-muted/20 w-fit">
          {[
            { key: "ALL", label: "الكل" },
            { key: "ACTIVE", label: "نشطة" },
            { key: "SCHEDULED", label: "مجدولة" },
            { key: "DRAFT", label: "مسودة" },
            { key: "EXPIRED", label: "منتهية" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatus(tab.key)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                selectedStatus === tab.key ? "bg-card text-foreground shadow-sm border border-border/60" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="بحث في حملات الإطارات..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pr-8 text-xs border-border/70 bg-card" />
        </div>
      </div>

      {/* Campaigns Single Surface */}
      <div className="rounded-lg border border-border/70 bg-card overflow-hidden">
        <div className="p-3 px-4 bg-muted/20 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">سجل حملات الإطارات</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono tabular-nums">{filteredCampaigns.length} حملة</span>
        </div>

        {filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center text-xs text-muted-foreground space-y-2">
            <ImageIcon className="h-8 w-8 mx-auto text-muted-foreground/30" />
            <p className="font-semibold text-foreground">لا توجد حملات إطارات مطابقة</p>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredCampaigns.map((c) => {
              const status = statusMap[c.status] || { label: c.status, class: "bg-muted text-muted-foreground border-border/60" };
              return (
                <div key={c.id} className="p-3.5 px-4 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg border border-border/70 bg-muted/20 p-1 flex items-center justify-center overflow-hidden shrink-0">
                      <img src={c.overlayImage} alt="" className="h-full w-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{c.name}</h3>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${status.class}`}>{status.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 font-mono"><Package className="h-3 w-3" /> {c._count?.products || 0} منتج مشمول</span>
                        {c.startAt && <span className="flex items-center gap-1 font-mono text-[11px]"><Calendar className="h-3 w-3" /> {new Date(c.startAt).toLocaleDateString("ar-EG")}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 self-end md:self-center">
                    <Button variant="outline" size="sm" onClick={() => handleApply(c.id)} className="h-7 text-xs gap-1 border-border/70" title="تطبيق الإطار">
                      <Play className="h-3 w-3" /> تطبيق
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/advertising/facebook-ads/overlay-campaigns/${c.id}`)} className="h-7 text-xs gap-1 border-border/70" title="إدارة المنتجات">
                      <ExternalLink className="h-3 w-3" /> المنتجات
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="h-7 w-7 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OverlayCampaigns;
