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
  Pencil,
  Image,
  Video,
  File,
  MessageSquare,
  Eye,
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

interface MetaComponent {
  type: string;
  format?: string;
  text?: string;
  buttons?: { type: string; text: string; url?: string }[];
}

interface MetaTemplate {
  name: string;
  status: string;
  category: string;
  language: string;
  id?: string;
  rejected_reason?: string;
  components?: MetaComponent[];
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

/** Sanitize template name to Meta-allowed format: lowercase a-z, 0-9, underscore only */
function sanitizeTemplateName(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/** Check if a string contains named variables like {{name}} instead of {{1}} */
function hasNamedVariables(text: string): boolean {
  const matches = text.match(/\{\{([^}]+)\}\}/g) || [];
  return matches.some((m) => !/^\{\{\d+\}\}$/.test(m));
}

/** Validate button URL */
function isValidButtonUrl(url: string): boolean {
  if (!url) return true;
  return url.startsWith("https://") || url.startsWith("http://");
}

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
    headerFormat: "TEXT" as string,
    headerText: "",
    bodyText: "",
    footerText: "",
    buttonText: "",
    buttonUrl: "",
  });

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [viewTemplate, setViewTemplate] = useState<MetaTemplate | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    language: string;
    category: string;
    headerFormat: string;
    headerText: string;
    bodyText: string;
    footerText: string;
    buttonText: string;
    buttonUrl: string;
  } | null>(null);
  const [editSending, setEditSending] = useState(false);

  const [varValues, setVarValues] = useState<Record<string, string>>({});

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

  const sanitizedName = useMemo(() => sanitizeTemplateName(form.name), [form.name]);
  const nameValid = sanitizedName.length >= 1 && sanitizedName.length <= 512;
  const headerVarsOk = form.headerFormat !== "TEXT" || !form.headerText || !hasNamedVariables(form.headerText);
  const bodyVarsOk = !form.bodyText || !hasNamedVariables(form.bodyText);
  const buttonUrlOk = isValidButtonUrl(form.buttonUrl);

  const extractedVars = useMemo(() => {
    const allText = [form.headerText, form.bodyText, form.footerText, form.buttonText].filter(Boolean).join(" ");
    const matches = allText.match(/\{\{(\d+)\}\}/g) || [];
    const vars = [...new Set(matches)].sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, ""));
      const nb = parseInt(b.replace(/\D/g, ""));
      return na - nb;
    });
    return vars;
  }, [form.headerText, form.bodyText, form.footerText, form.buttonText]);

  const previewText = useMemo(() => {
    let text = "";
    if (form.headerFormat === "TEXT" && form.headerText) {
      text += `🔷 ${form.headerText}\n\n`;
    } else if (form.headerFormat !== "TEXT" && form.headerText) {
      text += `🔷 [${form.headerFormat}] ${form.headerText}\n\n`;
    } else if (form.headerFormat !== "TEXT") {
      text += `🔷 [${form.headerFormat} media]\n\n`;
    }
    if (form.bodyText) text += `${form.bodyText}\n`;
    if (form.footerText) text += `\n${form.footerText}`;
    if (form.buttonText) text += `\n\n[ ${form.buttonText} ]`;
    extractedVars.forEach((v) => {
      const key = v.replace(/\D/g, "");
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), varValues[key] || `{{${key}}}`);
    });
    return text;
  }, [form, extractedVars, varValues]);

  const buildComponents = useCallback((f: typeof form) => {
    const components: any[] = [
      { type: "BODY", text: f.bodyText },
    ];
    if (f.headerFormat === "TEXT" && f.headerText) {
      components.unshift({ type: "HEADER", format: "TEXT", text: f.headerText });
    } else if (f.headerFormat !== "TEXT") {
      components.unshift({ type: "HEADER", format: f.headerFormat, text: f.headerText || undefined });
    } else if (f.headerText) {
      components.unshift({ type: "HEADER", format: "TEXT", text: f.headerText });
    }
    if (f.footerText) {
      components.push({ type: "FOOTER", text: f.footerText });
    }
    if (f.buttonText) {
      const url = f.buttonUrl || "https://example.com";
      const finalUrl = url.startsWith("http") ? url : `https://${url}`;
      const buttons: any[] = [{ type: "URL", text: f.buttonText, url: finalUrl }];
      components.push({ type: "BUTTONS", buttons });
    }
    return components;
  }, []);

  const handleCreate = useCallback(async () => {
    if (!sanitizedName || !form.bodyText) {
      toast.error("اسم القالب ومحتوى الرسالة مطلوبان");
      return;
    }
    if (!nameValid) {
      toast.error("اسم القالب يجب أن يكون بين 1 و 512 حرف (أحرف إنجليزية صغيرة، أرقام، _ فقط)");
      return;
    }
    if (!headerVarsOk) {
      toast.error("المتغيرات في رأس الرسالة يجب أن تكون مرقمة: {{1}} بدلاً من {{name}}");
      return;
    }
    if (!bodyVarsOk) {
      toast.error("المتغيرات في محتوى الرسالة يجب أن تكون مرقمة: {{1}}, {{2}} بدلاً من أسماء");
      return;
    }
    if (!buttonUrlOk) {
      toast.error("رابط الزر يجب أن يبدأ بـ https://");
      return;
    }
    try {
      setSending(true);
      const components = buildComponents(form);

      await apiClient.post(
        "/whatsapp-templates/templates",
        { sessionId: selectedSessionId, name: sanitizedName, language: form.language, category: form.category, components },
        withCompanyConfig(),
      );
      toast.success("تم إنشاء القالب بنجاح — سيمر بمراجعة ميتا قبل التفعيل");
      setCreateOpen(false);
      setForm({ name: "", language: "en", category: "MARKETING", headerFormat: "TEXT", headerText: "", bodyText: "", footerText: "", buttonText: "", buttonUrl: "" });
      setVarValues({});
      fetchTemplates();
    } catch (err: any) {
      const metaMsg = err?.response?.data?.error;
      toast.error(metaMsg || "فشل إنشاء القالب", { duration: 8000 });
    } finally {
      setSending(false);
    }
  }, [form, sanitizedName, nameValid, headerVarsOk, bodyVarsOk, buttonUrlOk, selectedSessionId, withCompanyConfig, fetchTemplates, buildComponents]);

  const handleEdit = useCallback(async () => {
    if (!editForm || !editForm.name) {
      toast.error("بيانات التعديل غير مكتملة");
      return;
    }
    try {
      setEditSending(true);
      const components = buildComponents(editForm);

      await apiClient.put(
        "/whatsapp-templates/templates",
        { sessionId: selectedSessionId, templateName: editForm.name, components, language: editForm.language, category: editForm.category },
        withCompanyConfig(),
      );
      toast.success("تم تحديث القالب — سيمر بمراجعة ميتا");
      setEditOpen(false);
      setEditForm(null);
      fetchTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل تحديث القالب", { duration: 8000 });
    } finally {
      setEditSending(false);
    }
  }, [editForm, selectedSessionId, withCompanyConfig, fetchTemplates, buildComponents]);

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
                        <Button variant="ghost" size="icon-sm" onClick={() => {
                          const headerComponent = t.components?.find((c) => c.type === "HEADER");
                          const bodyComponent = t.components?.find((c) => c.type === "BODY");
                          const footerComponent = t.components?.find((c) => c.type === "FOOTER");
                          const buttonsComponent = t.components?.find((c) => c.type === "BUTTONS");
                          setEditForm({
                            name: t.name,
                            language: t.language,
                            category: t.category,
                            headerFormat: headerComponent?.format || "TEXT",
                            headerText: headerComponent?.text || "",
                            bodyText: bodyComponent?.text || "",
                            footerText: footerComponent?.text || "",
                            buttonText: buttonsComponent?.buttons?.[0]?.text || "",
                            buttonUrl: buttonsComponent?.buttons?.[0]?.url || "",
                          });
                          setEditOpen(true);
                        }}>
                          <Pencil className="size-4" />
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
                placeholder="مثال: payment_request أو طلب دفعة (يتحول تلقائياً)" className="h-11" dir="ltr" />
              {form.name && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[color:var(--color-muted-foreground)]">الاسم في Meta:</span>
                  <code className={`rounded-md px-2 py-0.5 font-mono ${nameValid ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/10 text-red-700 dark:text-red-300'}`}>
                    {sanitizedName || '(غير صالح)'}
                  </code>
                </div>
              )}
              <p className="text-[11px] text-[color:var(--color-muted-foreground)]">
                أحرف إنجليزية صغيرة وأرقام و _ فقط. الأحرف العربية والمسافات تُحوَّل تلقائياً.
              </p>
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
                <div className="flex gap-2">
                  <Select value={form.headerFormat} onValueChange={(v) => setForm((p) => ({ ...p, headerFormat: v }))}>
                    <SelectTrigger className="h-11 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT"><MessageSquare className="ml-1 size-3.5 inline" /> TEXT</SelectItem>
                      <SelectItem value="IMAGE"><Image className="ml-1 size-3.5 inline" /> IMAGE</SelectItem>
                      <SelectItem value="VIDEO"><Video className="ml-1 size-3.5 inline" /> VIDEO</SelectItem>
                      <SelectItem value="DOCUMENT"><File className="ml-1 size-3.5 inline" /> DOCUMENT</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.headerFormat === "TEXT" && (
                    <Input value={form.headerText} onChange={(e) => setForm((p) => ({ ...p, headerText: e.target.value }))}
                      placeholder="السلام عليكم يا {{1}}" className="h-11 flex-1" />
                  )}
                  {form.headerFormat !== "TEXT" && (
                    <div className="flex h-11 flex-1 items-center rounded-lg border border-[color:var(--shell-control-border)] bg-[var(--color-muted)] px-3 text-sm text-[color:var(--color-muted-foreground)]">
                      <Eye className="ml-2 size-4" />
                      <span>يتم تحديد `{form.headerFormat === "IMAGE" ? "الصورة" : form.headerFormat === "VIDEO" ? "الفيديو" : "المستند"} عند الإرسال</span>
                    </div>
                  )}
                </div>
                {form.headerText && !headerVarsOk && (
                  <p className="text-[11px] text-red-500 dark:text-red-400">
                    ⚠️ استخدم متغيرات مرقمة: {"{{1}}"} بدلاً من {"{{name}}"}. Meta لا يقبل أسماء متغيرات.
                  </p>
                )}
              </div>
            <div className="space-y-2">
              <Label>محتوى الرسالة *</Label>
              <Textarea value={form.bodyText} onChange={(e) => setForm((p) => ({ ...p, bodyText: e.target.value }))}
                placeholder={"مرحباً {{1}}\nطلبك رقم {{2}} جاهز للاستلام."}
                className="min-h-[120px]" />
              {form.bodyText && !bodyVarsOk && (
                <p className="text-[11px] text-red-500 dark:text-red-400">
                  ⚠️ استخدم متغيرات مرقمة: {"{{1}}"}, {"{{2}}"} بدلاً من أسماء. Meta يتطلب ترقيم المتغيرات.
                </p>
              )}
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
                  placeholder="https://example.com/track" className="h-11" dir="ltr" />
                {form.buttonUrl && !buttonUrlOk && (
                  <p className="text-[11px] text-red-500 dark:text-red-400">
                    ⚠️ الرابط يجب أن يبدأ بـ https:// — مثال: https://paypal.me/harfonline
                  </p>
                )}
              </div>
            </div>
          </div>
          {extractedVars.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-[color:var(--shell-control-border)] bg-[var(--color-muted)] p-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">اختبار المتغيرات</Label>
              <div className="flex flex-wrap gap-2">
                {extractedVars.map((v) => {
                  const key = v.replace(/\D/g, "");
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[color:var(--color-muted-foreground)]">{v}</span>
                      <Input
                        value={varValues[key] || ""}
                        onChange={(e) => setVarValues((p) => ({ ...p, [key]: e.target.value }))}
                        placeholder={`قيمة ${key}`}
                        className="h-8 w-28 text-xs"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-muted)] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">معاينة حية</p>
            <div className="wa-bubble rounded-2xl bg-[#d9fdd3] px-4 py-3 shadow-sm dark:bg-[var(--whatsapp-message-outgoing)]">
              <p className="whitespace-pre-wrap text-[0.95rem] leading-7 text-[color:var(--color-foreground)]">{previewText || "(لا يوجد محتوى)"}</p>
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
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
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
                      <div>
                        <p className="text-sm text-[color:var(--color-muted-foreground)]">اللغة</p>
                        <p className="font-medium">{viewTemplate.language}</p>
                      </div>
                    </div>
                    {viewTemplate.rejected_reason && (
                      <div>
                        <p className="text-sm text-[color:var(--color-muted-foreground)]">سبب الرفض</p>
                        <p className="font-medium text-red-500">{viewTemplate.rejected_reason}</p>
                      </div>
                    )}
                    <div className="rounded-2xl border border-[color:var(--shell-control-border)] bg-[var(--color-muted)] p-4 space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted-foreground)]">معاينة القالب</p>
                      {viewTemplate.components?.map((c, i) => {
                        if (c.type === "HEADER") {
                          return (
                            <div key={i} className="space-y-1">
                              <p className="text-[10px] font-medium text-[color:var(--color-muted-foreground)]">
                                {(c.format || "TEXT") === "TEXT" ? "رأس الرسالة" : `رأس (${c.format})`}
                              </p>
                              <p className="rounded-xl bg-[var(--shell-overlay-bg)] px-3 py-2 text-sm font-medium">{c.text || "(بدون نص)"}</p>
                            </div>
                          );
                        }
                        if (c.type === "BODY") {
                          return (
                            <div key={i} className="space-y-1">
                              <p className="text-[10px] font-medium text-[color:var(--color-muted-foreground)]">محتوى الرسالة</p>
                              <p className="rounded-xl bg-[var(--shell-overlay-bg)] px-3 py-2 text-sm whitespace-pre-wrap">{c.text || "(بدون نص)"}</p>
                            </div>
                          );
                        }
                        if (c.type === "FOOTER") {
                          return (
                            <div key={i} className="space-y-1">
                              <p className="text-[10px] font-medium text-[color:var(--color-muted-foreground)]">تذييل</p>
                              <p className="rounded-xl bg-[var(--shell-overlay-bg)] px-3 py-2 text-xs text-[color:var(--color-muted-foreground)]">{c.text || "(بدون نص)"}</p>
                            </div>
                          );
                        }
                        if (c.type === "BUTTONS") {
                          return (
                            <div key={i} className="space-y-1">
                              <p className="text-[10px] font-medium text-[color:var(--color-muted-foreground)]">أزرار</p>
                              <div className="flex flex-wrap gap-2">
                                {c.buttons?.map((b, bi) => (
                                  <span key={bi} className="rounded-full border border-[color:var(--shell-control-border)] bg-[var(--shell-overlay-bg)] px-3 py-1 text-xs">
                                    {b.text}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                      {(!viewTemplate.components || viewTemplate.components.length === 0) && (
                        <p className="py-4 text-center text-sm text-[color:var(--color-muted-foreground)]">لا توجد تفاصيل للمكونات</p>
                      )}
                    </div>
                  </div>
                );
              })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTemplate(null)} className="rounded-full">إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(o) => { if (!o) { setEditOpen(false); setEditForm(null); } }}>
        <DialogContent className="max-w-xl sm:rounded-3xl">
          <DialogHeader>
            <DialogTitle>تعديل القالب</DialogTitle>
            <DialogDescription>
              تعديل قالب "{editForm?.name}". بعد التعديل، يمر القالب بمراجعة جديدة من ميتا.
            </DialogDescription>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>التصنيف</Label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm((p) => p ? { ...p, category: v } : null)}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>اللغة</Label>
                <Select value={editForm.language} onValueChange={(v) => setEditForm((p) => p ? { ...p, language: v } : null)}>
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
                <Label>رأس الرسالة (اختياري)</Label>
                <div className="flex gap-2">
                  <Select value={editForm.headerFormat} onValueChange={(v) => setEditForm((p) => p ? { ...p, headerFormat: v } : null)}>
                    <SelectTrigger className="h-11 w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEXT">TEXT</SelectItem>
                      <SelectItem value="IMAGE">IMAGE</SelectItem>
                      <SelectItem value="VIDEO">VIDEO</SelectItem>
                      <SelectItem value="DOCUMENT">DOCUMENT</SelectItem>
                    </SelectContent>
                  </Select>
                  {editForm.headerFormat === "TEXT" ? (
                    <Input value={editForm.headerText} onChange={(e) => setEditForm((p) => p ? { ...p, headerText: e.target.value } : null)}
                      placeholder="نص الرأس" className="h-11 flex-1" />
                  ) : (
                    <div className="flex h-11 flex-1 items-center rounded-lg border border-[color:var(--shell-control-border)] bg-[var(--color-muted)] px-3 text-sm text-[color:var(--color-muted-foreground)]">
                      <Eye className="ml-2 size-4" />
                      <span>يتم تحديد الوسائط عند الإرسال</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>محتوى الرسالة *</Label>
                <Textarea value={editForm.bodyText} onChange={(e) => setEditForm((p) => p ? { ...p, bodyText: e.target.value } : null)}
                  className="min-h-[120px]" />
              </div>
              <div className="space-y-2">
                <Label>تذييل الرسالة (اختياري)</Label>
                <Input value={editForm.footerText} onChange={(e) => setEditForm((p) => p ? { ...p, footerText: e.target.value } : null)}
                  placeholder="شكراً" className="h-11" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>نص الزر (اختياري)</Label>
                  <Input value={editForm.buttonText} onChange={(e) => setEditForm((p) => p ? { ...p, buttonText: e.target.value } : null)}
                    placeholder="تتبع الطلب" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>رابط الزر (اختياري)</Label>
                  <Input value={editForm.buttonUrl} onChange={(e) => setEditForm((p) => p ? { ...p, buttonUrl: e.target.value } : null)}
                    placeholder="https://example.com" className="h-11" dir="ltr" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditForm(null); }} className="rounded-full">إلغاء</Button>
            <Button onClick={handleEdit} disabled={editSending} className="rounded-full">
              {editSending ? "جاري التحديث..." : "تحديث القالب"}
            </Button>
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