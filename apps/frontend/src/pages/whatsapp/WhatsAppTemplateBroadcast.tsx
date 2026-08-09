import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  Send, Megaphone, CheckCircle, XCircle, UserPlus, X, Clock, BarChart, Eye, MousePointerClick, Reply, List, Image as ImageIcon, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";

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
import { customerService } from "../../services/customerService";
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
= ({ companyId, companyName: _companyName, superAdminMode: _superAdminMode = false }) => {
  const { t, i18n } = useTranslation();
  void i18n;
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState("create");

  // Session & Template
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [templates, setTemplates] = useState<MetaTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [languageCode, setLanguageCode] = useState("en");

  // Header media for Meta templates with an IMAGE header
  const [waHeaderMedia, setWaHeaderMedia] = useState("");
  const [headerMediaName, setHeaderMediaName] = useState("");
  const [headerUploading, setHeaderUploading] = useState(false);

  // Campaign creation
  const [campaignName, setCampaignName] = useState("");
  const [customerLists, setCustomerLists] = useState<CustomerList[]>([]);
  const [selectedListId, setSelectedListId] = useState("");
  const [leadCategories, setLeadCategories] = useState<{ id: string; name: string; color: string | null; contactCount: number }[]>([]);
  const [selectedLeadCategoryId, setSelectedLeadCategoryId] = useState("");
  const [recipientsText, setRecipientsText] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<{ name: string; count: number }[]>([]);
  const [selectedTag, setSelectedTag] = useState("");

  const [scheduleAt, setScheduleAt] = useState("");
  const [templateVars, _setTemplateVars] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  void result;
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number; status: string } | null>(null);
  void sendProgress;

  const [_sendNow, _setSendNow] = useState(true);

  // Campaigns history
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // Analytics
  const [_analytics, _setAnalytics] = useState<any>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  void selectedCampaign;
  void setSelectedCampaign;

  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [listMembers, setListMembers] = useState<Record<string, any[]>>({});
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [importingCategoryId, setImportingCategoryId] = useState<string | null>(null);



  const withCompanyConfig = useCallback(
    (config: ApiRequestConfig = {}) => companyId ? { ...config, _companyId: companyId } : config, [companyId],
  );

  const fetchSessions = useCallback(async () => {
    try {
      const res = await apiClient.get("/whatsapp/sessions", withCompanyConfig());
      const metaSessions = ((res as any).data?.sessions || []).filter(
        (s: any) => s.provider === "META_CLOUD" || s.metaWabaId,
      );
      setSessions(metaSessions);
      if (metaSessions.length > 0 && !selectedSessionId) setSelectedSessionId(metaSessions[0].id);
    } catch { }
  }, [withCompanyConfig]);

  const fetchTemplates = useCallback(async () => {
    if (!selectedSessionId) {
      setTemplates([]);
      setSelectedTemplate("");
      return;
    }
    try {
      setTemplates([]);
      setSelectedTemplate("");
      const res = await apiClient.get(`/whatsapp-templates/templates?sessionId=${selectedSessionId}`, withCompanyConfig());
      const approved = ((res as any).data?.templates || []).filter((t: MetaTemplate) => t.status === "APPROVED");
      setTemplates(approved);
    } catch {
      setTemplates([]);
      setSelectedTemplate("");
    }
  }, [selectedSessionId, withCompanyConfig]);

  const fetchCustomerLists = useCallback(async () => {
    try {
      const res = await broadcastService.getCustomerLists();
      const lists = Array.isArray(res) ? res : (res as any)?.data || [];
      setCustomerLists(lists);
    } catch { }
  }, []);

  const fetchLeadCategories = useCallback(async () => {
    try {
      const res = await apiClient.get("/whatsapp/lead-categories", withCompanyConfig());
      setLeadCategories((res as any).data?.data || []);
    } catch { }
  }, [withCompanyConfig]);

  const fetchDistinctTags = useCallback(async () => {
    try {
      const res = await customerService.getDistinctTags();
      setAvailableTags(res);
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

  useEffect(() => { 
    fetchSessions(); 
    fetchCustomerLists(); 
    fetchCampaigns(); 
    fetchLeadCategories(); 
    fetchDistinctTags(); 
  }, []);
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

  const fetchAllListPhones = useCallback(async (listId: string): Promise<string[]> => {
    const phones: string[] = [];
    const pageSize = 200;
    let page = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const res = await broadcastService.getCustomersInListPaginated(listId, page, pageSize);
      const customers = (res as any)?.data || [];
      customers.forEach((c: any) => {
        if (c?.phone) phones.push(c.phone);
      });
      const total = (res as any)?.total ?? customers.length;
      if (!customers.length || page * pageSize >= total) break;
      page += 1;
    }
    return phones;
  }, []);

  const handleSelectList = useCallback(async (listId: string) => {
    setSelectedListId(listId);
    if (listId === "manual") return;
    try {
      const phones = await fetchAllListPhones(listId);
      if (phones.length === 0) {
        toast.warning("لا يوجد أرقام هواتف في هذه القائمة");
        return;
      }
      setRecipients((prev) => [...new Set([...prev, ...phones])]);
      toast.success(`تم تحميل ${phones.length} عميل من القائمة`);
    } catch {
      tToast.error("WhatsAppTemplateBroadcast.failed_load_914a");
    }
  }, []);

  useEffect(() => {
    const urlListId = searchParams.get("listId");
    if (!urlListId || urlListId === "manual") return;
    let cancelled = false;
    const apply = async () => {
      const res = await broadcastService.getCustomerLists();
      const lists = Array.isArray(res) ? res : (res as any)?.data || [];
      const found = lists.find((l: any) => l.id === urlListId);
      if (cancelled) return;
      if (found) {
        setActiveTab("create");
        await handleSelectList(found.id);
        toast.success(`تم تحميل القائمة "${found.name}" (${found.count} عميل)`);
      } else {
        toast.error("القائمة المحددة غير موجودة");
      }
    };
    void apply();
    return () => { cancelled = true; };
  }, [searchParams, handleSelectList]);

  const handleSelectTag = useCallback(async (tagName: string) => {
    setSelectedTag(tagName);
    if (!tagName || tagName === "none") return;
    try {
      const res = await customerService.getCustomers({ tag: tagName, limit: 1000 });
      const customers = res.data || [];
      const phones = customers.map((c: any) => c.phone).filter(Boolean);
      setRecipients((prev) => [...new Set([...prev, ...phones])]);
      toast.success(`تم تحميل ${phones.length} عميل يحمل الوسم: ${tagName}`);
    } catch (err: any) {
      tToast.error("WhatsAppTemplateBroadcast.failed_load_914a");
    }
  }, []);

  const handleImportFromCategory = useCallback(async (categoryId: string, categoryName: string) => {
    setImportingCategoryId(categoryId);
    try {
      const res = await apiClient.get(`/whatsapp/lead-categories/${categoryId}/contacts`, withCompanyConfig());
      const contacts = (res as any).data?.data || [];
      const phones = contacts.map((c: any) => c.phoneNumber).filter(Boolean);
      if (phones.length === 0) {
        toast.warning(`لا يوجد جهات اتصال في تصنيف "${categoryName}"`);
        return;
      }
      setRecipients((prev) => [...new Set([...prev, ...phones])]);
      toast.success(`تم استيراد ${phones.length} جهة اتصال من "${categoryName}"`);
      setActiveTab("create");
    } catch (err: any) {
      tToast.error("WhatsAppTemplateBroadcast.msg_e35f");
    } finally {
      setImportingCategoryId(null);
    }
  }, [withCompanyConfig]);

  const handleCreateCampaign = useCallback(async () => {
    if (!campaignName || !selectedTemplate || recipients.length === 0) {
      tToast.error("WhatsAppTemplateBroadcast.msg_03ea");
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
        waHeaderMedia: waHeaderMedia || undefined,
        whatsAppSessionId: selectedSessionId,
        manualPhones: JSON.stringify(recipients),
        sendNow: scheduleAt ? "false" : "true",
        scheduledAt: scheduleAt || undefined,
      };

      const campaignRes = await broadcastService.createCampaign(
        Object.entries(body).reduce((fd, [k, v]) => { if (v !== undefined) fd.append(k, String(v)); return fd; }, new FormData())
      );
      const campaignId = (campaignRes as any)?.data?.id || (campaignRes as any)?.id;

      setSendProgress({ current: 0, total: recipients.length, status: "sending" });
      if (scheduleAt) {
        setResult({ scheduled: true, scheduledAt: scheduleAt });
        tToast.success("WhatsAppTemplateBroadcast.msg_be37");
        setSending(false);
        setSendProgress(null);
        return;
      }

      const sendRes = await broadcastService.sendCampaign(campaignId, recipients);
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
  }, [campaignName, selectedTemplate, languageCode, recipients, selectedListId, templateVars, scheduleAt, selectedSessionId, withCompanyConfig, fetchCampaigns, waHeaderMedia]);

  const handleUploadHeaderMedia = useCallback(async (file: File) => {
    if (!selectedSessionId) {
      tToast.error("WhatsAppTemplateBroadcast.msg_03ea");
      return;
    }
    setHeaderUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("sessionId", selectedSessionId);
      const res = await apiClient.post<{ success?: boolean; mediaId?: string; fileName?: string; error?: string }>(
        "/whatsapp-templates/templates/upload-media",
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, ...withCompanyConfig() },
      );
      const data = res.data;
      if (data?.success && data.mediaId) {
        setWaHeaderMedia(data.mediaId);
        setHeaderMediaName(data.fileName || file.name);
        toast.success("تم رفع صورة الرأس — سترسل في هيدر القالب لكل عميل");
      } else {
        toast.error(data?.error || "فشل رفع الصورة");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "فشل رفع الصورة إلى ميتا");
    } finally {
      setHeaderUploading(false);
    }
  }, [selectedSessionId, withCompanyConfig]);

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
      backLabel={t("common.back") as string}
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
                    <Select value={selectedSessionId} onValueChange={(v) => setSelectedSessionId(v ?? '')}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="اختر جلسة">
                          {(value: string | null) => {
                            if (!value) return null;
                            const s = sessions.find((x) => x.id === value);
                            if (!s) return value;
                            const isCuid = s.name && s.name.length === 25 && /^[a-z0-9]+$/.test(s.name);
                            const nameToUse = isCuid ? "جلسة واتساب" : s.name;
                            const phone = s.metaDisplayPhoneNumber || s.phoneNumber;
                            return phone ? `${nameToUse} (${phone})` : nameToUse;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {sessions.map((s) => {
                          const isCuid = s.name && s.name.length === 25 && /^[a-z0-9]+$/.test(s.name);
                          const nameToUse = isCuid ? "جلسة واتساب" : s.name;
                          const phone = s.metaDisplayPhoneNumber || s.phoneNumber;
                          return (
                            <SelectItem key={s.id} value={s.id}>
                              {phone ? `${nameToUse} (${phone})` : nameToUse}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>القالب (المعتمد فقط)</Label>
                    <Select value={selectedTemplate} onValueChange={(name) => {
                      const selectedName = name ?? '';
                      setSelectedTemplate(selectedName);
                      const tpl = templates.find(t => t.name === selectedName);
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
                    <Label>صورة الرأس (اختياري — لقوالب الهيدر IMAGE)</Label>
                    {waHeaderMedia ? (
                      <div className="flex h-11 items-center gap-2 rounded-lg border border-[color:var(--shell-control-border)] bg-[var(--color-muted)] px-3">
                        <ImageIcon className="size-4 shrink-0 text-[color:var(--color-muted-foreground)]" />
                        <span className="flex-1 truncate text-sm text-[color:var(--color-muted-foreground)]" dir="ltr">
                          {headerMediaName || waHeaderMedia}
                        </span>
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => { setWaHeaderMedia(""); setHeaderMediaName(""); }}>
                          إزالة
                        </Button>
                      </div>
                    ) : (
                      <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[color:var(--shell-control-border)] bg-[var(--color-muted)] text-sm text-[color:var(--color-muted-foreground)] hover:bg-[var(--shell-overlay-bg)]">
                        {headerUploading ? (
                          <><RefreshCw className="size-4 animate-spin" /> جاري الرفع إلى ميتا...</>
                        ) : (
                          <><ImageIcon className="size-4" /> اختر صورة تُرسل في هيدر القالب</>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={headerUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUploadHeaderMedia(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                    <p className="text-[10px] text-[color:var(--color-muted-foreground)]">
                      تظهر الصورة في كل رسالة من الحملة (يمكن لكل قالب هيدره IMAGE فقط). لتغيير الصورة لكل عميل، استخدم رابط HTTPS مخصص في البث.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>لغة القالب</Label>
                    <Select value={languageCode} onValueChange={(v) => setLanguageCode(v ?? '')}>
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
                    <Select value={selectedListId} onValueChange={(v) => void handleSelectList(v ?? '')}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="اختر قائمة" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">إدخال يدوي</SelectItem>
                        {customerLists.map((l) => (
                          <SelectItem key={l.id} value={l.id}>{l.name} ({l.count})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {availableTags.length > 0 && (
                    <div className="space-y-2">
                      <Label>تصفية بالوسم (Tag)</Label>
                      <Select value={selectedTag} onValueChange={(v) => void handleSelectTag(v ?? '')}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="اختر وسماً لتحميل الأرقام" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- بدون تصفية بالوسم --</SelectItem>
                          {availableTags.map((tag) => (
                            <SelectItem key={tag.name} value={tag.name}>
                              🏷️ {tag.name} ({tag.count})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>تصنيف العملاء</Label>
                    <Select value={selectedLeadCategoryId} onValueChange={(v) => setSelectedLeadCategoryId(v ?? '')}>
                      <SelectTrigger className="h-11"><SelectValue placeholder="جميع التصنيفات" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">جميع التصنيفات</SelectItem>
                        {leadCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="flex items-center gap-2">
                              <span className="inline-block size-2.5 rounded-full" style={{ background: cat.color || '#6366f1' }} />
                              {cat.name} ({cat.contactCount})
                            </span>
                          </SelectItem>
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
                    <div className="space-y-2 rounded-2xl border border-emerald-200/80 bg-emerald-500/5 p-4">
                      <Label className="text-emerald-800 flex items-center gap-2">
                        <CheckCircle className="size-4" /> تخصيص الرسالة
                      </Label>
                      <p className="text-xs text-emerald-700">
                        سيتم تعبئة {"{1}"} تلقائياً باسم العميل الأول. {"{2}"} = اسم العائلة.
                        القوالب بدون متغيرات لن تتأثر.
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
                  <CardTitle className="text-lg">تصنيفات العملاء</CardTitle>
                  <CardDescription>استيراد جهات الاتصال من التصنيفات المتاحة في صفحة تقسيم العملاء</CardDescription>
                </div>
                <Button variant="outline" className="rounded-full" asChild>
                  <a href="/customers/segments">
                    <List className="size-4" /> مركز التقسيم
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {leadCategories.length === 0 ? (
                <div className="text-center py-8 text-[color:var(--color-muted-foreground)]">
                  <List className="mx-auto size-10 opacity-40" />
                  <p className="mt-2">لا توجد تصنيفات عملاء. أنشئ تصنيفات من صفحة تقسيم العملاء.</p>
                </div>
              ) : (
                leadCategories.map((cat) => {
                  const isExpanded = expandedListId === cat.id;
                  const members = listMembers[cat.id] || [];
                  const isImporting = importingCategoryId === cat.id;
                  return (
                    <div key={cat.id} className="rounded-xl border">
                      <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-[color:var(--color-muted)]/30"
                        onClick={async () => {
                          if (isExpanded) { setExpandedListId(null); return; }
                          setExpandedListId(cat.id);
                          if (members.length === 0 && cat.contactCount > 0) {
                            setLoadingMembers(true);
                            try {
                              const res = await apiClient.get(`/whatsapp/lead-categories/${cat.id}/contacts`, withCompanyConfig());
                              setListMembers(prev => ({ ...prev, [cat.id]: (res as any).data?.data || [] }));
                            } catch { }
                            finally { setLoadingMembers(false); }
                          }
                        }}>
                        <div className="min-w-0 flex-1 flex items-center gap-3">
                          <span className="inline-block size-3 rounded-full shrink-0" style={{ background: cat.color || '#6366f1' }} />
                          <div>
                            <p className="font-medium">{cat.name}</p>
                            <p className="text-sm text-[color:var(--color-muted-foreground)]">{cat.contactCount} جهة اتصال</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant="default"
                            size="sm"
                            className="rounded-full"
                            disabled={isImporting || cat.contactCount === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImportFromCategory(cat.id, cat.name);
                            }}
                          >
                            {isImporting ? (
                              <span className="flex items-center gap-1">
                                <span className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
                                جاري الاستيراد...
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <UserPlus className="size-3" /> استيراد
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t px-3 py-3 space-y-2 max-h-48 overflow-y-auto">
                          {loadingMembers ? (
                            <p className="text-sm text-[color:var(--color-muted-foreground)]">جاري التحميل...</p>
                          ) : members.length === 0 ? (
                            <p className="text-sm text-[color:var(--color-muted-foreground)]">لا يوجد جهات اتصال في هذا التصنيف</p>
                          ) : (
                            members.map((m: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-sm py-1">
                                <span>{m.name || m.pushName || "?"}</span>
                                <span className="text-[color:var(--color-muted-foreground)]" dir="ltr">{m.phoneNumber || ""}</span>
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
