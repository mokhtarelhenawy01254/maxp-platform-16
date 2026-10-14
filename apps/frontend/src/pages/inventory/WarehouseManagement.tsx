import React, { useState, useEffect, useMemo } from "react";
import {
  Warehouse,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Boxes,
  RefreshCw,
  Search,
  Building2,
  Snowflake,
  Truck,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { companyAwareApi } from "../../services/companyAwareApi";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent } from "../../components/ui/card";

interface WarehouseItem {
  id: string;
  name: string;
  location: string | null;
  type: string;
  capacity: number | null;
  isActive: boolean;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  main: { label: "مستودع رئيسي", icon: Building2, color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20" },
  cold: { label: "تبريد وتجميد", icon: Snowflake, color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20" },
  secondary: { label: "مستودع فرعي", icon: Boxes, color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20" },
  fulfillment: { label: "مركز شحن وتجهيز", icon: Truck, color: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20" },
};

const WarehouseManagement: React.FC = () => {
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseItem | null>(null);
  const [search, setSearch] = useState("");
  const [formData, setFormData] = useState({ name: "", location: "", type: "main", capacity: "" });

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await companyAwareApi.get("/warehouses");
      if (res.data?.success) setWarehouses(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error("Error fetching warehouses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWarehouses(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, capacity: formData.capacity ? parseInt(formData.capacity) : null };
      if (editingWarehouse) {
        await companyAwareApi.put(`/warehouses/${editingWarehouse.id}`, payload);
        toast.success("تم تحديث بيانات المستودع بنجاح");
      } else {
        await companyAwareApi.post("/warehouses", payload);
        toast.success("تمت إضافة المستودع بنجاح");
      }
      setShowModal(false);
      setEditingWarehouse(null);
      setFormData({ name: "", location: "", type: "main", capacity: "" });
      fetchWarehouses();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل في حفظ المستودع");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المستودع؟")) return;
    try {
      const res = await companyAwareApi.delete(`/warehouses/${id}`);
      if (res.data?.success) {
        toast.success("تم حذف المستودع");
        fetchWarehouses();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "فشل في حذف المستودع");
    }
  };

  const handleEdit = (w: WarehouseItem) => {
    setEditingWarehouse(w);
    setFormData({ name: w.name, location: w.location || "", type: w.type || "main", capacity: w.capacity?.toString() || "" });
    setShowModal(true);
  };

  const activeCount = useMemo(() => warehouses.filter((w) => w.isActive).length, [warehouses]);
  const totalCap = useMemo(() => warehouses.reduce((acc, w) => acc + (w.capacity || 0), 0), [warehouses]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return warehouses.filter((w) => w.name.toLowerCase().includes(q) || (w.location && w.location.toLowerCase().includes(q)));
  }, [warehouses, search]);

  const cards = [
    { title: "إجمالي المستودعات", val: warehouses.length, icon: Warehouse, color: "text-blue-500", sub: "موزعة بالمناطق" },
    { title: "المستودعات النشطة", val: activeCount, icon: CheckCircle2, color: "text-emerald-500", sub: "جاهزة للاستقبال والشحن" },
    { title: "إجمالي السعة", val: totalCap.toLocaleString("en-US"), icon: Boxes, color: "text-indigo-500", sub: "وحدة تخزينية كلية" },
    { title: "متوسط السعة", val: warehouses.length > 0 ? Math.round(totalCap / warehouses.length).toLocaleString("en-US") : "0", icon: Layers, color: "text-primary", sub: "وحدة لكل منشأة" },
  ];

  return (
    <div className="space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Warehouse className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">إدارة المستودعات ومراكز التخزين</h1>
            <p className="text-xs text-muted-foreground mt-0.5">توزيع المواقع التخزينية، السعات الاستيعابية، وتخصيص مراكز الشحن والتوزيع</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchWarehouses} disabled={loading} className="h-8 gap-1.5 text-xs font-mono">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-primary" : ""}`} /> تحديث
          </Button>
          <Button size="sm" onClick={() => { setEditingWarehouse(null); setFormData({ name: "", location: "", type: "main", capacity: "" }); setShowModal(true); }} className="h-8 gap-1.5 text-xs font-medium">
            <Plus className="h-3.5 w-3.5" /> إضافة مستودع
          </Button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {cards.map((c, i) => (
          <Card key={i} className="border-border/70 shadow-sm bg-card">
            <CardContent className="p-3.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{c.title}</span><c.icon className={`h-3.5 w-3.5 ${c.color}`} />
              </div>
              <div className="text-lg font-bold font-mono tabular-nums text-foreground">{loading ? "..." : c.val}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{c.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chassis */}
      <div className="border border-border/70 rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="p-3 bg-muted/20 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="h-3.5 w-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input type="text" placeholder="بحث باسم المستودع أو الموقع..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 pr-9 pl-3 text-xs bg-background border-border/70" />
          </div>
          <div className="text-xs text-muted-foreground">المستودعات: <strong className="text-foreground font-mono">{filtered.length}</strong></div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (<div key={i} className="h-36 rounded-xl border border-border/70 bg-muted/20 animate-pulse"></div>))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Warehouse className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="font-medium">لا توجد مستودعات مطابقة للبحث</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((w) => {
                const cfg = TYPE_CONFIG[w.type] || TYPE_CONFIG.main;
                const Icon = cfg.icon;
                return (
                  <div key={w.id} className="rounded-xl border border-border/70 bg-card p-4 hover:border-primary/40 transition-all flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20"><Warehouse className="h-4 w-4" /></div>
                          <div>
                            <h3 className="font-semibold text-foreground text-sm">{w.name}</h3>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border mt-1 ${cfg.color}`}><Icon className="h-3 w-3" />{cfg.label}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleEdit(w)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => handleDelete(w.id)} className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-md transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{w.location || "الموقع غير محدد"}</span></div>
                    </div>
                    <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${w.isActive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                        {w.isActive ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {w.isActive ? "نشط" : "معطل"}
                      </span>
                      <span className="font-mono text-muted-foreground text-[11px]">السعة: <strong className="text-foreground">{w.capacity ? w.capacity.toLocaleString("en-US") : "غير محدد"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-2.5 bg-muted/10 border-t border-border/70 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-muted-foreground gap-2">
          <span>إجمالي المستودعات: <strong className="text-foreground font-mono">{filtered.length}</strong></span>
          <span className="text-[11px]">تخصيص المستودعات يدعم توجيه طلبيات الشحن التلقائي ومزامنة الجرد</span>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border/80 rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-right">
            <div className="p-4 border-b border-border/70 flex justify-between items-center bg-muted/30">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Warehouse className="h-4 w-4 text-primary" />{editingWarehouse ? "تعديل بيانات المستودع" : "إضافة مستودع جديد"}</h3>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground text-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">اسم المستودع *</label>
                <Input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="h-8 text-xs bg-background border-border/70" placeholder="مثال: المستودع الرئيسي - العبور" />
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">الموقع الجغرافي / العنوان</label>
                <Input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="h-8 text-xs bg-background border-border/70" placeholder="مثال: المنطقة الصناعية، العبور" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">تصنيف المستودع</label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full h-8 px-2.5 text-xs rounded-md border border-border/70 bg-background text-foreground outline-none">
                    <option value="main">مستودع رئيسي</option>
                    <option value="cold">تبريد وتجميد</option>
                    <option value="secondary">مستودع فرعي</option>
                    <option value="fulfillment">مركز شحن وتجهيز</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">السعة القصوى (قطع)</label>
                  <Input type="number" value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: e.target.value })} className="h-8 text-xs bg-background border-border/70 font-mono" placeholder="15000" />
                </div>
              </div>
              <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)} className="h-8 text-xs">إلغاء</Button>
                <Button type="submit" size="sm" className="h-8 text-xs font-medium">{editingWarehouse ? "حفظ التعديلات" : "إضافة المستودع"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseManagement;
