import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from "react";
import {
  Settings,
  Tag,
  ChevronLeft,
  Calendar,
  Hash,
  LayoutGrid,
  Star,
  FileText,
  LayoutDashboard,
  Clock,
  Copy,
  Package,
  CircleDollarSign,
  AlertOctagon,
  XCircle,
  Volume2,
  ArrowLeftRight,
  ShieldAlert,
  Webhook,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import OrderStatusManager from "./OrderStatusManager";
import ScheduledOrderSettings from "./ScheduledOrderSettings";
import OrderNumberingSettings from "./OrderNumberingSettings";
import DuplicateOrderSettings from "./DuplicateOrderSettings";
import OrderInvoiceSettings from "./OrderInvoiceSettings";
import RatingSettingsManager from "./RatingSettingsManager";
import OrderColumnsSettings from "./OrderColumnsSettings";
import IncompleteOrdersSettings from "./IncompleteOrdersSettings";
import OrderWorkflow from "../admin/OrderWorkflow";
import OrderConfirmationSettings from "./OrderConfirmationSettings";
import OrderPreparationSettings from "./OrderPreparationSettings";
import MinimumOrderSettings from "./MinimumOrderSettings";
import LateCancellationSettings from "./LateCancellationSettings";
import CancellationSettingsPage from "../cancellations/CancellationSettingsPage";
import EasyWarehouseSettings from "./EasyWarehouseSettings";
import OrderSoundSettings from "./OrderSoundSettings";
import ExchangeReturnSettings from "./ExchangeReturnSettings";
import DiscountApprovalSettings from "./DiscountApprovalSettings";
import OrderWebhookSettings from "./OrderWebhookSettings";

type TabId =
  | "status"
  | "ratings"
  | "scheduled"
  | "minimum"
  | "numbering"
  | "duplicates"
  | "invoices"
  | "workflow"
  | "columns"
  | "incomplete"
  | "confirmation"
  | "preparation"
  | "late_cancellation"
  | "cancellation_reasons"
  | "easy_warehouse"
  | "sound"
  | "exchange_return"
  | "discount_approval"
  | "webhooks";

const ORDER_SETTINGS_TAB_IDS: TabId[] = [
  "status",
  "ratings",
  "scheduled",
  "minimum",
  "numbering",
  "duplicates",
  "invoices",
  "workflow",
  "columns",
  "incomplete",
  "confirmation",
  "preparation",
  "late_cancellation",
  "cancellation_reasons",
  "easy_warehouse",
  "sound",
  "exchange_return",
  "discount_approval",
  "webhooks",
];

const isOrderSettingsTabId = (value: string): value is TabId =>
  ORDER_SETTINGS_TAB_IDS.includes(value as TabId);

const normalizeOrderSettingsTab = (value: string | null): TabId => {
  if (value && isOrderSettingsTabId(value)) {
    return value;
  }

  return "status";
};

interface Tab {
  id: TabId;
  label: string;
  icon: React.ElementType;
  description: string;
}

const OrderSettings: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>(
    () => normalizeOrderSettingsTab(searchParams.get("tab")),
  );

  useEffect(() => {
    const rawTab = searchParams.get("tab");

    if (rawTab === "customer-block" || rawTab === "customer-blocks") {
      navigate("/settings/customer-blocks", { replace: true });
      return;
    }

    const tab = normalizeOrderSettingsTab(rawTab);

    if (tab !== activeTab) {
      setActiveTab(tab);
    }

    if (rawTab && rawTab !== tab) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("tab", tab);
      setSearchParams(nextParams, { replace: true });
    }
  }, [activeTab, navigate, searchParams, setSearchParams]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", tabId);
    setSearchParams(nextParams);
  };

  const tabs: Tab[] = [
    {
      id: "status",
      label: t('orderSettings.k_1'),
      icon: Tag,
      description: t('orderSettings.k_2'),
    },
    {
      id: "minimum",
      label: t('orderSettings.k_3'),
      icon: CircleDollarSign,
      description: t('orderSettings.k_4'),
    },
    {
      id: "scheduled",
      label: t('orderSettings.k_5'),
      icon: Calendar,
      description: t('orderSettings.k_6'),
    },
    {
      id: "columns",
      label: t('orderSettings.k_7'),
      icon: LayoutGrid,
      description: t('orderSettings.k_8'),
    },
    {
      id: "incomplete",
      label: t('orderSettings.k_9'),
      icon: Clock,
      description: t('orderSettings.k_10'),
    },
    {
      id: "numbering",
      label: t('orderSettings.k_11'),
      icon: Hash,
      description: t('orderSettings.k_12'),
    },
    {
      id: "duplicates",
      label: t('orderSettings.k_13'),
      icon: Copy,
      description: t('orderSettings.k_14'),
    },
    {
      id: "invoices",
      label: t('orderSettings.k_15'),
      icon: FileText,
      description: t('orderSettings.k_16'),
    },
    {
      id: "ratings",
      label: t('orderSettings.k_17'),
      icon: Star,
      description: t('orderSettings.k_18'),
    },
    {
      id: "workflow",
      label: t('orderSettings.k_19'),
      icon: LayoutDashboard,
      description: t('orderSettings.k_20'),
    },
    {
      id: "confirmation",
      label: t('orderSettings.k_21'),
      icon: LayoutDashboard,
      description: t('orderSettings.k_22'),
    },
    {
      id: "preparation",
      label: t('orderSettings.k_23'),
      icon: Package,
      description: t('orderSettings.k_24'),
    },
    {
      id: "late_cancellation",
      label: t('orderSettings.k_25'),
      icon: AlertOctagon,
      description: t('orderSettings.k_26'),
    },
    {
      id: "cancellation_reasons",
      label: t('orderSettings.k_163'),
      icon: XCircle,
      description: t('orderSettings.k_164'),
    },
    {
      id: "easy_warehouse",
      label: "وضع المستودع السهل",
      icon: Package,
      description: "استيراد المنتجات تلقائيا",
    },
    {
      id: "sound",
      label: "صوت الطلبات",
      icon: Volume2,
      description: "إنذار عالي عند وصول طلب جديد",
    },
    {
      id: "exchange_return",
      label: "الاستبدال والاسترجاع",
      icon: ArrowLeftRight,
      description: "اشتراط وجود طلب سابق للعميل",
    },
    {
      id: "discount_approval",
      label: "اعتماد وحظر الخصومات",
      icon: ShieldAlert,
      description: "الموافقة على الخصومات وحظر التلقائي",
    },
    {
      id: "webhooks",
      label: "الويب هوك (Webhooks)",
      icon: Webhook,
      description: "إرسال بيانات الطلبات فور وصولها مع سيكريت مشفر",
    },
  ];

  return (
    <div className="order-settings-root h-full min-h-0 overflow-y-auto bg-background text-foreground" dir="rtl">
      {/* Header Chassis */}
      <div className="border-b border-border/70 bg-card">
        <div className="w-full px-4 sm:px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {t('orderSettings.title')}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {t('orderSettings.k_139')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 py-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar Tabs */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm lg:sticky lg:top-6 lg:flex lg:max-h-[calc(100vh-5rem)] lg:flex-col">
              <div className="hidden border-b border-border/60 p-4 shrink-0 lg:block">
                <h2 className="text-xs font-semibold text-muted-foreground">
                  {t('orderSettings.k_140')}
                </h2>
              </div>
              <nav
                aria-label={t('orderSettings.k_140')}
                className="flex gap-1.5 overflow-x-auto p-2 no-scrollbar lg:flex-col lg:overflow-y-auto"
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    data-tab-id={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex flex-shrink-0 items-center gap-3 rounded-lg px-3.5 py-2.5 text-right transition-colors whitespace-nowrap lg:w-full lg:whitespace-normal ${
                      activeTab === tab.id
                        ? "border border-primary/20 bg-primary/10 font-medium text-primary shadow-xs"
                        : "border border-transparent text-muted-foreground hover:bg-muted/20 hover:text-foreground"
                    }`}
                  >
                    <tab.icon
                      className={`h-4 w-4 shrink-0 ${
                        activeTab === tab.id ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <div className="flex-1 min-w-0 text-right">
                      <div className="text-xs font-medium">{tab.label}</div>
                      <div className="hidden text-[11px] text-muted-foreground line-clamp-1 lg:block">
                        {tab.description}
                      </div>
                    </div>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {activeTab === "status" && <OrderStatusManager />}
            {activeTab === "minimum" && <MinimumOrderSettings />}
            {activeTab === "scheduled" && <ScheduledOrderSettings />}
            {activeTab === "columns" && <OrderColumnsSettings />}
            {activeTab === "incomplete" && <IncompleteOrdersSettings />}
            {activeTab === "numbering" && <OrderNumberingSettings />}
            {activeTab === "duplicates" && <DuplicateOrderSettings />}
            {activeTab === "invoices" && <OrderInvoiceSettings isEmbedded={true} />}
            {activeTab === "ratings" && <RatingSettingsManager />}
            {activeTab === "workflow" && <OrderWorkflow isEmbedded={true} />}
            {activeTab === "confirmation" && <OrderConfirmationSettings />}
            {activeTab === "preparation" && <OrderPreparationSettings />}
            {activeTab === "late_cancellation" && <LateCancellationSettings />}
            {activeTab === "cancellation_reasons" && <CancellationSettingsPage isEmbedded={true} />}
            {activeTab === "easy_warehouse" && <EasyWarehouseSettings />}
            {activeTab === "sound" && <OrderSoundSettings />}
            {activeTab === "exchange_return" && <ExchangeReturnSettings />}
            {activeTab === "discount_approval" && <DiscountApprovalSettings />}
            {activeTab === "webhooks" && <OrderWebhookSettings />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSettings;
