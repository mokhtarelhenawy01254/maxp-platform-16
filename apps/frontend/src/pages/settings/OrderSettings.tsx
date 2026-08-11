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

// ═══════════════════════════════════════════════════════════════
// 📦 Order Settings Page with Sidebar Tabs
// ═══════════════════════════════════════════════════════════════

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
  | "easy_warehouse";

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

  // Update URL when tab changes
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
      description: "استيراد المنتجات تلقائيًا",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 rotate-180" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {t('orderSettings.title')}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('orderSettings.k_139')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden sticky top-6">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">
                  {t('orderSettings.k_140')}
                </h2>
              </div>
              <nav className="p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-right transition-colors ${activeTab === tab.id
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                  >
                    <tab.icon
                      className={`w-5 h-5 ${activeTab === tab.id
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-400"
                        }`}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSettings;
