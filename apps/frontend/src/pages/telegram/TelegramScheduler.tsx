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
import { Plus, X, Clock, RotateCcw } from 'lucide-react';
import { toast } from "sonner";

const TelegramScheduler = () => {
  const [scheduledMessages, setScheduledMessages] = useState([]);
  const [userbots, setUserbots] = useState([]);
  const [dialogs, setDialogs] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ userbotConfigId: "", chatIds: [], message: "", scheduledTime: new Date(Date.now() + 3600000), recurring: false, recurringPattern: "DAILY" });
  const [currentTab, setCurrentTab] = useState("ALL");

  useEffect(() => { fetchUserbots(); fetchScheduledMessages(); const i = setInterval(() => fetchScheduledMessages(false), 30000); return () => clearInterval(i); }, []);

  const fetchUserbots = async () => { try { const r = await apiClient.get("/api/v1/telegram/userbots"); setUserbots(r.data.data || []); } catch {} };
  const fetchScheduledMessages = async (showLoading = true) => { if (showLoading) setLoading(true); try { const r = await apiClient.get("/api/v1/telegram-advanced/scheduled-messages"); setScheduledMessages(r.data.data || []); } catch { if (showLoading) setError("فشل تحميل الرسائل المجدولة"); } finally { if (showLoading) setLoading(false); } };
  const fetchDialogs = async (id) => { if (!id) return; try { const r = await apiClient.get(`/api/v1/userbot/dialogs?userbotConfigId=${id}`); setDialogs(r.data.data || []); } catch {} };

  const getStatusVariant = (s) => s === "SENT" ? "default" : s === "FAILED" ? "destructive" : s === "CANCELLED" ? "outline" : "secondary";
  const getStatusLabel = (s) => ({ PENDING: "قيد الانتظار", SENT: "تم الإرسال", FAILED: "فشل", CANCELLED: "ملغي" }[s] || s);
  const getRecurringLabel = (p) => ({ DAILY: "يومي", WEEKLY: "أسبوعي", MONTHLY: "شهري" }[p] || p);

  const handleSchedule = async () => {
    const cleanChatIds = formData.chatIds.filter(id => id);
    if (!formData.userbotConfigId || cleanChatIds.length === 0 || !formData.message) { setError("يرجى ملء جميع الحقول المطلوبة"); return; }
    if (formData.scheduledTime < new Date()) { setError("لا يمكن جدولة رسالة في وقت ماضٍ"); return; }
    setLoading(true);
    try { await apiClient.post("/api/v1/telegram-advanced/scheduled-messages", { ...formData, chatIds: cleanChatIds }); fetchScheduledMessages(); setOpenDialog(false); toast.success("تم جدولة الرسالة بنجاح"); }
    catch { setError("فشل جدولة الرسالة"); } finally { setLoading(false); }
  };

  const handleCancel = async (id) => { if (!window.confirm("هل أنت متأكد؟")) return; setLoading(true); try { await apiClient.post(`/api/v1/telegram-advanced/scheduled-messages/${id}/cancel`); fetchScheduledMessages(); } catch { setError("فشل إلغاء الرسالة"); } finally { setLoading(false); } };

  const handleOpenNewDialog = () => { setFormData({ userbotConfigId: userbots[0]?.id || "", chatIds: [], message: "", scheduledTime: new Date(Date.now() + 3600000), recurring: false, recurringPattern: "DAILY" }); if (userbots[0]?.id) fetchDialogs(userbots[0].id); setOpenDialog(true); };

  return (
    <div className="p-3 rtl">
      <div className="flex justify-between items-center mb-3"><h1 className="text-2xl font-bold">⏰ جدولة الرسائل</h1><Button onClick={handleOpenNewDialog} disabled={userbots.length === 0}><Plus className="size-4" /> جدولة رسالة</Button></div>
      {error && <Alert variant="destructive" className="mb-2"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="flex gap-1 mb-3 border-b">{[{ v: "ALL", l: "الكل" }, { v: "PENDING", l: "قيد الانتظار" }, { v: "SENT", l: "تم الإرسال" }, { v: "FAILED", l: "فشل" }, { v: "CANCELLED", l: "ملغاة" }].map(t => <button key={t.v} onClick={() => setCurrentTab(t.v)} className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${currentTab === t.v ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{t.l}</button>)}</div>
      <div className="space-y-2">
        {scheduledMessages.filter(m => currentTab === "ALL" || m.status === currentTab).map(msg => (
          <Card key={msg.id}><CardContent>
            <div className="flex justify-between items-start"><div className="flex-1"><div className="flex items-center gap-1 mb-1"><Clock className="size-4 text-muted-foreground" /><h3 className="font-semibold">{new Date(msg.scheduledTime).toLocaleString("ar-EG")}</h3><Badge variant={getStatusVariant(msg.status)}>{getStatusLabel(msg.status)}</Badge>{msg.recurring && <Badge variant="secondary">🔄 {getRecurringLabel(msg.recurringPattern)}</Badge>}</div><p className="text-sm text-muted-foreground"><strong>المحادثة:</strong> {msg.chatId}</p><p className="text-sm text-muted-foreground">{msg.message.substring(0, 150)}{msg.message.length > 150 ? "..." : ""}</p></div><div className="flex gap-1 shrink-0">{(msg.status === "FAILED" || msg.status === "CANCELLED") && <Button variant="ghost" size="icon" disabled={loading}><RotateCcw className="size-4" /></Button>}{msg.status === "PENDING" && <Button variant="ghost" size="icon" disabled={loading} onClick={() => handleCancel(msg.id)}><XCircle className="size-4" /></Button>}</div></div>
          </CardContent></Card>
        ))}
      </div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>⏰ جدولة رسالة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Select value={formData.userbotConfigId} onValueChange={v => { setFormData(p => ({ ...p, userbotConfigId: v, chatIds: [] })); fetchDialogs(v); }}><SelectTrigger><SelectValue placeholder="اختر Userbot" /></SelectTrigger><SelectContent>{userbots.map(b => <SelectItem key={b.id} value={b.id}>{b.label} ({b.clientPhone || "غير متصل"})</SelectItem>)}</SelectContent></Select>
            <Select value={formData.chatIds[0] || ""} onValueChange={v => setFormData(p => ({ ...p, chatIds: [v] }))}><SelectTrigger><SelectValue placeholder="اختر المحادثة" /></SelectTrigger><SelectContent>{dialogs.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
            <Textarea value={formData.message} onChange={e => setFormData(p => ({ ...p, message: e.target.value }))} rows={6} placeholder="الرسالة" />
            <Input type="datetime-local" value={formData.scheduledTime instanceof Date ? formData.scheduledTime.toISOString().slice(0, 16) : ""} onChange={e => setFormData(p => ({ ...p, scheduledTime: new Date(e.target.value) }))} />
            <div className="flex items-center gap-2"><Switch checked={formData.recurring} onCheckedChange={v => setFormData(p => ({ ...p, recurring: v }))} /><Label>رسالة متكررة</Label></div>
            {formData.recurring && <Select value={formData.recurringPattern} onValueChange={v => setFormData(p => ({ ...p, recurringPattern: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DAILY">يومي</SelectItem><SelectItem value="WEEKLY">أسبوعي</SelectItem><SelectItem value="MONTHLY">شهري</SelectItem></SelectContent></Select>}
            <Alert><Clock className="size-4" /><AlertDescription>سيتم إرسال الرسالة تلقائياً في الوقت المحدد</AlertDescription></Alert>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenDialog(false)}>إلغاء</Button><Button onClick={handleSchedule} disabled={loading}>{loading ? "جاري الجدولة..." : "جدولة"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TelegramScheduler;