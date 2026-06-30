import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  Globe,
  Languages,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { apiClient, type ApiRequestConfig } from "../../services/apiClient";
import {
  WhatsAppPageShell,
  WhatsAppSurfaceCard,
} from "./components/WhatsAppPageShell";

interface MetaTemplate {
  name: string;
  status: string;
  category: string;
  language: string;
  id?: string;
  rejected_reason?: string;
}

const statusBadge: Record<string, string> = {
  APPROVED: "border-emerald-300/70 bg-emerald-500/10 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/[0.08] dark:text-emerald-200",
  PENDING: "border-amber-300/70 bg-amber-500/10 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/[0.08] dark:text-amber-200",
  REJECTED: "border-red-300/70 bg-red-500/10 text-red-800 dark:border-red-500/40 dark:bg-red-500/[0.08] dark:text-red-200",
  DISABLED: "border-slate-300/70 bg-slate-500/10 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/[0.08] dark:text-slate-300",
  PAUSED: "border-blue-300/70 bg-blue-500/10 text-blue-800 dark:border-blue-500/40 dark:bg-blue-500/[0.08] dark:text-blue-200",
};

const statusIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  APPROVED: CheckCircle,
  PENDING: Clock,
  REJECTED: XCircle,
  DISABLED: XCircle,
  PAUSED: AlertTriangle,
};

const CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"];

const WhatsAppMetaTemplates: React.FC<{
  companyId?: string;
  companyName?: string;
  superAdminMode?: boolean;
}> = ({ companyId, companyName, superAdminMode = false }) => {
  const { t, i18n } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [sessions, setSessions] = useState<{ id: string; name?: string; phoneNumber: string }[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    language: "en",
    category: "MARKETING",
    headerText: "",
    bodyText: "",
    footerText: "",
    buttonText: "",
    buttonUrl: "",
  });

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewTemplate, setViewTemplate] = useState<MetaTemplate | null>(null);

  const withCompanyConfig = useCallback(
    (config: ApiRequestConfig = {}) =>
      companyId ? { ...config, _companyId: companyId } : config,
    [companyId],
  );

  const fetchSessions = useCallback(async () => {
    try {
      const res = await apiClient.get("/whatsapp/sessions", withCompanyConfig());
      const metaSessions = (res.data?.sessions || []).filter(
        (s: any) => s.provider === "META_CLOUD" || s.metaWabaId,
      );
      setSessions(metaSessions);
      if (metaSessions.length > 0 && !selectedSessionId) {
        setSelectedSessionId(metaSessions[0].id);
      }
    } catch { }
  }, [withCompanyConfig]);

  const fetchTemplates = useCallback(async () => {
    if (!selectedSessionId) return;
    try {
      setLoading(true);
      const res = await apiClient.get(
        `/whatsapp-templates/templates?sessionId=${selectedSessionId}`,
        withCompanyConfig(),
      );
      setTemplates(res.data?.templates || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل تحميل القوالب");
    } finally {
      setLoading(false);
    }
  }, [selectedSessionId, withCompanyConfig]);

  useEffect(() => { fetchSessions(); }, []);
  useEffect(() => { fetchTemplates(); }, [selectedSessionId]);

  const handleCreate = useCallback(async () => {
    if (!form.name || !form.bodyText) {
      toast.error("اسم القالب ومحتوى الرسالة مطلوبان");
      return;
    }
    try {
      setSending(true);
      const components: any[] = [
        { type: "BODY", text: form.bodyText },
      ];
      if (form.headerText) {
        components.unshift({ type: "HEADER", format: "TEXT", text: form.headerText });
      }
      if (form.footerText) {
        components.push({ type: "FOOTER", text: form.footerText });
      }
      if (form.buttonText) {
        const buttons: any[] = [{ type: "URL", text: form.buttonText, url: form.buttonUrl || "https://" }];
        components.push({ type: "BUTTONS", buttons });
      }

      await apiClient.post(
        "/whatsapp-templates/templates",
        { sessionId: selectedSessionId, name: form.name, language: form.language, category: form.category, components },
        withCompanyConfig(),
      );
      toast.success("تم إنشاء القالب بنجاح");
      setCreateOpen(false);
      setForm({ name: "", language: "en", category: "MARKETING", headerText: "", bodyText: "", footerText: "", buttonText: "", buttonUrl: "" });
      fetchTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل إنشاء القالب");
    } finally {
      setSending(false);
    }
  }, [form, selectedSessionId, withCompanyConfig, fetchTemplates]);

  const handleDelete = useCallback(async (templateName: string) => {
    try {
      await apiClient.delete("/whatsapp-templates/templates", {
        data: { sessionId: selectedSessionId, templateName },
        ...withCompanyConfig(),
      });
      toast.success("تم حذف القالب");
      setDeleteConfirm(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل حذف القالب");
    }
  }, [selectedSessionId, withCompanyConfig, fetchTemplates]);

  const filteredTemplates = useMemo(
    () => templates.filter((t) => t.status !== "DELETED"),
    [templates],
  );

  const pageTitle = companyName
    ? `قوالب Meta API · ${companyName}`
    : "قوالب Meta API";

  return (
    <WhatsAppPageShell
      title={pageTitle}
      description="إدارة قوالب واتساب بزنس المسجلة في Meta Cloud API"
      icon={Globe}
      backHref="/whatsapp"
      backLabel={t("common.back")}
      eyebrow={superAdminMode ? `Company: ${companyName}` : "WhatsApp Workspace"}
      actions={
        <div className="flex gap-2">
          <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
            <SelectTrigger className="h-10 w-56 rounded-full bg-[color:var(--color-muted)]">
              <SelectValue placeholder="اختر جلسة">
                {(value: string | null) => {
                  if (!value) return null;
                  const s = sessions.find((x) => x.id === value);
                  if (!s) return value;
                  const isCuid = s.name && s.name.length === 25 && /^[a-z]/.test(s.name);
                  return s.name && !isCuid ? s.name : s.phoneNumber || s.id;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => {
                const isCuid = s.name && s.name.length === 25 && /^[a-z]/.test(s.name);
                const displayName = (s.name && !isCuid) ? s.name : s.phoneNumber || s.id;
                return (
                  <SelectItem key={s.id} value={s.id}>{displayName}</SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchTemplates} disabled={loading} className="rounded-full">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="rounded-full">
            <Plus className="size-4" /> قالب جديد
          </Button>
        </div>
      }
    >
      <WhatsAppSurfaceCard title="قوالب Meta API" description="القوالب المسجلة لدى واتساب بزنس">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="py-12 text-center text-[color:var(--color-muted-foreground)]">
            {selectedSessionId ? "لا توجد قوالب. أنشئ أول قالب." : "اختر جلسة أولاً"}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الاسم</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>التصنيف</TableHead>
                <TableHead>اللغة</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((t) => {
                const StatusIcon = statusIcon[t.status] || AlertTriangle;
                return (
                  <TableRow key={t.name}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadge[t.status] || ""}>
                        <StatusIcon className="ml-1 size-3.5 inline" />
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.category}</TableCell>
                    <TableCell>
                      <Languages className="ml-1 size-3.5 inline" />
                      {t.language}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => setViewTemplate(t)}>
                          <FileText className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-red-500 dark:text-red-400" onClick={() => setDeleteConfirm(t.name)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </WhatsAppSurfaceCard>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle>قالب جديد</DialogTitle>
            <DialogDescription>
              أنشئ قالب رسالة جديد في Meta Cloud API. بعد الإنشاء، يمر القالب بمراجعة من ميتا.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اسم القالب</Label>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="example: order_update_promo" className="h-11" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>اللغة</Label>
                <Select value={form.language} onValueChange={(v) => setForm((p) => ({ ...p, language: v }))}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="tr">Türkçe</SelectItem>
                    <SelectItem value="ur">اردو</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>رأس الرسالة (اختياري)</Label>
              <Input value={form.headerText} onChange={(e) => setForm((p) => ({ ...p, headerText: e.target.value }))}
                placeholder="مرحباً {{name}}" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>محتوى الرسالة *</Label>
              <Textarea value={form.bodyText} onChange={(e) => setForm((p) => ({ ...p, bodyText: e.target.value }))}
                placeholder={{ ar: "مرحباً {{1}}\nطلبك رقم {{2}} جاهز", en: "Hello {{1}}\nYour order #{{2}} is ready" } as any}
                className="min-h-[120px]" />
            </div>
            <div className="space-y-2">
              <Label>تذييل الرسالة (اختياري)</Label>
              <Input value={form.footerText} onChange={(e) => setForm((p) => ({ ...p, footerText: e.target.value }))}
                placeholder="شكراً لاختيارك متجرنا" className="h-11" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نص الزر (اختياري)</Label>
                <Input value={form.buttonText} onChange={(e) => setForm((p) => ({ ...p, buttonText: e.target.value }))}
                  placeholder="تتبع الطلب" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label>رابط الزر (اختياري)</Label>
                <Input value={form.buttonUrl} onChange={(e) => setForm((p) => ({ ...p, buttonUrl: e.target.value }))}
                  placeholder="https://example.com/track" className="h-11" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-full">إلغاء</Button>
            <Button onClick={handleCreate} disabled={sending} className="rounded-full">
              {sending ? "جاري الإنشاء..." : "إنشاء القالب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewTemplate} onOpenChange={(o) => !o && setViewTemplate(null)}>
        <DialogContent className="sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle>{viewTemplate?.name}</DialogTitle>
            <DialogDescription>
              تفاصيل قالب Meta API
            </DialogDescription>
          </DialogHeader>
              {viewTemplate && (() => {
                const StatusIcon = statusIcon[viewTemplate.status] || AlertTriangle;
                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-[color:var(--color-muted-foreground)]">الحالة</p>
                        <Badge variant="outline" className={statusBadge[viewTemplate.status] || ""}>
                          <StatusIcon className="ml-1 size-3.5 inline" />
                          {viewTemplate.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-[color:var(--color-muted-foreground)]">التصنيف</p>
                        <p className="font-medium">{viewTemplate.category}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-[color:var(--color-muted-foreground)]">اللغة</p>
                      <p className="font-medium">{viewTemplate.language}</p>
                    </div>
                    {viewTemplate.rejected_reason && (
                      <div>
                        <p className="text-sm text-[color:var(--color-muted-foreground)]">سبب الرفض</p>
                        <p className="font-medium text-red-500">{viewTemplate.rejected_reason}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTemplate(null)} className="rounded-full">إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <DialogContent className="sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle>حذف القالب</DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف القالب <strong>{deleteConfirm}</strong>؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="rounded-full">إلغاء</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="rounded-full">
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </WhatsAppPageShell>
  );
};

export default WhatsAppMetaTemplates;