import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Send, Megaphone, Settings2, List, Users, Plus, CheckCircle, XCircle, Image as ImageIcon, Clock, Trash2, RefreshCw, Search, Layers,
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
import { apiClient } from "../../services/apiClient";
import { broadcastService } from "../../services/broadcastService";
import MetaTemplatesModal from "./components/MetaTemplatesModal";

interface Session {
  sessionId: string;
  phoneNumber?: string;
  isConnected?: boolean;
  status?: string;
}

interface OfferProduct {
  id: string;
  name: string;
  price: number | string;
  images?: string | string[] | null;
  description?: string;
}

interface Campaign {
  id: string;
  name: string;
  channel: string;
  status: string;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  message: string;
  targetAudience?: string;
  createdAt: string;
  sentAt?: string;
}

interface AutoSendSettings {
  newProductAutoSend: boolean;
  newProductAudience: string;
  newProductNewDays: number;
  newProductMessage: string;
}

interface SendResult {
  campaignId?: string;
  total?: number;
  status?: string;
  scheduledAt?: string;
}

const AUDIENCE_OPTIONS = [
  { value: "all", label: "كل العملاء", icon: "👥" },
  { value: "withOrders", label: "أصحاب الطلبات", icon: "🛒" },
  { value: "newCustomers", label: "العملاء الجدد", icon: "🆕" },
  { value: "activeCustomers", label: "النشطون", icon: "🔥" },
];

const DEFAULT_MESSAGE = `عزيزي {اسم العميل} ✨

نبشرك بمنتجننا الجديد! 🎉

✨ {productName}
💰 السعر: {price} جنيه

اطلبه الآن من متجرنا 🛍️`;

function parseProductImages(raw?: string | string[] | null): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

const ProductOffers: React.FC = () => {
  const { t } = useTranslation();

  // ── Sessions ──
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState("");

  // ── Product picker ──
  const [products, setProducts] = useState<OfferProduct[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<OfferProduct | null>(null);

  // ── Audience ──
  const [audience, setAudience] = useState("all");
  const [newDays, setNewDays] = useState(7);
  const [audienceCount, setAudienceCount] = useState<number | null>(null);

  // ── Message ──
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [metaModalOpen, setMetaModalOpen] = useState(false);

  // ── Schedule ──
  const [scheduleAt, setScheduleAt] = useState("");

  // ── Sending ──
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  // ── Campaigns history ──
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // ── Auto-send settings ──
  const [settings, setSettings] = useState<AutoSendSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const res = await apiClient.get(`/customers/whatsapp-notify/sessions?t=${Date.now()}`);
      const list: Session[] = res.data?.sessions || [];
      setSessions(list);
      const active = list.find((s) => s.isConnected);
      if (active) setSelectedSession(active.sessionId);
      else if (list.length > 0) setSelectedSession(list[0].sessionId);
    } catch {
      setSessions([]);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const res = await apiClient.get(`/customers/whatsapp-notify/products?limit=1000`);
      setProducts((res.data?.data || []).filter((p: OfferProduct) => p && p.id));
    } catch {
      setProducts([]);
    }
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      setLoadingCampaigns(true);
      const res = await broadcastService.getCampaigns();
      const list = Array.isArray(res) ? res : res?.campaigns || [];
      setCampaigns(list.filter((c: Campaign) => c.channel === "whatsapp" || !c.channel));
    } catch {
      setCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      const res = await apiClient.get(`/customers/whatsapp-notify/auto-send-settings`);
      setSettings(res.data?.data || null);
    } catch {
      setSettings(null);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    loadProducts();
    loadCampaigns();
    loadSettings();
  }, [loadSessions, loadProducts, loadCampaigns, loadSettings]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const previewAudience = useCallback(async () => {
    try {
      setAudienceCount(null);
      const res = await apiClient.get(`/customers/whatsapp-notify/preview-audience`, {
        params: { audience, newDays },
      });
      setAudienceCount(res.data?.count ?? null);
    } catch {
      setAudienceCount(null);
      toast.error("تعذر حساب عدد الجمهور");
    }
  }, [audience, newDays]);

  const selectProduct = useCallback((p: OfferProduct) => {
    setSelectedProduct(p);
    const image = parseProductImages(p.images)[0];
    setMessage(DEFAULT_MESSAGE.replace(/\{productName\}/g, p.name).replace(/\{price\}/g, String(p.price ?? "")));
    if (image) {
      // لا شيء — الصورة تتبعت تلقائياً من الباكند (أول صورة للمنتج)
    }
  }, []);

  const handleSend = useCallback(async () => {
    if (!selectedProduct) {
      toast.error("اختر منتج أولاً");
      return;
    }
    if (!message.trim()) {
      toast.error("اكتب الرسالة");
      return;
    }
    if (!selectedSession) {
      toast.error("لا توجد جلسة واتساب متصلة");
      return;
    }
    setSending(true);
    setResult(null);
    try {
      const payload: Record<string, unknown> = {
        audience,
        message: message.trim(),
        sessionId: selectedSession,
        productId: selectedProduct.id,
        eventType: "PROMOTIONAL",
      };
      if (audience === "newCustomers") payload.newDays = newDays;
      if (scheduleAt) payload.sendAt = new Date(scheduleAt).toISOString();

      const res = await apiClient.post("/customers/whatsapp-notify/smart-send", payload);
      if (res.data?.success) {
        setResult({
          campaignId: res.data.campaignId,
          total: res.data.total,
          status: res.data.status,
          scheduledAt: res.data.scheduledAt,
        });
        toast.success(
          res.data.status === "scheduled"
            ? `تمت جدولة إرسال ${res.data.total} رسالة`
            : `بدأ إرسال ${res.data.total} رسالة في الخلفية`
        );
        setTimeout(() => loadCampaigns(), 2000);
      } else {
        toast.error(res.data?.message || "فشل الإرسال");
      }
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message || e?.message || "فشل الإرسال");
    } finally {
      setSending(false);
    }
  }, [selectedProduct, message, selectedSession, audience, newDays, scheduleAt, loadCampaigns]);

  const handleSaveSettings = useCallback(async () => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const res = await apiClient.put(`/customers/whatsapp-notify/auto-send-settings`, {
        newProductAutoSend: settings.newProductAutoSend,
        newProductAudience: settings.newProductAudience,
        newProductNewDays: settings.newProductNewDays,
        newProductMessage: settings.newProductMessage,
      });
      setSettings(res.data?.data || settings);
      toast.success("تم حفظ الإعدادات");
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      toast.error(e?.response?.data?.message || "فشل حفظ الإعدادات");
    } finally {
      setSavingSettings(false);
    }
  }, [settings]);

  const campaignStatusBadge = (c: Campaign) => {
    switch (c.status) {
      case "completed":
      case "sent":
        return <Badge className="bg-emerald-500/15 text-emerald-700 border border-emerald-200/60">تم</Badge>;
      case "running":
        return <Badge className="bg-blue-500/15 text-blue-700 border border-blue-200/60">جاري</Badge>;
      case "scheduled":
        return <Badge className="bg-amber-500/15 text-amber-700 border border-amber-200/60">مجدولة</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500/15 text-red-700 border border-red-200/60">ملغاة</Badge>;
      default:
        return <Badge variant="secondary">{c.status}</Badge>;
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[color:color-mix(in_srgb,var(--color-primary)_10%,var(--color-card))] text-[color:var(--color-primary)]">
          <Megaphone className="size-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-[color:var(--color-foreground)]">عروض المنتجات</h1>
          <p className="text-sm text-[color:var(--color-muted-foreground)]">
            إرسال عروض ومنتجات جديدة لعملائك عبر الواتساب — مع الإرسال التلقائي لكل منتج جديد
          </p>
        </div>
      </div>

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="create"><Send className="size-4 ml-2" />إنشاء عرض</TabsTrigger>
          <TabsTrigger value="history"><List className="size-4 ml-2" />العروض السابقة</TabsTrigger>
          <TabsTrigger value="settings"><Settings2 className="size-4 ml-2" />الإعدادات</TabsTrigger>
        </TabsList>

        {/* ══════════ CREATE OFFER ══════════ */}
        <TabsContent value="create" className="space-y-6">
          <Card className="rounded-3xl border-[color:var(--shell-control-border)]">
            <CardHeader>
              <CardTitle className="text-lg">تفاصيل العرض</CardTitle>
              <CardDescription>اختر المنتج والجمهور ورسالة العرض</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>المنتج</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[color:var(--color-muted-foreground)]" />
                    <Input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="ابحث عن منتج..."
                      className="h-11 rounded-full pr-9"
                    />
                  </div>
                </div>
                <div className="max-h-52 space-y-1.5 overflow-y-auto rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)]/40 p-2">
                  {filteredProducts.length === 0 && (
                    <p className="py-6 text-center text-sm text-[color:var(--color-muted-foreground)]">لا توجد منتجات</p>
                  )}
                  {filteredProducts.map((p) => {
                    const img = parseProductImages(p.images)[0];
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectProduct(p)}
                        className={`flex w-full items-center gap-3 rounded-xl border-2 px-3 py-2 text-right transition-all ${
                          selectedProduct?.id === p.id
                            ? "border-[color:var(--color-primary)] bg-[color:color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))]"
                            : "border-transparent hover:border-[color:var(--shell-control-border)]"
                        }`}
                      >
                        {img ? (
                          <img src={img} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[color:var(--color-muted)]">
                            <ImageIcon className="size-5 text-[color:var(--color-muted-foreground)]" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{p.name}</p>
                          <p className="text-xs text-[color:var(--color-muted-foreground)]">{p.price} جنيه</p>
                        </div>
                        {selectedProduct?.id === p.id && (
                          <CheckCircle className="size-5 text-[color:var(--color-primary)]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>لمن تريد الإرسال؟</Label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAudience(opt.value)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                        audience === opt.value
                          ? "border-[color:var(--color-primary)] bg-[color:color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))]"
                          : "border-[color:var(--shell-control-border)] hover:border-[color:var(--color-primary)]/40"
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className="text-xs font-bold">{opt.label}</span>
                    </button>
                  ))}
                </div>
                {audience === "newCustomers" && (
                  <div className="flex items-center gap-3">
                    <Label className="text-sm">جدد خلال آخر</Label>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={newDays}
                      onChange={(e) => setNewDays(parseInt(e.target.value) || 7)}
                      className="h-9 w-24"
                    />
                    <Label className="text-sm">يوم</Label>
                  </div>
                )}
                <Button variant="outline" size="sm" className="rounded-full" onClick={previewAudience}>
                  <Users className="size-4" />
                  معاينة عدد الجمهور
                  {audienceCount !== null && <span className="font-bold">: {audienceCount} عميل</span>}
                </Button>
              </div>

              <div className="space-y-2">
                <Label>رسالة العرض</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[140px] rounded-2xl"
                />
                <p className="text-xs text-[color:var(--color-muted-foreground)]">
                  متغيرات: {"{اسم العميل}"} / {"{customerName}"} / {"{productName}"} / {"{price}"}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMetaModalOpen(true)}
                  className="rounded-full border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300"
                >
                  📚 قوالب ميتا معتمدة
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>جلسة الواتساب</Label>
                  <Select value={selectedSession} onValueChange={(v) => setSelectedSession(v ?? "")}>
                    <SelectTrigger className="h-11 rounded-full">
                      <SelectValue placeholder="اختر جلسة" />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((s) => (
                        <SelectItem key={s.sessionId} value={s.sessionId}>
                          {s.phoneNumber || s.sessionId} {s.isConnected ? "✓ متصلة" : "(غير متصلة)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>جدولة الإرسال (اختياري)</Label>
                  <Input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="h-11 rounded-full"
                  />
                </div>
              </div>

              <Separator />
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-[color:var(--color-muted-foreground)]">
                  {selectedProduct
                    ? `سيتم إرسال صورة "${selectedProduct.name}" + الرسالة مع تخصيص اسم كل عميل`
                    : "اختر منتجاً لبدء العرض"}
                </p>
                <Button
                  onClick={handleSend}
                  disabled={sending || !selectedProduct || !message.trim() || !selectedSession}
                  className="rounded-full"
                >
                  {sending ? (
                    <span className="flex items-center gap-2">
                      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      جاري الإرسال...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="size-4" />
                      إرسال العرض
                    </span>
                  )}
                </Button>
              </div>

              {result && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-500/10 p-4">
                  {result.status === "scheduled" ? <Clock className="size-8 text-amber-600" /> : <CheckCircle className="size-8 text-emerald-600" />}
                  <div>
                    <p className="font-bold text-emerald-800">
                      {result.status === "scheduled" ? `مجدولة — ${new Date(result.scheduledAt).toLocaleString("ar-EG")}` : `تم بدء الإرسال: ${result.total} عميل`}
                    </p>
                    <p className="text-xs text-emerald-700">ستجد التفاصيل في «العروض السابقة» وتقارير الإشعارات</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════ CAMPAIGNS HISTORY ══════════ */}
        <TabsContent value="history" className="space-y-6">
          <Card className="rounded-3xl border-[color:var(--shell-control-border)]">
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">العروض السابقة</CardTitle>
                <CardDescription>كل حملات عروض المنتجات عبر الواتساب</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="rounded-full" onClick={loadCampaigns}>
                <RefreshCw className="size-4" /> تحديث
              </Button>
            </CardHeader>
            <CardContent>
              {loadingCampaigns ? (
                <div className="flex justify-center py-10">
                  <span className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
                </div>
              ) : campaigns.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Layers className="size-12 opacity-40" />
                  <p className="text-[color:var(--color-muted-foreground)]">لا توجد عروض بعد — أنشئ أول عرض لك</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((c) => (
                    <div key={c.id} className="rounded-2xl border border-[color:var(--shell-control-border)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{c.name || "عرض واتساب"}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-[color:var(--color-muted-foreground)]">
                            {c.message}
                          </p>
                        </div>
                        {campaignStatusBadge(c)}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[color:var(--color-muted-foreground)]">
                        <Badge variant="secondary">{c.recipientCount || 0} مستلم</Badge>
                        <Badge variant="secondary" className="text-emerald-600">{c.sentCount || 0} مرسل</Badge>
                        <Badge variant="secondary" className="text-red-500">{c.failedCount || 0} فشل</Badge>
                        <span>
                          {c.sentAt ? new Date(c.sentAt).toLocaleString("ar-EG") : new Date(c.createdAt).toLocaleString("ar-EG")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════ AUTO-SEND SETTINGS ══════════ */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="rounded-3xl border-[color:var(--shell-control-border)]">
            <CardHeader>
              <CardTitle className="text-lg">الإرسال التلقائي للمنتج الجديد</CardTitle>
              <CardDescription>
                كل منتج جديد هيتنبعت تلقائياً لعملائك عبر الواتساب فور إضافته — الرسالة بتظهر في تقارير الإشعارات
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {settingsLoading ? (
                <div className="flex justify-center py-8">
                  <span className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
                </div>
              ) : settings ? (
                <>
                  <div className="flex items-center justify-between rounded-2xl border border-[color:var(--shell-control-border)] bg-[color:var(--color-muted)]/40 p-4">
                    <div>
                      <p className="font-bold">تفعيل الإرسال التلقائي</p>
                      <p className="text-xs text-[color:var(--color-muted-foreground)]">
                        يتم إرسال صورة المنتج + رسالة تلقائياً لكل منتج جديد فور حفظه
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ ...settings, newProductAutoSend: !settings.newProductAutoSend })}
                      className={`relative h-7 w-12 rounded-full transition-colors ${settings.newProductAutoSend ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"}`}
                    >
                      <span
                        className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${settings.newProductAutoSend ? "left-[22px]" : "left-0.5"}`}
                      />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <Label>الجمهور الافتراضي</Label>
                    <Select
                      value={settings.newProductAudience}
                      onValueChange={(v) => setSettings({ ...settings, newProductAudience: v ?? "all" })}
                    >
                      <SelectTrigger className="h-11 rounded-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AUDIENCE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.icon} {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {settings.newProductAudience === "newCustomers" && (
                      <div className="flex items-center gap-3">
                        <Label className="text-sm">جدد خلال آخر</Label>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={settings.newProductNewDays}
                          onChange={(e) => setSettings({ ...settings, newProductNewDays: parseInt(e.target.value) || 7 })}
                          className="h-9 w-24"
                        />
                        <Label className="text-sm">يوم</Label>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>الرسالة الافتراضية</Label>
                    <Textarea
                      value={settings.newProductMessage}
                      onChange={(e) => setSettings({ ...settings, newProductMessage: e.target.value })}
                      placeholder={DEFAULT_MESSAGE}
                      className="min-h-[140px] rounded-2xl"
                    />
                    <p className="text-xs text-[color:var(--color-muted-foreground)]">
                      متغيرات: {"{اسم العميل}"} / {"{customerName}"} / {"{productName}"} / {"{price}"}
                    </p>
                  </div>

                  <Button onClick={handleSaveSettings} disabled={savingSettings} className="rounded-full">
                    {savingSettings ? (
                      <span className="flex items-center gap-2">
                        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        جاري الحفظ...
                      </span>
                    ) : (
                      "حفظ الإعدادات"
                    )}
                  </Button>
                </>
              ) : (
                <p className="py-6 text-center text-sm text-[color:var(--color-muted-foreground)]">
                  تعذر تحميل الإعدادات — أعد المحاولة
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      <MetaTemplatesModal
        open={metaModalOpen}
        onClose={() => setMetaModalOpen(false)}
        onPick={(content) => setMessage((prev) => content || prev)}
        title="📚 قوالب ميتا للعروض"
      />
      </Tabs>
    </div>
  );
};

export default ProductOffers;