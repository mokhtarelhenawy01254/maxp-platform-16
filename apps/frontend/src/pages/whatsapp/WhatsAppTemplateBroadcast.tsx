import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Send, Megaphone, CheckCircle, XCircle, UserPlus, X, Clock, BarChart, Eye, MousePointerClick, Reply, List,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

import { apiClient, type ApiRequestConfig } from "../../services/apiClient";
import { broadcastService } from "../../services/broadcastService";
import { WhatsAppPageShell, WhatsAppSurfaceCard } from "./components/WhatsAppPageShell";

interface Session {
  id: string; name?: string; phoneNumber?: string; provider?: string; metaDisplayPhoneNumber?: string;
}

interface MetaTemplate {
  name: string; status: string; category: string; language: string;
}

interface CustomerList {
  id: string; name: string; description: string; count: number; isDefault?: boolean;
}

interface Campaign {
  id: string; name: string; channel: string; status: string; recipientCount: number;
  sentCount: number; deliveredCount: number; openedCount: number; clickedCount: number;
  repliedCount?: number; failedCount: number; targetAudience: string;
  waTemplateName?: string; waLanguageCode?: string;
  sentAt?: string; createdAt: string;
}

const WhatsAppTemplateBroadcast: React.FC<{ companyId?: string; companyName?: string; superAdminMode?: boolean }>
= ({ companyId, companyName, superAdminMode = false }) => {
  const { t, i18n } = useTranslation();

  const [activeTab, setActiveTab] = useState("create");

  // Session & Template
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [languageCode, setLanguageCode] = useState("en");

  // Campaign creation
  const [campaignName, setCampaignName] = useState("");
  const [customerLists, setCustomerLists] = useState<CustomerList[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [recipientsText, setRecipientsText] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [scheduleAt, setScheduleAt] = useState("");
  const [templateVars, setTemplateVars] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number; status: string } | null>(null);

  // Campaigns history
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // Analytics
  const [analytics, setAnalytics] = useState<any>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [listMembers, setListMembers] = useState<Record<string, any[]>>({});
  const [loadingMembers, setLoadingMembers] = useState(false);

  const withCompanyConfig = useCallback(
    (config: ApiRequestConfig = {}) => companyId ? { ...config, _companyId: companyId } : config, [companyId],
  );

  const fetchSessions = useCallback(async () => {
    try {
      const res = await apiClient.get("/whatsapp/sessions", withCompanyConfig());
      const metaSessions = (res.data?.sessions || []).filter(
        (s: any) => s.provider === "META_CLOUD" || s.metaWabaId,
      );
      setSessions(metaSessions);
      if (metaSessions.length > 0 && !selectedSessionId) setSelectedSessionId(metaSessions[0].id);
    } catch { }
  }, [withCompanyConfig]);

  const fetchTemplates = useCallback(async () => {
    if (!selectedSessionId) return;
    try {
      const res = await apiClient.get(`/whatsapp-templates/templates?sessionId=${selectedSessionId}`, withCompanyConfig());
      const approved = (res.data?.templates || []).filter((t: MetaTemplate) => t.status === "APPROVED");
      setTemplates(approved);
    } catch { }
  }, [selectedSessionId, withCompanyConfig]);

  const fetchCustomerLists = useCallback(async () => {
    try {
      const res = await broadcastService.getCustomerLists();
      const lists = Array.isArray(res) ? res : res?.data || [];
      setCustomerLists(lists);
    } catch { }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoadingCampaigns(true);
      const res = await broadcastService.getCampaigns({ channel: "whatsapp" }, { limit: 50 });
      const list = Array.isArray(res) ? res : res?.campaigns || [];
      setCampaigns(list.filter((c: Campaign) => c.channel === "whatsapp" || !c.channel));
    } catch { }
    finally { setLoadingCampaigns(false); }
  }, []);

  useEffect(() => { fetchSessions(); fetchCustomerLists(); fetchCampaigns(); }, []);
  useEffect(() => { fetchTemplates(); }, [selectedSessionId]);

  const addRecipients = useCallback(() => {
    const phones = recipientsText.split(/[\n,;]+/).map((p) => p.trim()).filter((p) => p.length > 0);
    const unique = [...new Set([...recipients, ...phones])];
    setRecipients(unique);
    setRecipientsText("");
  }, [recipientsText, recipients]);

  const removeRecipient = useCallback((phone: string) => {
    setRecipients((prev) => prev.filter((p) => p !== phone));
  }, []);

  const handleSelectList = useCallback(async (listId: string) => {
    setSelectedListId(listId);
    if (listId === "manual") return;
    try {
      const res = await broadcastService.getCustomersInList(listId);
      const customers = Array.isArray(res) ? res : res?.data || [];
      const phones = customers.map((c: any) => c.phone).filter(Boolean);
      setRecipients((prev) => [...new Set([...prev, ...phones])]);
    } catch { }
  }, []);

  const handleCreateCampaign = useCallback(async () => {
    if (!campaignName || !selectedTemplate || recipients.length === 0) {
      toast.error("اسم الحملة والقالب ومستلم واحد على الأقل مطلوب");
      return;
    }
    try {
      setSending(true);
      setResult(null);
      setSendProgress({ current: 0, total: recipients.length, status: "sending" });

      const body = {
        name: campaignName,
        channel: "whatsapp",
        message: `WhatsApp broadcast: ${selectedTemplate}${templateVars.length ? ` | vars: ${templateVars.join(",")}` : ""}`,
        targetAudience: selectedListId || "manual",
        waTemplateName: selectedTemplate,
        waLanguageCode: languageCode,
        sendNow: scheduleAt ? "false" : "true",
        scheduledAt: scheduleAt || undefined,
      };

      const campaignRes = await broadcastService.createCampaign(
        Object.entries(body).reduce((fd, [k, v]) => { if (v !== undefined) fd.append(k, String(v)); return fd; }, new FormData())
      );
      const campaignId = campaignRes?.data?.id || campaignRes?.id;

      setSendProgress({ current: 0, total: recipients.length, status: "sending" });
      if (scheduleAt) {
        setResult({ scheduled: true, scheduledAt: scheduleAt });
        toast.success("تم جدولة الحملة");
        setSending(false);
        setSendProgress(null);
        return;
      }

      const sendRes = await broadcastService.sendCampaign(campaignId);
      setResult(sendRes);
      toast.success(sendRes.sentCount > 0 ? `تم إرسال ${sendRes.sentCount} رسالة` : "تم الإرسال");
      setActiveTab("campaigns");
      setSelectedCampaign({} as any);
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err?.message || "فشل");
      setResult({ sent: 0, failed: 0, errors: [{ error: err?.message }] });
      setSendProgress(null);
    } finally {
      if (!scheduleAt) { setSending(false); setSendProgress(null); }
    }
  }, [campaignName, selectedTemplate, languageCode, recipients, selectedListId, templateVars, scheduleAt, withCompanyConfig, fetchCampaigns]);

  const openRate = (c: Campaign) =>
    c.sentCount > 0 ? Math.round((c.openedCount / c.sentCount) * 100) : 0;
  const clickRate = (c: Campaign) =>
    c.sentCount > 0 ? Math.round((c.clickedCount / c.sentCount) * 100) : 0;
  const deliveryRate = (c: Campaign) =>
    c.recipientCount > 0 ? Math.round((c.deliveredCount / c.recipientCount) * 100) : 0;
  const replyRate = (c: Campaign) =>
    c.sentCount > 0 ? Math.round(((c as any).repliedCount || 0) / c.sentCount * 100) : 0;

  return (
    <WhatsAppPageShell
      title="حملات بث قوالب واتساب"
      description="إنشاء وإدارة حملات إرسال قوالب Meta API مع تتبع الفتح والضغط"
      icon={Megaphone}
      backHref="/whatsapp"
      backLabel={t("common.back")}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="create"><Send className="size-4 ml-2" />إنشاء حملة</TabsTrigger>
          <TabsTrigger value="campaigns"><Megaphone className="size-4 ml-2" />الحملات السابقة</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart className="size-4 ml-2" />التحليلات</TabsTrigger>
          <TabsTrigger value="lists"><List className="size-4 ml-2" />قوائم العملاء</TabsTrigger>
        </TabsList>

        {/* ===================== CREATE CAMPAIGN TAB ===================== */}
        <TabsContent value="create" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              <WhatsAppSurfaceCard title="إعدادات الحملة" description="اختر القالب والجمهور">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label>اسم الحملة</Label>
                    <Input value={campaignName} onChange={e => setCampaignName(e.target.value)}
                      placeholder="مثال: عرض الجمعة البيضاء" />
                  </div>

                  <div className="space-y-2">
                    <Label>جلسة واتساب</Label>
                    <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="اختر جلسة" /></SelectTrigger>
                      <SelectContent>
                        {sessions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.metaDisplayPhoneNumber || s.phoneNumber || s.name || s.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>القالب (المعتمد فقط)</Label>
                    <Select value={selectedTemplate} onValueChange={(name) => {
                      setSelectedTemplate(name);
                      const tpl = templates.find(t => t.name === name);
                      if (tpl) setLanguageCode(tpl.language);
                    }}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="اختر قالباً" /></SelectTrigger>
                      <SelectContent>
                        {templates.map((t) => (
                          <SelectItem key={t.name} value={t.name}>{t.name} ({t.language})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>لغة القالب</Label>
                    <Select value={languageCode} onValueChange={setLanguageCode}>
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[...new Set(templates.map(t => t.language))].map(lang => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>قائمة العملاء</Label>
                    <Select value={selectedListId} onValueChange={handleSelectList}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="اختر قائمة" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">إدخال يدوي</SelectItem>
                        {customerLists.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.name} ({l.count})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>جدولة الإرسال</Label>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Input type="datetime-local" value={scheduleAt}
                          onChange={e => setScheduleAt(e.target.value)}
                          className="h-11" />
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setScheduleAt("")}
                        className={scheduleAt ? "" : "opacity-30"}>
                        <Clock className="size-4" /> الحذف
                      </Button>
                    </div>
                    <p className="text-xs text-[color:var(--color-muted-foreground)]">
                      {scheduleAt ? `سيتم الإرسال في ${new Date(scheduleAt).toLocaleString("ar-EG")}` : "اترك فارغاً للإرسال الفوري"}
                    </p>
                  </div>

                  {selectedTemplate && (
                    <div className="space-y-2">
                      <Label>متغيرات القالب</Label>
                      <div className="flex gap-2">
                        <Input value={templateVars[0] || ""}
                          onChange={e => setTemplateVars([e.target.value, ...templateVars.slice(1)])}
                          placeholder="اسم العميل ({{1}})" className="h-11" />
                        <Button variant="outline" size="sm" onClick={() => setTemplateVars([])}>
                          <X className="size-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-[color:var(--color-muted-foreground)]">
                        أدخل قيمة المتغير الأول في القالب ({"{1}"})
                      </p>
                    </div>
                  )}
                </div>
              </WhatsAppSurfaceCard>

              <WhatsAppSurfaceCard title="المستلمون" description={`${recipients.length} مستلم`}>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Textarea value={recipientsText} onChange={(e) => setRecipientsText(e.target.value)}
                      placeholder="أرقام الهواتف مفصولة بسطر جديد أو فاصلة"
                      className="min-h-[80px]" />
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

              <Button onClick={handleCreateCampaign}
                disabled={sending || recipients.length === 0 || !selectedTemplate || !campaignName}
                className="w-full rounded-full py-6 text-lg">
                {sending ? (
                  <span className="flex items-center gap-2">
                    <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    جاري الإرسال...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="size-5" />
                    إنشاء وإرسال الحملة ({recipients.length} مستلم)
                  </span>
                )}
              </Button>
            </div>

            <div className="lg:col-span-2">
              <Card className="rounded-3xl border-[color:var(--shell-control-border)]">
                <CardHeader>
                  <CardTitle className="text-lg">نتيجة الإرسال</CardTitle>
                  <CardDescription>تقرير الحملة بعد التنفيذ</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!result ? (
                    <p className="py-8 text-center text-sm text-[color:var(--color-muted-foreground)]">
                      {sending ? (
                        <span className="flex flex-col items-center gap-3">
                          <span className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          <span>جاري الإرسال... {sendProgress ? `${sendProgress.current}/${sendProgress.total}` : ""}</span>
                        </span>
                      ) : "لم يتم الإرسال بعد"}
                    </p>
                  ) : result.scheduled ? (
                    <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-200/80 bg-amber-500/10 p-6 text-center">
                      <Clock className="size-10 text-amber-600" />
                      <div>
                        <p className="text-lg font-bold text-amber-800">تمت الجدولة</p>
                        <p className="text-sm text-amber-700">
                          {new Date(result.scheduledAt).toLocaleString("ar-EG")}
                        </p>
                      </div>
                      <Button variant="outline" className="rounded-full mt-2"
                        onClick={() => setActiveTab("campaigns")}>
                        عرض الحملات
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-500/10 p-4">
                        <CheckCircle className="size-8 text-emerald-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-emerald-800">{result.sentCount || result.sent || 0}</p>
                          <p className="text-sm text-emerald-700">تم الإرسال بنجاح</p>
                        </div>
                      </div>
                      {(result.failedCount || result.failed) > 0 && (
                        <div className="flex items-center gap-3 rounded-2xl border border-red-200/80 bg-red-500/10 p-4">
                          <XCircle className="size-8 text-red-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-lg font-bold text-red-800">{result.failedCount || result.failed || 0}</p>
                            <p className="text-sm text-red-700">فشل</p>
                          </div>
                        </div>
                      )}
                      {result.errors?.length > 0 && (
                        <div className="space-y-2">
                          <Separator />
                          <p className="text-sm font-medium text-[color:var(--color-muted-foreground)]">تفاصيل الأخطاء:</p>
                          <div className="max-h-40 space-y-1 overflow-y-auto">
                            {result.errors.map((e: any, i: number) => (
                              <p key={i}
                                className="rounded-lg bg-[color:var(--color-muted)] px-3 py-1.5 text-xs text-red-600">
                                {e.recipient?.to || e.recipient?.phone || "?"}: {e.error}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                      <Button variant="outline" className="w-full rounded-full mt-2"
                        onClick={() => setActiveTab("campaigns")}>
                        <Megaphone className="size-4" /> عرض الحملات
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ===================== CAMPAIGNS TAB ===================== */}
        <TabsContent value="campaigns" className="space-y-6">
          {loadingCampaigns ? (
            <div className="flex justify-center py-12"><span className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" /></div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-[color:var(--color-muted-foreground)]">
              <Megaphone className="mx-auto size-12 opacity-40" />
              <p className="mt-4">لا توجد حملات بعد. أنشئ أول حملة لك.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {campaigns.map((c) => {
                const isExpanded = expandedCampaignId === c.id;
                const metrics = [
                  { label: "أُرسل", value: c.sentCount || 0, pct: 100, color: "bg-blue-500" },
                  { label: "تم التسليم", value: c.deliveredCount || 0, pct: deliveryRate(c), color: "bg-emerald-500" },
                  { label: "فتح", value: c.openedCount || 0, pct: openRate(c), color: "bg-violet-500" },
                  { label: "نقر", value: c.clickedCount || 0, pct: clickRate(c), color: "bg-amber-500" },
                  { label: "رد", value: (c as any).repliedCount || 0, pct: replyRate(c), color: "bg-rose-500" },
                ];
                return (
                <Card key={c.id} className={`rounded-2xl cursor-pointer transition-all hover:shadow-md ${isExpanded ? "ring-2 ring-emerald-500/30" : ""}`}
                  onClick={() => setExpandedCampaignId(isExpanded ? null : c.id)}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-lg">{c.name}</h3>
                        <p className="text-sm text-[color:var(--color-muted-foreground)] truncate">
                          {c.waTemplateName && `قالب: ${c.waTemplateName}`}
                          {c.sentAt && ` • ${new Date(c.sentAt).toLocaleString("ar-EG")}`}
                        </p>
                      </div>
                      <Badge variant={c.status === "sent" ? "default" : c.status === "failed" ? "destructive" : "secondary"}
                        className="shrink-0 mr-2">
                        {c.status === "sent" ? "تم" : c.status === "failed" ? "فشل" : c.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div><p className="text-lg font-bold">{c.sentCount || 0}</p><p className="text-xs text-[color:var(--color-muted-foreground)]">أُرسل</p></div>
                      <div><p className="text-lg font-bold">{openRate(c)}%</p><p className="text-xs text-[color:var(--color-muted-foreground)]"><Eye className="size-3 inline" /> فتح</p></div>
                      <div><p className="text-lg font-bold">{clickRate(c)}%</p><p className="text-xs text-[color:var(--color-muted-foreground)]"><MousePointerClick className="size-3 inline" /> نقر</p></div>
                      <div><p className="text-lg font-bold">{replyRate(c)}%</p><p className="text-xs text-[color:var(--color-muted-foreground)]"><Reply className="size-3 inline" /> رد</p></div>
                    </div>

                    {isExpanded && (
                      <div className="mt-5 pt-4 border-t space-y-4"
                        onClick={e => e.stopPropagation()}>
                        <div className="grid grid-cols-5 gap-3">
                          {metrics.map(m => (
                            <div key={m.label} className="text-center">
                              <div className="h-24 flex items-end justify-center gap-0.5">
                                <div className="w-full max-w-[32px] rounded-t"
                                  style={{ height: `${Math.max(m.pct * (m.pct < 10 ? 3 : 1), 4)}%`, background: m.color.replace("bg-", "") }}
                                  data-color={m.color.replace("bg-", "")}
                                >
                                  {m.color === "bg-blue-500" ? "" : (
                                    <div className={`h-full w-full rounded-t ${m.color} opacity-80`} />
                                  )}
                                </div>
                              </div>
                              <p className={`text-lg font-bold mt-1 ${m.value === 0 ? "opacity-40" : ""}`}>{m.value}</p>
                              <p className="text-[11px] text-[color:var(--color-muted-foreground)]">{m.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
              })}
            </div>
          )}
        </TabsContent>

        {/* ===================== ANALYTICS TAB ===================== */}
        <TabsContent value="analytics" className="space-y-6">
          {campaigns.length === 0 ? (
            <div className="text-center py-12 text-[color:var(--color-muted-foreground)]">
              <BarChart className="mx-auto size-12 opacity-40" />
              <p className="mt-4">لا توجد بيانات إحصائية بعد</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-2xl">
                  <CardContent className="p-5 text-center">
                    <p className="text-2xl font-bold">{campaigns.length}</p>
                    <p className="text-sm text-[color:var(--color-muted-foreground)]">إجمالي الحملات</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl">
                  <CardContent className="p-5 text-center">
                    <p className="text-2xl font-bold">
                      {campaigns.reduce((s, c) => s + openRate(c), 0) / (campaigns.length || 1)}%
                    </p>
                    <p className="text-sm text-[color:var(--color-muted-foreground)]"><Eye className="size-4 inline" /> متوسط الفتح</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl">
                  <CardContent className="p-5 text-center">
                    <p className="text-2xl font-bold">
                      {campaigns.reduce((s, c) => s + clickRate(c), 0) / (campaigns.length || 1)}%
                    </p>
                    <p className="text-sm text-[color:var(--color-muted-foreground)]"><MousePointerClick className="size-4 inline" /> متوسط النقر</p>
                  </CardContent>
                </Card>
                <Card className="rounded-2xl">
                  <CardContent className="p-5 text-center">
                    <p className="text-2xl font-bold">
                      {campaigns.reduce((s, c) => s + replyRate(c), 0) / (campaigns.length || 1)}%
                    </p>
                    <p className="text-sm text-[color:var(--color-muted-foreground)]"><Reply className="size-4 inline" /> متوسط الرد</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl">
                <CardHeader><CardTitle className="text-lg">تفاصيل الحملات</CardTitle></CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-right py-2 px-3">الحملة</th>
                          <th className="text-right py-2 px-3">مرسل</th>
                          <th className="text-right py-2 px-3">تم التسليم</th>
                          <th className="text-right py-2 px-3">فتح</th>
                          <th className="text-right py-2 px-3">نقر</th>
                          <th className="text-right py-2 px-3">رد</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.map((c) => (
                          <tr key={c.id} className="border-b hover:bg-[color:var(--color-muted)]/30">
                            <td className="py-2 px-3 font-medium">{c.name}</td>
                            <td className="py-2 px-3">{c.sentCount || 0}</td>
                            <td className="py-2 px-3">{c.deliveredCount || 0} ({deliveryRate(c)}%)</td>
                            <td className="py-2 px-3">{c.openedCount || 0} ({openRate(c)}%)</td>
                            <td className="py-2 px-3">{c.clickedCount || 0} ({clickRate(c)}%)</td>
                            <td className="py-2 px-3">{(c as any).repliedCount || 0} ({replyRate(c)}%)</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ===================== CUSTOMER LISTS TAB ===================== */}
        <TabsContent value="lists" className="space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">قوائم العملاء</CardTitle>
                  <CardDescription>إدارة قوائم العملاء لاستخدامها في حملات واتساب</CardDescription>
                </div>
                <Button variant="outline" className="rounded-full" onClick={async () => {
                  const name = prompt("اسم القائمة الجديدة:");
                  if (!name) return;
                  try {
                    await broadcastService.createCustomerList({
                      name, description: "", criteria: { type: "all" }
                    } as any);
                    toast.success("تم إنشاء القائمة");
                    fetchCustomerLists();
                  } catch { toast.error("فشل إنشاء القائمة"); }
                }}>
                  <UserPlus className="size-4" /> قائمة جديدة
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {customerLists.length === 0 ? (
                <div className="text-center py-8 text-[color:var(--color-muted-foreground)]">
                  <List className="mx-auto size-10 opacity-40" />
                  <p className="mt-2">لا توجد قوائم عملاء. أنشئ قائمة جديدة للبدء.</p>
                </div>
              ) : (
                customerLists.map((l) => {
                  const isExpanded = expandedListId === l.id;
                  const members = listMembers[l.id] || [];
                  return (
                    <div key={l.id} className="rounded-xl border">
                      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-[color:var(--color-muted)]/30"
                        onClick={async () => {
                          if (isExpanded) { setExpandedListId(null); return; }
                          setExpandedListId(l.id);
                          if (members.length === 0 && l.count > 0) {
                            setLoadingMembers(true);
                            try {
                              const res = await broadcastService.getCustomersInList(l.id);
                              setListMembers(prev => ({ ...prev, [l.id]: Array.isArray(res) ? res : res?.data || [] }));
                            } catch { }
                            finally { setLoadingMembers(false); }
                          }
                        }}>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{l.name}</p>
                          <p className="text-sm text-[color:var(--color-muted-foreground)] truncate">{l.description || `${l.count} عميل`}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary">{l.count}</Badge>
                          {!l.isDefault && (
                            <button onClick={(e) => { e.stopPropagation();
                              if (confirm("حذف القائمة؟")) broadcastService.deleteCustomerList(l.id).then(() => { toast.success("تم الحذف"); fetchCustomerLists(); }).catch(() => toast.error("فشل الحذف"));
                            }} className="p-1.5 rounded-full hover:bg-red-500/10 text-red-500">
                              <XCircle className="size-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t px-3 py-3 space-y-2 max-h-48 overflow-y-auto">
                          {loadingMembers ? (
                            <p className="text-sm text-[color:var(--color-muted-foreground)]">جاري التحميل...</p>
                          ) : members.length === 0 ? (
                            <p className="text-sm text-[color:var(--color-muted-foreground)]">لا يوجد عملاء في هذه القائمة</p>
                          ) : (
                            members.map((m: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-sm py-1">
                                <span>{m.firstName || m.name || "?"} {m.lastName || ""}</span>
                                <span className="text-[color:var(--color-muted-foreground)]" dir="ltr">{m.phone || ""}</span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </WhatsAppPageShell>
  );
};

export default WhatsAppTemplateBroadcast;
