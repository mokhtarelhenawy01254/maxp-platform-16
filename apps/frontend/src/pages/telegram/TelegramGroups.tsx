import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Alert, AlertDescription } from "../../components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/dialog";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { apiClient } from "../../services/apiClient";
import { Plus, Group, Megaphone, UserPlus, Eye } from "lucide-react";
import { toast } from "react-hot-toast";

const TelegramGroups = () => {
  const [groups, setGroups] = useState([]);
  const [userbots, setUserbots] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openMembersDialog, setOpenMembersDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({ userbotConfigId: "", title: "", about: "", isPublic: false, type: "CHANNEL", users: [] });

  useEffect(() => { fetchUserbots(); fetchGroups(); fetchContacts(); }, []);

  const fetchUserbots = async () => { try { const r = await apiClient.get("/api/v1/telegram/userbots"); setUserbots(r.data.data || []); } catch {} };
  const fetchGroups = async () => { setLoading(true); try { const r = await apiClient.get("/api/v1/telegram-advanced/groups"); setGroups(r.data.data || []); } catch { setError("فشل تحميل المجموعات والقنوات"); } finally { setLoading(false); } };
  const fetchContacts = async () => { try { const r = await apiClient.get("/api/v1/telegram-advanced/contacts"); setContacts(r.data.data || []); } catch {} };

  const getTypeLabel = (t) => ({ CHANNEL: "قناة", GROUP: "مجموعة", SUPERGROUP: "مجموعة كبيرة" }[t] || t);

  const handleViewMembers = async (group) => { setSelectedGroup(group); setLoading(true); try { const r = await apiClient.get(`/api/v1/telegram-advanced/groups/${group.userbotConfigId}/${group.telegramId}/members?saveToDb=true`); setMembers(r.data.members || []); setOpenMembersDialog(true); } catch { setError("فشل تحميل الأعضاء"); } finally { setLoading(false); } };

  const filteredGroups = groups.filter(g => { if (tabValue === 0) return g.type === "CHANNEL"; if (tabValue === 1) return g.type === "GROUP" || g.type === "SUPERGROUP"; return true; });

  return (
    <div className="p-3">
      <div className="flex justify-between items-center mb-3"><h1 className="text-2xl font-bold">👥 المجموعات والقنوات</h1><div className="flex gap-1"><Button onClick={() => { setFormData(p => ({ ...p, type: "CHANNEL" })); setOpenDialog(true); }} disabled={userbots.length === 0}><Megaphone className="size-4" /> قناة جديدة</Button><Button variant="outline" onClick={() => { setFormData(p => ({ ...p, type: "GROUP" })); setOpenDialog(true); }} disabled={userbots.length === 0}><Group className="size-4" /> مجموعة جديدة</Button></div></div>
      {error && <Alert variant="destructive" className="mb-2"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="flex gap-1 mb-2 border-b">{[{ v: 0, l: "القنوات" }, { v: 1, l: "المجموعات" }, { v: 2, l: "الكل" }].map(t => <button key={t.v} onClick={() => setTabValue(t.v)} className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${tabValue === t.v ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>{t.l}</button>)}</div>
      <div className="space-y-2">{filteredGroups.map(group => <Card key={group.id}><CardContent><div className="flex justify-between items-start"><div className="flex-1"><div className="flex items-center gap-1 mb-1">{group.type === "CHANNEL" ? <Megaphone className="size-4" /> : <Group className="size-4" />}<h3 className="font-semibold">{group.title}</h3><Badge variant="outline">{getTypeLabel(group.type)}</Badge>{group.managedByUs && <Badge>مُدار بواسطتنا</Badge>}{group.isPublic && <Badge variant="secondary">عام</Badge>}</div>{group.username && <p className="text-sm text-muted-foreground">@{group.username}</p>}<p className="text-sm text-muted-foreground">👥 {group.memberCount || 0} عضو</p></div><Button variant="ghost" size="sm" onClick={() => handleViewMembers(group)}><Eye className="size-4" /> الأعضاء</Button></div></CardContent></Card>)}</div>

      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent><DialogHeader><DialogTitle>{formData.type === "CHANNEL" ? "📢 إنشاء قناة جديدة" : "👥 إنشاء مجموعة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Select value={formData.userbotConfigId} onValueChange={v => setFormData(p => ({ ...p, userbotConfigId: v }))}><SelectTrigger><SelectValue placeholder="اختر Userbot" /></SelectTrigger><SelectContent>{userbots.map(b => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}</SelectContent></Select>
            <Input placeholder={formData.type === "CHANNEL" ? "اسم القناة" : "اسم المجموعة"} value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} />
            {formData.type === "CHANNEL" && <><Textarea placeholder="الوصف" value={formData.about} onChange={e => setFormData(p => ({ ...p, about: e.target.value }))} /><Select value={String(formData.isPublic)} onValueChange={v => setFormData(p => ({ ...p, isPublic: v === "true" }))}><SelectTrigger><SelectValue placeholder="نوع القناة" /></SelectTrigger><SelectContent><SelectItem value="false">خاصة</SelectItem><SelectItem value="true">عامة</SelectItem></SelectContent></Select></>}
            {formData.type === "GROUP" && <Select value={formData.users[0] || ""} onValueChange={v => setFormData(p => ({ ...p, users: [v] }))}><SelectTrigger><SelectValue placeholder="الأعضاء الأوليين" /></SelectTrigger><SelectContent>{contacts.map(c => <SelectItem key={c.id} value={c.telegramId}>{c.firstName} {c.lastName}</SelectItem>)}</SelectContent></Select>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpenDialog(false)}>إلغاء</Button><Button disabled={loading}>{loading ? "جاري الإنشاء..." : "إنشاء"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TelegramGroups;