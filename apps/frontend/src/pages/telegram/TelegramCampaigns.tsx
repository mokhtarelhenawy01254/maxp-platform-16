import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/dialog";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { apiClient } from "../../services/apiClient";
import { Plus, XCircle, Trash2, Megaphone, ChevronDown, ChevronUp, RefreshCw, CheckCircle, XCircle as FailedIcon, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

const TelegramCampaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [userbots, setUserbots] = useState([]);
  const [dialogs, setDialogs] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState({});
  const [formData, setFormData] = useState({ userbotConfigId: "", chatIds: [], message: "", scheduledTime: "" });
  const [stats, setStats] = useState(null);

  useEffect(() => { fetchCampaigns(); fetchUserbots(); }, []);

  const fetchCampaigns = async () => { setLoading(true); try { const r = await apiClient.get("/api/v1/telegram-advanced/campaigns"); setCampaigns(r.data.data || []); } catch { setError("فشل تحميل الحملات"); } finally { setLoading(false); } };
  const fetchUserbots = async () => { try { const r = await apiClient.get("/api/v1/telegram/userbots"); setUserbots(r.data.data || []); } catch {} };
  const fetchDialogs = async (id) => { if (!id) return; try { const r = await apiClient.get(`/api/v1/userbot/dialogs?userbotConfigId=${id}`); setDialogs(r.data.data || []); } catch {} };

  const getStatusVariant = (s) => s === "SENT" || s === "COMPLETED" ? "default" : s === "FAILED" || s === "CANCELLED" ? "destructive" : "secondary";
  const getStatusLabel = (s) => ({ PENDING: "قيد الانتظار", SENT: "تم الإرسال", COMPLETED: "مكتملة", FAILED: "فشل", CANCELLED: "ملغية", RUNNING: "قيد التشغيل", DRAFT: "مسودة" }[s] || s);

  const handleCreate = async () => { setLoading(true); try { await apiClient.post("/api/v1/telegram-advanced/campaigns", formData); fetchCampaigns(); setOpenDialog(false); tToast.success("telegram_TelegramCampaigns.success_create_6e83"); } catch { setError("فشل إنشاء الحملة"); } finally { setLoading(false); } };
  const handleCancel = async (id) => { if (!window.confirm("هل أنت متأكد؟")) return; try { await apiClient.post(`/api/v1/telegram-advanced/campaigns/${id}/cancel`); fetchCampaigns(); tToast.success("telegram_TelegramCampaigns.msg_2651"); } catch { setError("فشل إلغاء الحملة"); } };
  const handleDelete = async (id) => { if (!window.confirm("هل أنت متأكد من الحذف؟")) return; try { await apiClient.delete(`/api/v1/telegram-advanced/campaigns/${id}`); fetchCampaigns(); tToast.success("telegram_TelegramCampaigns.success_delete_09d0"); } catch { setError("فشل حذف الحملة"); } };

  return (
    <div className="p-3 rtl">
      <div className="flex justify-between items-center mb-3"><h1 className="text-2xl font-bold">📢 الحملات</h1><Button onClick={() => setOpenDialog(true)} disabled={userbots.length === 0}><Plus className="size-4" /> حملة جديدة</Button></div>
      {error && <Alert variant="destructive" className="mb-2"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="space-y-2">{campaigns.map(c => <Card key={c.id}><CardContent><div className="flex justify-between items-start"><div className="flex-1"><div className="flex items-center gap-1 mb-1"><Megaphone className="size-4" /><h3 className="font-semibold">{c.name || c.title}</h3><Badge variant={getStatusVariant(c.status)}>{getStatusLabel(c.status)}</Badge></div><p className="text-sm text-muted-foreground">👥 {c.targetCount || 0} مستهدف | 📨 {c.sentCount || 0} مرسل</p></div><div className="flex gap-1 shrink-0">{(c.status === "PENDING" || c.status === "RUNNING") && <Button variant="ghost" size="icon" onClick={() => handleCancel(c.id)}><XCircle className="size-4" /></Button>}<Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="size-4" /></Button></div></div></CardContent></Card>)}</div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>📢 حملة جديدة</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={formData.userbotConfigId} onValueChange={v => { setFormData(p => ({ ...p, userbotConfigId: v, chatIds: [] })); fetchDialogs(v); }}><SelectTrigger><SelectValue placeholder="اختر Userbot" /></SelectTrigger><SelectContent>{userbots.map(b => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}</SelectContent></Select>
          <Select value={formData.chatIds[0] || ""} onValueChange={v => setFormData(p => ({ ...p, chatIds: [v] }))}><SelectTrigger><SelectValue placeholder="اختر المحادثات" /></SelectTrigger><SelectContent>{dialogs.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
          <Input placeholder="عنوان الحملة" value={formData.title || ""} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} />
          <Textarea placeholder="الرسالة" rows={6} value={formData.message} onChange={e => setFormData(p => ({ ...p, message: e.target.value }))} />
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpenDialog(false)}>إلغاء</Button><Button onClick={handleCreate} disabled={loading}>{loading ? "جاري الإنشاء..." : "إنشاء"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
};

export default TelegramCampaigns;