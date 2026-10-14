import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Upload,
  Settings,
  MapPin,
  ClipboardList,
  ShoppingBag,
  RefreshCw,
  ArrowRight,
  Store,
  Layers,
  Radio,
} from "lucide-react";
import { toast } from "sonner";
import { tToast } from "../../utils/i18n-toast";
import tokenManager from "../../utils/tokenManager";
import { SyncLog } from "./types";
import { useWooCommerceSettings } from "./hooks/useWooCommerceSettings";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { SettingsTab } from "./components/SettingsTab";
import { ImportTab } from "./components/ImportTab";
import { ExportTab } from "./components/ExportTab";
import { ProductsTab } from "./components/ProductsTab";
import { StatusMappingTab } from "./components/StatusMappingTab";
import { LogsTab } from "./components/LogsTab";

type TabKey = "import" | "products" | "export" | "status_mapping" | "settings" | "logs";

export default function WooCommerceSync() {
  const navigate = useNavigate();
  const getAuthHeaders = (additionalHeaders: Record<string, string> = {}) =>
    tokenManager.createAuthHeaders(additionalHeaders);

  const [activeTab, setActiveTab] = useState<TabKey>("import");
  const [logs, setLogs] = useState<SyncLog[]>([]);

  const {
    loading,
    testingConnection,
    settingsList,
    selectedSettingsId,
    setSelectedSettingsId,
    settingsForm,
    setSettingsForm,
    ngrokUrl,
    setNgrokUrl,
    loadSettings,
    saveSettings,
    testConnection,
    setupWebhooks,
    disconnectSettings,
    resetWooCommerceData,
  } = useWooCommerceSettings();

  const currentSettings = settingsList.find((s) => s.id === selectedSettingsId) || null;

  useEffect(() => {
    void loadSettings();
    void loadSyncLogs();
  }, [loadSettings]);

  useEffect(() => {
    if (selectedSettingsId === "new") {
      setActiveTab("settings");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [selectedSettingsId]);

  const loadSyncLogs = async () => {
    try {
      const response = await fetch("/api/v1/woocommerce/sync-logs", {
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (data.success) {
        setLogs(data.data);
      }
    } catch (error) {
      console.error("Error loading sync logs", error);
    }
  };

  const syncNow = async () => {
    if (!currentSettings?.syncEnabled) {
      tToast.error("WooCommerceSync.please_activate_dc67");
      return;
    }

    try {
      const response = await fetch("/api/v1/woocommerce/auto-sync", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ id: currentSettings.id }),
      });
      const data = await response.json();
      if (data.success) {
        tToast.success("WooCommerceSync.msg_3a63");
        void loadSyncLogs();
      } else {
        toast.error(data.message);
      }
    } catch {
      tToast.error("WooCommerceSync.msg_56af");
    }
  };

  const TABS: { id: TabKey; label: string; icon: React.ElementType }[] = [
    { id: "import", label: "استيراد الطلبات", icon: Download },
    { id: "products", label: "المنتجات والمخزون", icon: ShoppingBag },
    { id: "export", label: "تصدير الطلبات", icon: Upload },
    { id: "status_mapping", label: "خريطة الحالات", icon: MapPin },
    { id: "settings", label: "إعدادات الربط", icon: Settings },
    { id: "logs", label: "سجلات المزامنة", icon: ClipboardList },
  ];

  return (
    <div dir="rtl" className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card border border-border/70 rounded-xl p-4 shadow-sm">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/admin/dashboard")}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>لوحة التحكم</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="text-xs font-semibold text-foreground">تكامل WooCommerce</span>
          </div>
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Store className="w-4 h-4 text-purple-600" />
            تكامل ومزامنة متاجر WooCommerce (Bi-directional Sync)
          </h2>
          <p className="text-xs text-muted-foreground">
            ربط متجرك الخارجي لسحب الطلبات والعملاء وتحديث حالات الشحن ومزامنة المخزون لحظياً
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={syncNow}
            disabled={loading || !currentSettings?.syncEnabled}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium shadow-xs transition-colors disabled:opacity-50 active:scale-[0.98]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>مزامنة فورية الآن</span>
          </button>
        </div>
      </div>

      {/* Telemetry ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>حالة الاتصال بالمتجر</span>
            <Radio className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold text-foreground">
              {currentSettings?.syncEnabled ? "متصل ومفعل" : "معطل"}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
              currentSettings?.syncEnabled
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            }`}>
              {currentSettings?.syncEnabled ? "Live" : "Inactive"}
            </span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>المتاجر المسجلة</span>
            <Store className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground tabular-nums">
              {settingsList.length}
            </span>
            <span className="text-[11px] text-muted-foreground">متاجر ووردبريس</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-lg p-3">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>سجلات المزامنة</span>
            <Layers className="w-3.5 h-3.5" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-base font-bold font-mono text-foreground tabular-nums">
              {logs.length}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">Operations</span>
          </div>
        </div>
      </div>

      {/* Connection Status Selector Banner */}
      <ConnectionStatus
        settingsList={settingsList}
        selectedId={selectedSettingsId}
        onSelect={(id) => {
          setSelectedSettingsId(id);
          if (id === "new") {
            setActiveTab("settings");
          }
        }}
        onDisconnect={disconnectSettings}
        loading={loading}
        onSync={syncNow}
      />

      {/* Tabs Navigation */}
      <div className="bg-card border border-border/70 rounded-xl p-1 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  active
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="space-y-4">
        {activeTab === "import" && <ImportTab settings={currentSettings} />}
        {activeTab === "products" && <ProductsTab settings={currentSettings} />}
        {activeTab === "export" && <ExportTab settings={currentSettings} />}
        {activeTab === "status_mapping" && (
          <StatusMappingTab
            settings={currentSettings}
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            saveSettings={saveSettings}
          />
        )}
        {activeTab === "settings" && (
          <SettingsTab
            settings={currentSettings}
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            saveSettings={saveSettings}
            testConnection={testConnection}
            setupWebhooks={setupWebhooks}
            testingConnection={testingConnection}
            ngrokUrl={ngrokUrl}
            setNgrokUrl={setNgrokUrl}
            loading={loading}
            resetWooCommerceData={resetWooCommerceData}
          />
        )}
        {activeTab === "logs" && <LogsTab logs={logs} />}
      </div>
    </div>
  );
}
