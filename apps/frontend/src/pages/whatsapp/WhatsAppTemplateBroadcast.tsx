import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Send,
  Megaphone,
  RefreshCw,
  CheckCircle,
  XCircle,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { apiClient, type ApiRequestConfig } from "../../services/apiClient";
import {
  WhatsAppPageShell,
  WhatsAppSurfaceCard,
} from "./components/WhatsAppPageShell";

interface Session {
  id: string;
  phoneNumber: string;
}

interface MetaTemplate {
  name: string;
  status: string;
  category: string;
  language: string;
}

const WhatsAppTemplateBroadcast: React.FC<{
  companyId?: string;
  companyName?: string;
  superAdminMode?: boolean;
}> = ({ companyId, companyName, superAdminMode = false }) => {
  const { t, i18n } = useTranslation();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [languageCode, setLanguageCode] = useState("en");
  const [recipientsText, setRecipientsText] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; errors: any[] } | null>(null);

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
      const res = await apiClient.get(
        `/whatsapp-templates/templates?sessionId=${selectedSessionId}`,
        withCompanyConfig(),
      );
      const approved = (res.data?.templates || []).filter(
        (t: MetaTemplate) => t.status === "APPROVED",
      );
      setTemplates(approved);
    } catch { }
  }, [selectedSessionId, withCompanyConfig]);

  useEffect(() => { fetchSessions(); }, []);
  useEffect(() => { fetchTemplates(); }, [selectedSessionId]);

  const addRecipients = useCallback(() => {
    const phones = recipientsText
      .split(/[\n,;]+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    const unique = [...new Set([...recipients, ...phones])];
    setRecipients(unique);
    setRecipientsText("");
  }, [recipientsText, recipients]);

  const removeRecipient = useCallback((phone: string) => {
    setRecipients((prev) => prev.filter((p) => p !== phone));
  }, []);

  const handleSend = useCallback(async () => {
    if (!selectedSessionId || !selectedTemplate || recipients.length === 0) {
      toast.error("اختر الجلسة والقالب وأضف مستلمين على الأقل");
      return;
    }
    try {
      setSending(true);
      setResult(null);
      const res = await apiClient.post(
        "/whatsapp-templates/templates/broadcast",
        {
          sessionId: selectedSessionId,
          templateName: selectedTemplate,
          languageCode,
          recipients: recipients.map((to) => ({ to })),
        },
        withCompanyConfig(),
      );
      setResult(res.data?.results || { sent: 0, failed: 0, errors: [] });
      toast.success("تم إرسال البث");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل إرسال البث");
    } finally {
      setSending(false);
    }
  }, [selectedSessionId, selectedTemplate, languageCode, recipients, withCompanyConfig]);

  const pageTitle = "بث قالب واتساب";

  return (
    <WhatsAppPageShell
      title={pageTitle}
      description="أرسل قالب رسالة Meta API لمجموعة من المستلمين دفعة واحدة"
      icon={Megaphone}
      backHref="/whatsapp"
      backLabel={t("common.back")}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <WhatsAppSurfaceCard title="إعدادات البث" description="اختر الجلسة والقالب">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>جلسة واتساب</Label>
                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="اختر جلسة" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.phoneNumber || s.id}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>القالب (المعتمد فقط)</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="اختر قالباً" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                      <SelectItem key={t.name} value={t.name}>
                        {t.name} ({t.language})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templates.length === 0 && selectedSessionId && (
                  <p className="text-sm text-[color:var(--color-muted-foreground)]">
                    لا توجد قوالب معتمدة. أنشئ قالباً أولاً.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>لغة القالب</Label>
                <Select value={languageCode} onValueChange={setLanguageCode}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </WhatsAppSurfaceCard>

          <WhatsAppSurfaceCard title="المستلمون" description={`${recipients.length} مستلم`}>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  value={recipientsText}
                  onChange={(e) => setRecipientsText(e.target.value)}
                  placeholder="أرقام الهواتف مفصولة بسطر جديد أو فاصلة&#10;مثال:&#10;201234567890&#10;201098765432"
                  className="min-h-[100px]"
                />
              </div>
              <Button onClick={addRecipients} variant="outline" className="rounded-full">
                <UserPlus className="size-4" /> إضافة المستلمين
              </Button>

              {recipients.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {recipients.map((phone) => (
                    <Badge key={phone} variant="secondary" className="gap-1 px-3 py-1.5 text-sm">
                      {phone}
                      <button onClick={() => removeRecipient(phone)} className="mr-1 hover:text-red-500">
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </WhatsAppSurfaceCard>

          <Button
            onClick={handleSend}
            disabled={sending || recipients.length === 0 || !selectedTemplate}
            className="w-full rounded-full py-6 text-lg"
          >
            {sending ? (
              <span className="flex items-center gap-2">
                <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                جاري الإرسال...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="size-5" />
                إرسال البث ({recipients.length} مستلم)
              </span>
            )}
          </Button>
        </div>

        <div className="lg:col-span-2">
          <Card className="rounded-3xl border-[color:var(--shell-control-border)]">
            <CardHeader>
              <CardTitle className="text-lg">نتيجة الإرسال</CardTitle>
              <CardDescription>تقرير الإرسال بعد تنفيذ البث</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!result ? (
                <p className="py-8 text-center text-sm text-[color:var(--color-muted-foreground)]">
                  {sending ? "جاري الإرسال..." : "لم يتم الإرسال بعد"}
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-500/10 p-4">
                    <CheckCircle className="size-8 text-emerald-600" />
                    <div>
                      <p className="text-lg font-bold text-emerald-800">{result.sent}</p>
                      <p className="text-sm text-emerald-700">تم الإرسال</p>
                    </div>
                  </div>
                  {result.failed > 0 && (
                    <div className="flex items-center gap-3 rounded-2xl border border-red-200/80 bg-red-500/10 p-4">
                      <XCircle className="size-8 text-red-600" />
                      <div>
                        <p className="text-lg font-bold text-red-800">{result.failed}</p>
                        <p className="text-sm text-red-700">فشل</p>
                      </div>
                    </div>
                  )}
                  {result.errors.length > 0 && (
                    <div className="space-y-2">
                      <Separator />
                      <p className="text-sm font-medium text-[color:var(--color-muted-foreground)]">
                        تفاصيل الأخطاء:
                      </p>
                      <div className="max-h-40 space-y-1 overflow-y-auto">
                        {result.errors.map((e, i) => (
                          <p key={i} className="rounded-lg bg-[color:var(--color-muted)] px-3 py-1.5 text-xs text-red-600">
                            {e.recipient?.to || e.recipient?.phone || "?"}: {e.error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </WhatsAppPageShell>
  );
};

export default WhatsAppTemplateBroadcast;