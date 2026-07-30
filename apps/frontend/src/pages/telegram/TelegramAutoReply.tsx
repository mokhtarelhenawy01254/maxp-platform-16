import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Switch } from "../../components/ui/switch";
import { Label } from "../../components/ui/label";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/dialog";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { apiClient } from "../../services/apiClient";
import { Plus, Edit, Trash2, Play, Square } from 'lucide-react';
import { toast } from "sonner";

const TelegramAutoReply = () => {
  const { t } = useTranslation();
  const [rules, setRules] = useState([]);
  const [userbots, setUserbots] = useState([]);
  const [selectedUserbot, setSelectedUserbot] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ triggerText: "", responseText: "", isActive: true, matchType: "EXACT" });

  useEffect(() => { fetchUserbots(); fetchRules(); }, [selectedUserbot]);

  const fetchUserbots = async () => { try { const r = await apiClient.get("/api/v1/telegram/userbots"); setUserbots(r.data.data || []); if (r.data.data?.length > 0) setSelectedUserbot(r.data.data[0].id); } catch {} };
  const fetchRules = async () => { setLoading(true); try { const r = await apiClient.get(`/api/v1/telegram-advanced/auto-reply?userbotConfigId=${selectedUserbot}`); setRules(r.data.data || []); } catch { setError("فشل تحميل قواعد الرد التلقائي"); } finally { setLoading(false); } };

  const handleSave = async () => { setLoading(true); try { if (editingRule) { await apiClient.put(`/api/v1/telegram-advanced/auto-reply/${editingRule.id}`, formData); } else { await apiClient.post("/api/v1/telegram-advanced/auto-reply", { ...formData, userbotConfigId: selectedUserbot }); } fetchRules(); setOpenDialog(false); toast.success(editingRule ? "تم تحديث القاعدة" : "تم إنشاء القاعدة"); } catch { setError("فشل حفظ القاعدة"); } finally { setLoading(false); } };
  const handleDelete = async (id) => { if (!window.confirm("هل أنت متأكد؟")) return; try { await apiClient.delete(`/api/v1/telegram-advanced/auto-reply/${id}`); fetchRules(); toast.success("تم حذف القاعدة"); } catch { setError("فشل حذف القاعدة"); } };
  const handleToggleActive = async (rule) => { try { await apiClient.put(`/api/v1/telegram-advanced/auto-reply/${rule.id}`, { isActive: !rule.isActive }); fetchRules(); } catch { setError("فشل تغيير حالة القاعدة"); } };

  const getMatchTypeLabel = (m) => ({ EXACT: "تطابق تام", CONTAINS: "يحتوي على", STARTS_WITH: "يبدأ بـ", REGEX: "تعبير منتظم" }[m] || m);

  return (
    <div className="p-3 rtl">
      <div className="flex justify-between items-center mb-3"><h1 className="text-2xl font-bold">🤖 الرد التلقائي</h1><Button onClick={() => { setEditingRule(null); setFormData({ triggerText: "", responseText: "", isActive: true, matchType: "EXACT" }); setOpenDialog(true); }}><Plus className="size-4" /> إضافة قاعدة</Button></div>
      <div className="mb-3"><Select value={selectedUserbot} onValueChange={setSelectedUserbot}><SelectTrigger><SelectValue placeholder="اختر Userbot" /></SelectTrigger><SelectContent>{userbots.map(b => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}</SelectContent></Select></div>
      {error && <Alert variant="destructive" className="mb-2"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="space-y-2">{rules.map(rule => <Card key={rule.id}><CardContent><div className="flex justify-between items-start"><div className="flex-1"><div className="flex items-center gap-1 mb-1"><h3 className="font-semibold">{rule.triggerText}</h3><Badge variant="outline">{getMatchTypeLabel(rule.matchType)}</Badge><Badge variant={rule.isActive ? "default" : "secondary"}>{rule.isActive ? "نشط" : "معطل"}</Badge></div><p className="text-sm text-muted-foreground">→ {rule.responseText?.substring(0, 100)}</p></div><div className="flex gap-1 shrink-0"><Button variant="ghost" size="icon" onClick={() => handleToggleActive(rule)}>{rule.isActive ? <Square className="size-4" /> : <Play className="size-4" />}</Button><Button variant="ghost" size="icon" onClick={() => { setEditingRule(rule); setFormData({ triggerText: rule.triggerText, responseText: rule.responseText, isActive: rule.isActive, matchType: rule.matchType }); setOpenDialog(true); }}><Edit className="size-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}><Trash2 className="size-4" /></Button></div></div></CardContent></Card>)}</div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}><DialogContent><DialogHeader><DialogTitle>{editingRule ? "تعديل القاعدة" : "إضافة قاعدة جديدة"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={formData.matchType} onValueChange={v => setFormData(p => ({ ...p, matchType: v }))}><SelectTrigger><SelectValue placeholder="نوع المطابقة" /></SelectTrigger><SelectContent><SelectItem value="EXACT">تطابق تام</SelectItem><SelectItem value="CONTAINS">يحتوي على</SelectItem><SelectItem value="STARTS_WITH">يبدأ بـ</SelectItem><SelectItem value="REGEX">تعبير منتظم</SelectItem></SelectContent></Select>
          <Input placeholder="النص المطلوب (trigger)" value={formData.triggerText} onChange={e => setFormData(p => ({ ...p, triggerText: e.target.value }))} />
          <Textarea placeholder="نص الرد" rows={4} value={formData.responseText} onChange={e => setFormData(p => ({ ...p, responseText: e.target.value }))} />
          <div className="flex items-center gap-2"><Switch checked={formData.isActive} onCheckedChange={v => setFormData(p => ({ ...p, isActive: v }))} /><Label>مفعل</Label></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpenDialog(false)}>إلغاء</Button><Button onClick={handleSave} disabled={loading}>{loading ? "جاري الحفظ..." : "حفظ"}</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
};

export default TelegramAutoReply;