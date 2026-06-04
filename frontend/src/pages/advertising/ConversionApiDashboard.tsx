/**
 * 📊 Conversion API (CAPI) Dashboard
 *
 * لوحة تحكم لإدارة وإرسال أحداث التحويل عبر Facebook Conversion API
 */

import React, { useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Activity,
  Send,
  ShoppingCart,
  UserPlus,
  Eye,
  CreditCard,
  Phone,
  Mail,
  CheckCircle,
  Loader2,
  History,
  TrendingUp,
  AlertTriangle,
  Settings,
} from "lucide-react";
import {
  facebookAdsService,
  type ConversionApiSendResponse,
  type ConversionEventData,
} from "../../services/facebookAdsService";

type ConversionStatus = "success" | "failed" | "pending";

interface ConversionEvent {
  id: string;
  eventId: string;
  eventName: string;
  timestamp: string;
  status: ConversionStatus;
  value?: number;
  currency?: string;
  eventsReceived?: number;
  fbtraceId?: string | null;
  messages?: Array<string | Record<string, unknown>>;
  errorMessage?: string;
  pixelId: string;
  actionSource: string;
  eventSourceUrl?: string;
  sentFields: {
    fbp: boolean;
    fbc: boolean;
    eventId: boolean;
    testEventCode: boolean;
  };
}

export interface ConversionFormData {
  pixelId: string;
  eventName: string;
  eventSourceUrl: string;
  eventId?: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  city: string;
  country: string;
  fbp: string;
  fbc: string;
  testEventCode: string;
  value: number;
  currency: string;
  contentIds: string;
  contentType: string;
  contentName: string;
  numItems: number;
  orderId: string;
  actionSource: ConversionEventData["actionSource"];
}

const CURRENT_CONVERSIONS_ENDPOINT_SUPPORT = {
  fbp: true,
  fbc: true,
  eventId: true,
  testEventCode: true,
} as const;

const createLocalEventId = (eventName: string) =>
  `${eventName}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const getConversionResponseDetails = (
  response?: ConversionApiSendResponse | null,
) => {
  const source = response?.data || response || {};
  return {
    eventsReceived:
      source.events_received ?? source.eventsReceived ?? 0,
    fbtraceId: source.fbtrace_id ?? source.fbtraceId ?? null,
    messages: source.messages || [],
  };
};

export const buildConversionPayload = (
  eventData: ConversionFormData,
): ConversionEventData => {
  const payload: ConversionEventData = {
    pixelId: eventData.pixelId.trim(),
    eventName: eventData.eventName,
    actionSource: eventData.actionSource || "website",
  };

  if (eventData.eventSourceUrl.trim()) {
    payload.eventSourceUrl = eventData.eventSourceUrl.trim();
  }
  if (eventData.eventId?.trim()) {
    payload.eventId = eventData.eventId.trim();
  }
  if (eventData.testEventCode.trim()) {
    payload.testEventCode = eventData.testEventCode.trim();
  }

  const userData: NonNullable<ConversionEventData["userData"]> = {};
  if (eventData.email.trim()) userData.email = eventData.email.trim();
  if (eventData.phone.trim()) userData.phone = eventData.phone.trim();
  if (eventData.firstName.trim()) userData.firstName = eventData.firstName.trim();
  if (eventData.lastName.trim()) userData.lastName = eventData.lastName.trim();
  if (eventData.city.trim()) userData.city = eventData.city.trim();
  if (eventData.country.trim()) userData.country = eventData.country.trim();
  if (eventData.fbp.trim()) userData.fbp = eventData.fbp.trim();
  if (eventData.fbc.trim()) userData.fbc = eventData.fbc.trim();

  if (Object.keys(userData).length > 0) {
    payload.userData = userData;
  }

  const contentIds = eventData.contentIds
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const shouldIncludeCommerceData =
    ["Purchase", "AddToCart", "InitiateCheckout", "ViewContent"].includes(
      eventData.eventName,
    ) ||
    eventData.value > 0 ||
    contentIds.length > 0 ||
    Boolean(eventData.contentName.trim()) ||
    Boolean(eventData.orderId.trim());

  const customData: NonNullable<ConversionEventData["customData"]> = {};
  if (eventData.value > 0) {
    customData.value = eventData.value;
    customData.currency = eventData.currency;
  }
  if (contentIds.length > 0) customData.contentIds = contentIds;
  if (shouldIncludeCommerceData && eventData.contentType.trim()) {
    customData.contentType = eventData.contentType.trim();
  }
  if (eventData.contentName.trim()) customData.contentName = eventData.contentName.trim();
  if (shouldIncludeCommerceData && eventData.numItems > 0) {
    customData.numItems = eventData.numItems;
  }
  if (eventData.orderId.trim()) customData.orderId = eventData.orderId.trim();

  if (Object.keys(customData).length > 0) {
    payload.customData = customData;
  }

  return payload;
};

export const summarizeConversionAttempts = (events: ConversionEvent[]) => {
  const total = events.length;
  const succeeded = events.filter((event) => event.status === "success").length;
  const failed = events.filter((event) => event.status === "failed").length;
  const eventsReceived = events.reduce(
    (sum, event) => sum + (event.eventsReceived || 0),
    0,
  );

  return {
    total,
    succeeded,
    failed,
    eventsReceived,
    successRate: total > 0 ? Math.round((succeeded / total) * 100) : 0,
  };
};

const ConversionApiDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"send" | "history" | "settings">(
    "send",
  );
  const [recentEvents, setRecentEvents] = useState<ConversionEvent[]>([]);

  const [eventData, setEventData] = useState<ConversionFormData>({
    pixelId: "",
    eventName: "Purchase",
    eventSourceUrl: "",
    // User Data
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    city: "",
    country: "EG",
    fbp: "",
    fbc: "",
    testEventCode: "",
    // Custom Data
    value: 0,
    currency: "SAR",
    contentIds: "",
    contentType: "product",
    contentName: "",
    numItems: 1,
    orderId: "",
    // Action Source
    actionSource: "website",
  });

  const attemptStats = useMemo(
    () => summarizeConversionAttempts(recentEvents),
    [recentEvents],
  );

  const eventTypes = [
    { value: "Purchase", label: "شراء", icon: CreditCard, color: "green" },
    { value: "Lead", label: "عميل محتمل", icon: UserPlus, color: "blue" },
    {
      value: "AddToCart",
      label: "إضافة للسلة",
      icon: ShoppingCart,
      color: "orange",
    },
    { value: "ViewContent", label: "مشاهدة محتوى", icon: Eye, color: "purple" },
    {
      value: "InitiateCheckout",
      label: "بدء الدفع",
      icon: CreditCard,
      color: "indigo",
    },
    {
      value: "CompleteRegistration",
      label: "إكمال التسجيل",
      icon: CheckCircle,
      color: "teal",
    },
    { value: "Contact", label: "تواصل", icon: Phone, color: "pink" },
    { value: "Subscribe", label: "اشتراك", icon: Mail, color: "cyan" },
  ];

  const currencies = [
    { code: "SAR", name: "ريال سعودي" },
    { code: "AED", name: "درهم إماراتي" },
    { code: "EGP", name: "جنيه مصري" },
    { code: "USD", name: "دولار أمريكي" },
    { code: "EUR", name: "يورو" },
  ];

  const actionSources = [
    { value: "website", label: "موقع ويب" },
    { value: "app", label: "تطبيق" },
    { value: "phone_call", label: "مكالمة هاتفية" },
    { value: "chat", label: "محادثة" },
    { value: "email", label: "بريد إلكتروني" },
    { value: "physical_store", label: "متجر فعلي" },
  ];

  const handleSendEvent = async () => {
    if (!eventData.pixelId.trim()) {
      toast.error("يرجى إدخال معرف Facebook Pixel");
      return;
    }

    const eventId = createLocalEventId(eventData.eventName);
    const baseEvent: ConversionEvent = {
      id: eventId,
      eventId,
      eventName: eventData.eventName,
      timestamp: new Date().toISOString(),
      status: "pending",
      value: eventData.value,
      currency: eventData.currency,
      pixelId: eventData.pixelId.trim(),
      actionSource: eventData.actionSource || "website",
      eventSourceUrl: eventData.eventSourceUrl.trim() || undefined,
      sentFields: {
        fbp: Boolean(eventData.fbp.trim()),
        fbc: Boolean(eventData.fbc.trim()),
        eventId: CURRENT_CONVERSIONS_ENDPOINT_SUPPORT.eventId,
        testEventCode:
          CURRENT_CONVERSIONS_ENDPOINT_SUPPORT.testEventCode &&
          Boolean(eventData.testEventCode.trim()),
      },
    };

    try {
      setLoading(true);
      setRecentEvents((prev) => [baseEvent, ...prev.slice(0, 9)]);

      const payload = buildConversionPayload({
        ...eventData,
        eventId,
      });
      const response = await facebookAdsService.sendConversionEvent(payload);
      const responseDetails = getConversionResponseDetails(response);

      const newEvent: ConversionEvent = {
        ...baseEvent,
        status: "success",
        eventsReceived: responseDetails.eventsReceived,
        fbtraceId: responseDetails.fbtraceId,
        messages: responseDetails.messages,
      };
      setRecentEvents((prev) =>
        prev.map((event) => (event.id === eventId ? newEvent : event)),
      );

      toast.success(
        responseDetails.eventsReceived > 0
          ? `تم إرسال الحدث واستقبلت Meta ${responseDetails.eventsReceived} حدث`
          : "تم إرسال الطلب بنجاح، راجع رسائل Meta في السجل",
      );
    } catch (error: any) {
      console.error("Error sending event:", error);

      const failedEvent: ConversionEvent = {
        ...baseEvent,
        status: "failed",
        errorMessage:
          error?.response?.data?.error ||
          error?.message ||
          "فشل في إرسال الحدث",
      };
      setRecentEvents((prev) => {
        const eventExists = prev.some((event) => event.id === eventId);
        if (eventExists) {
          return prev.map((event) => (event.id === eventId ? failedEvent : event));
        }
        return [failedEvent, ...prev.slice(0, 9)];
      });

      toast.error(failedEvent.errorMessage || "فشل في إرسال الحدث");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="p-6 space-y-6 min-h-screen bg-gray-50 dark:bg-gray-900"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            Conversion API (CAPI)
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            إرسال أحداث التحويل مباشرة إلى Facebook لتحسين تتبع الإعلانات
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                نجح اليوم
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {attemptStats.succeeded}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                فشل اليوم
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {attemptStats.failed}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                معدل النجاح
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {attemptStats.total > 0 ? `${attemptStats.successRate}%` : "—"}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-gray-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <History className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                إجمالي الأحداث
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {attemptStats.eventsReceived}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:shadow-gray-900/20 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-600">
          <div className="flex">
            <button
              onClick={() => setActiveTab("send")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "send"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Send className="w-5 h-5" />
              إرسال حدث
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "history"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <History className="w-5 h-5" />
              السجل
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === "settings"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              <Settings className="w-5 h-5" />
              الإعدادات
            </button>
          </div>
        </div>

        {/* Send Event Tab */}
        {activeTab === "send" && (
          <div className="p-6 space-y-6">
            {/* Pixel ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                معرف Facebook Pixel *
              </label>
              <input
                type="text"
                value={eventData.pixelId}
                onChange={(e) =>
                  setEventData((prev) => ({ ...prev, pixelId: e.target.value }))
                }
                placeholder="أدخل معرف الـ Pixel"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  رابط مصدر الحدث
                </label>
                <input
                  type="url"
                  value={eventData.eventSourceUrl}
                  onChange={(e) =>
                    setEventData((prev) => ({
                      ...prev,
                      eventSourceUrl: e.target.value,
                    }))
                  }
                  placeholder="https://example.com/product"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Event ID محلي للتشخيص
                </label>
                <input
                  type="text"
                  value="يتم توليده عند الإرسال - غير مرسل حاليًا للـ backend"
                  readOnly
                  className="w-full px-4 py-2 border border-amber-200 dark:border-amber-800 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200"
                />
              </div>
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                نوع الحدث
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {eventTypes.map((event) => {
                  const Icon = event.icon;
                  const isSelected = eventData.eventName === event.value;
                  return (
                    <button
                      key={event.value}
                      onClick={() =>
                        setEventData((prev) => ({
                          ...prev,
                          eventName: event.value,
                        }))
                      }
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? `border-${event.color}-500 dark:border-${event.color}-400 bg-${event.color}-50 dark:bg-${event.color}-900/20`
                          : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700"
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 mx-auto mb-1 ${isSelected ? `text-${event.color}-600` : "text-gray-400"}`}
                      />
                      <div
                        className={`text-sm font-medium ${isSelected ? `text-${event.color}-700 dark:text-${event.color}-300` : "text-gray-700 dark:text-gray-300"}`}
                      >
                        {event.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Data */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                بيانات المستخدم (اختياري)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="email"
                  value={eventData.email}
                  onChange={(e) =>
                    setEventData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="البريد الإلكتروني"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <input
                  type="tel"
                  value={eventData.phone}
                  onChange={(e) =>
                    setEventData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  placeholder="رقم الهاتف"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <input
                  type="text"
                  value={eventData.firstName}
                  onChange={(e) =>
                    setEventData((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  placeholder="الاسم الأول"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <input
                  type="text"
                  value={eventData.lastName}
                  onChange={(e) =>
                    setEventData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  placeholder="اسم العائلة"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <input
                  type="text"
                  value={eventData.city}
                  onChange={(e) =>
                    setEventData((prev) => ({ ...prev, city: e.target.value }))
                  }
                  placeholder="المدينة"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <input
                  type="text"
                  value={eventData.country}
                  onChange={(e) =>
                    setEventData((prev) => ({
                      ...prev,
                      country: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="رمز الدولة مثل EG أو SA"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <input
                  type="text"
                  value={eventData.fbp}
                  onChange={(e) =>
                    setEventData((prev) => ({ ...prev, fbp: e.target.value }))
                  }
                  placeholder="_fbp / Facebook Browser ID"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                <input
                  type="text"
                  value={eventData.fbc}
                  onChange={(e) =>
                    setEventData((prev) => ({ ...prev, fbc: e.target.value }))
                  }
                  placeholder="_fbc / Facebook Click ID"
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-300 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    حالة dedup واختبار Meta
                  </p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    هذه الواجهة ترسل fbp/fbc لأن endpoint الحالي يدعمهما. Event ID
                    و test_event_code ظاهرين للتشخيص فقط إلى أن يمررهما backend إلى
                    Meta.
                  </p>
                  <input
                    type="text"
                    value={eventData.testEventCode}
                    onChange={(e) =>
                      setEventData((prev) => ({
                        ...prev,
                        testEventCode: e.target.value,
                      }))
                    }
                    placeholder="test_event_code من Events Manager (غير مرسل حاليًا)"
                    className="w-full px-4 py-2 border border-amber-300 dark:border-amber-700 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>
            </div>

            {/* Purchase Data */}
            {(eventData.eventName === "Purchase" ||
              eventData.eventName === "AddToCart") && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  بيانات الشراء
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      القيمة
                    </label>
                    <input
                      type="number"
                      value={eventData.value}
                      onChange={(e) =>
                        setEventData((prev) => ({
                          ...prev,
                          value: Number(e.target.value),
                        }))
                      }
                      placeholder="0"
                      min={0}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      العملة
                    </label>
                    <select
                      value={eventData.currency}
                      onChange={(e) =>
                        setEventData((prev) => ({
                          ...prev,
                          currency: e.target.value,
                        }))
                      }
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {currencies.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      رقم الطلب
                    </label>
                    <input
                      type="text"
                      value={eventData.orderId}
                      onChange={(e) =>
                        setEventData((prev) => ({
                          ...prev,
                          orderId: e.target.value,
                        }))
                      }
                      placeholder="ORD-123"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                مصدر الحدث
              </label>
              <select
                value={eventData.actionSource}
                onChange={(e) =>
                  setEventData((prev) => ({
                    ...prev,
                    actionSource: e.target.value as any,
                  }))
                }
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {actionSources.map((source) => (
                  <option key={source.value} value={source.value}>
                    {source.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <button
              onClick={handleSendEvent}
              disabled={loading || !eventData.pixelId}
              className="w-full py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  إرسال الحدث
                </>
              )}
            </button>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="p-6">
            {recentEvents.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا توجد أحداث مسجلة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          event.status === "success"
                            ? "bg-green-100"
                            : "bg-red-100"
                        }`}
                      >
                        {event.status === "success" ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {event.eventName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(event.timestamp).toLocaleString("ar-EG")}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded bg-gray-200 px-2 py-1 text-gray-700">
                            Event ID: {event.eventId}
                          </span>
                          <span className="rounded bg-gray-200 px-2 py-1 text-gray-700">
                            Pixel: {event.pixelId}
                          </span>
                          {event.sentFields.fbp && (
                            <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">
                              fbp مرسل
                            </span>
                          )}
                          {event.sentFields.fbc && (
                            <span className="rounded bg-blue-100 px-2 py-1 text-blue-700">
                              fbc مرسل
                            </span>
                          )}
                          {!event.sentFields.eventId && (
                            <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">
                              event_id غير مرسل
                            </span>
                          )}
                          {!event.sentFields.testEventCode && (
                            <span className="rounded bg-amber-100 px-2 py-1 text-amber-700">
                              test_event_code غير مرسل
                            </span>
                          )}
                        </div>
                        {event.fbtraceId && (
                          <p className="mt-2 text-xs text-gray-500">
                            fbtrace_id: {event.fbtraceId}
                          </p>
                        )}
                        {event.errorMessage && (
                          <p className="mt-2 text-sm text-red-600">
                            {event.errorMessage}
                          </p>
                        )}
                        {event.messages && event.messages.length > 0 && (
                          <p className="mt-2 text-xs text-gray-500">
                            Meta:{" "}
                            {event.messages
                              .map((message) =>
                                typeof message === "string"
                                  ? message
                                  : JSON.stringify(message),
                              )
                              .join(" | ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-left">
                      {event.eventsReceived !== undefined && (
                        <p className="font-semibold text-gray-900">
                          {event.eventsReceived} مستلمة
                        </p>
                      )}
                      {event.value ? (
                        <p className="font-semibold text-gray-900">
                          {event.value.toLocaleString()} {event.currency}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">
                نصائح لتحسين CAPI
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• أرسل أكبر قدر ممكن من بيانات المستخدم لتحسين المطابقة</li>
                <li>• استخدم نفس Pixel ID المستخدم في موقعك</li>
                <li>• أرسل الأحداث في الوقت الفعلي للحصول على أفضل النتائج</li>
                <li>• endpoint الحالي يشفّر بيانات المستخدم في backend قبل الإرسال</li>
                <li>
                  • لإظهار Events Manager Test Events و dedup كامل: backend يحتاج
                  تمرير event_id و test_event_code
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversionApiDashboard;
