import React, { useState, useEffect } from "react";
import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Alert, AlertDescription } from "../../components/ui/alert";
import { Skeleton } from "../../components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../../components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "../../components/ui/dialog";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { apiClient } from "../../services/apiClient";
import { Plus, Send, XCircle, Eye, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

interface Userbot { id: string; label: string; clientPhone?: string; }
interface DialogEntry { id: string; name: string; }

const TelegramBulkMessages = () => {
  const [messages, setMessages] = useState([]);
  const [userbots, setUserbots] = useState<Userbot[]>([]);
  const [dialogList, setDialogList] = useState<DialogEntry[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [selectedUserbot, setSelectedUserbot] = useState("");
  const [selectedDialogs, setSelectedDialogs] = useState<string[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sendResults, setSendResults] = useState<any[]>([]);

  useEffect(() => { fetchUserbots(); fetchMessages(); }, []);

  const fetchUserbots = async () => { try { const r = await apiClient.get("/api/v1/telegram/userbots"); setUserbots(r.data.data || []); } catch {} };
  const fetchMessages = async () => { setLoading(true); try { const r = await apiClient.get("/api/v1/telegram-advanced/bulk-messages"); setMessages(r.data.data || []); } catch { setError("فشل تحميل الرسائل"); } finally { setLoading(false); } };
  const fetchDialogs = async (id: string) => { if (!id) return; try { const r = await apiClient.get(`/api/v1/userbot/dialogs?userbotConfigId=${id}`); setDialogList(r.data.data || []); } catch {} };

  const handleSend = async () => { setSending(true); setProgress(0); setError(""); setSendResults([]); try { const r = await apiClient.post("/api/v1/telegram-advanced/bulk-messages", { userbotConfigId: selectedUserbot, chatIds: selectedDialogs, message: messageText }); setMessages(r.data.data || []); tToast.success("telegram_TelegramBulkMessages.success_send_242e"); setOpenDialog(false); } catch { setError("فشل إرسال الرسائل"); } finally { setSending(false); } };

  return (
    <div className="p-3 rtl">
      <div className="flex justify-between items-center mb-3"><h1 className="text-2xl font-bold">📨 الرسائل الجماعية</h1><Button onClick={() => setOpenDialog(true)} disabled={userbots.length === 0}><Plus className="size-4" /> إرسال رسائل جماعية</Button></div>
      {error && <Alert variant="destructive" className="mb-2"><AlertDescription>{error}</AlertDescription></Alert>}
      {loading ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div> : <div className="space-y-2">{messages.map(m => <Card key={m.id}><CardContent><p className="font-semibold">{m.message?.substring(0, 100)}</p><p className="text-sm text-muted-foreground">إلى {m.targetCount || 0} محادثة | مرسل: {m.sentCount || 0}</p></CardContent></Card>)}</div>}

      <Dialog open={openDialog} onOpenChange={setOpenDialog}><DialogContent className="max-w-2xl"><DialogHeader><DialogTitle>📨 إرسال رسائل جماعية</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={selectedUserbot} onValueChange={v => { setSelectedUserbot(v); fetchDialogs(v); }}><SelectTrigger><SelectValue placeholder="اختر Userbot" /></SelectTrigger><SelectContent>{userbots.map(b => <SelectItem key={b.id} value={b.id}>{b.label}</SelectItem>)}</SelectContent></Select>
          <Select value={selectedDialogs[0] || ""} onValueChange={v => setSelectedDialogs([v])}><SelectTrigger><SelectValue placeholder="اختر المحادثات" /></SelectTrigger><SelectContent>{dialogList.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent></Select>
          <Textarea value={messageText} onChange={e => setMessageText(e.target.value)} rows={6} placeholder="نص الرسالة" />
          <Button onClick={handleSend} disabled={sending || !selectedUserbot || selectedDialogs.length === 0 || !messageText} className="w-full">{sending ? <LoadingSpinner size="sm" /> : <Send className="size-4" />} إرسال</Button>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setOpenDialog(false)}>إغلاق</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
};

export default TelegramBulkMessages;