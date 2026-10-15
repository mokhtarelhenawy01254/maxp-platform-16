import React from "react";
import {
  RefreshCw,
  AlertTriangle,
  Trash2,
  Plus,
  Globe,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { Settings } from "../types";

interface ConnectionStatusProps {
  settingsList: Settings[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDisconnect: (id: string) => void;
  loading: boolean;
  onSync: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  settingsList,
  selectedId,
  onSelect,
  onDisconnect,
  loading,
  onSync,
}) => {
  // If no sites connected, show a clean onboarding card
  if (settingsList.length === 0) {
    return (
      <div className="rounded-xl border border-border/70 bg-card p-6 sm:p-8 text-center shadow-sm">
        <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mb-3">
          <Globe className="h-6 w-6" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          ابدأ بربط متجرك الآن
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-5 max-w-md mx-auto leading-relaxed">
          اربط متجر WooCommerce الخاص بك لمزامنة المنتجات، الطلبات، والمخزون بشكل تلقائي وسلس.
        </p>
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => onSelect("new")}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-lg shadow-sm hover:bg-primary/90 transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة موقع جديد</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-6">
      {settingsList.map((site) => {
        const isActive = site.id === selectedId;
        return (
          <div
            key={site.id}
            onClick={() => onSelect(site.id)}
            className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${
              isActive
                ? "bg-card border-primary/60 shadow-sm ring-1 ring-primary/20"
                : "bg-background/60 border-border/70 hover:border-border hover:bg-muted/30"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                    site.hasCredentials
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                  }`}
                >
                  <Globe className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground truncate font-mono" dir="ltr">
                      {site.storeUrl}
                    </p>
                    {site.hasCredentials ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-medium mt-0.5">
                    {isActive ? "الموقع النشط حالياً" : "اضغط للتبديل لهذا الموقع"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDisconnect(site.id);
                  }}
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  title="حذف الربط"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {site.syncEnabled && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Zap className="h-3 w-3" />
                    <span>مزامنة مفعلة</span>
                  </span>
                )}
                {site.webhookEnabled && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    Webhook
                  </span>
                )}
              </div>

              {isActive && site.hasCredentials && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSync();
                  }}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-[0.98] shadow-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>مزامنة الآن</span>
                </button>
              )}
            </div>

            {isActive && (
              <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary border-2 border-background flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />
              </div>
            )}
          </div>
        );
      })}

      {/* Add New Connection Placeholder */}
      {settingsList.length > 0 && (
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onSelect("new");
            }
          }}
          className="group border border-dashed border-border/80 hover:border-primary/50 bg-background/40 hover:bg-primary/5 rounded-xl flex flex-col items-center justify-center p-5 transition-all cursor-pointer min-h-[110px]"
          onClick={() => onSelect("new")}
        >
          <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-primary/10 text-muted-foreground group-hover:text-primary transition-colors flex items-center justify-center mb-1.5 border border-border/50">
            <Plus className="h-4 w-4" />
          </div>
          <p className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">
            إضافة متجر جديد
          </p>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;
