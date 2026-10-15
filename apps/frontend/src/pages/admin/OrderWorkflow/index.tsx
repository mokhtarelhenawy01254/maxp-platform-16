import { useTranslation } from "react-i18next";
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRightLeft,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Sliders,
  ChevronLeft,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import orderWorkflowService, { OrderStatusDefinition, OrderWorkflowConfig } from '../../../services/orderWorkflowService';
import TransitionRules from './TransitionRules';
import ApprovalRules from './ApprovalRules';
import OverridePermissions from './OverridePermissions';
import AuditLogViewer from './AuditLogViewer';
import StatusManagement from './StatusManagement';
import TabErrorBoundary from './TabErrorBoundary';

interface OrderWorkflowProps {
  isEmbedded?: boolean;
}

const OrderWorkflow: React.FC<OrderWorkflowProps> = ({ isEmbedded }) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') || 'settings';
  const [activeTab, setActiveTab] = useState(urlTab);
  const [config, setConfig] = useState<OrderWorkflowConfig | null>(null);
  const [statuses, setStatuses] = useState<OrderStatusDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasTransitions, setHasTransitions] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const qTab = searchParams.get('tab');
    if (qTab && qTab !== activeTab) {
      setActiveTab(qTab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    }, { replace: true });
    if (tabId === 'transitions' || tabId === 'statuses') {
      orderWorkflowService.getStatuses()
        .then(res => setStatuses((res.data || [])))
        .catch(() => {});
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configData, statusesData, transitionsData] = await Promise.all([
        orderWorkflowService.getConfig(),
        orderWorkflowService.getStatuses(),
        orderWorkflowService.getTransitions()
      ]);
      setConfig(configData.data);
      setHasTransitions((transitionsData.data || []).length > 0);
      const statuses = statusesData.data || [];
      try {
        const seedResult = await orderWorkflowService.seedDefaultStatuses();
        if (seedResult?.data?.length > 0) {
          const refreshed = await orderWorkflowService.getStatuses();
          setStatuses(refreshed.data || []);
          toast.success(t('orderSettings.imported_statuses_success', { count: seedResult.data.length }), { duration: 3000 });
        } else {
          setStatuses(statuses);
        }
      } catch (seedErr) {
        setStatuses(statuses);
      }
    } catch (error) {
      console.error('Failed to fetch workflow data', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'settings', label: t('orderSettings.k_27'), icon: Sliders },
    { id: 'statuses', label: t('orderSettings.k_165'), icon: Tag },
    { id: 'transitions', label: t('orderSettings.k_28'), icon: ArrowRightLeft },
    { id: 'approvals', label: t('orderSettings.k_29'), icon: CheckCircle2 },
    { id: 'overrides', label: t('orderSettings.k_30'), icon: ShieldCheck },
    { id: 'audit', label: t('orderSettings.k_31'), icon: Clock },
  ];

  const handleToggleWorkflow = async (enabled: boolean) => {
    if (!config) return;
    try {
      const updated = await orderWorkflowService.updateConfig({ enabled });
      setConfig(updated.data);
    } catch (error) {
      console.error('Failed to update config', error);
    }
  };

  return (
    <div className={`${isEmbedded ? '' : 'p-4 md:p-6 lg:p-8 bg-background min-h-screen text-foreground space-y-6'}`} dir="rtl">
      <div className={`${isEmbedded ? 'w-full' : 'max-w-7xl mx-auto space-y-6'}`}>
        {/* Top Header Surface */}
        {!isEmbedded && (
          <div className="bg-card border border-border/70 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 border border-primary/20 rounded-xl text-primary">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  {t('orderSettings.k_32')}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('orderSettings.k_141')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-muted/40 p-2.5 rounded-xl border border-border/60">
              <span className="text-xs font-semibold text-foreground">
                {t('orderSettings.k_142')}
              </span>
              <button
                onClick={() => handleToggleWorkflow(!config?.enabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-hidden ${
                  config?.enabled ? 'bg-primary' : 'bg-muted border border-border/70'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                    config?.enabled ? 'translate-x-4' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Warning Banner if disabled */}
        {!config?.enabled && !loading && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-300 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p>{t('orderSettings.k_143')}</p>
          </div>
        )}

        {/* Main Single Chassis Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Navigation Sidebar */}
          <div className="lg:col-span-1 space-y-1.5 bg-card border border-border/70 p-2 rounded-xl shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                  <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${active ? 'rotate-90' : ''}`} />
                </button>
              );
            })}
          </div>

          {/* Tab Content Surface */}
          <div className="lg:col-span-3">
            <div className="bg-card rounded-xl shadow-sm border border-border/70 p-5 overflow-hidden">
              {loading ? (
                <div className="p-16 text-center text-xs text-muted-foreground">
                  {t('orderSettings.k_35')}
                </div>
              ) : (
                <div>
                  {activeTab === 'settings' && (
                    <TabErrorBoundary tabLabel={t('orderSettings.k_27')}>
                      <div className="space-y-6">
                        {config?.enabled && !hasTransitions && (
                          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-2.5 text-amber-800 dark:text-amber-300 text-xs">
                            <ShieldCheck className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
                            <div>
                              <p className="font-bold mb-0.5">{t('orderSettings.k_36')}</p>
                              <p>{t('orderSettings.k_37')}<strong>{t('orderSettings.k_28')}</strong>{t('orderSettings.k_38')}</p>
                            </div>
                          </div>
                        )}
                        <div>
                          <h2 className="text-sm font-bold text-foreground mb-4">{t('orderSettings.k_39')}</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-2">
                              <h3 className="text-xs font-bold text-foreground">{t('orderSettings.k_40')}</h3>
                              <p className="text-xs text-muted-foreground">{t('orderSettings.k_41')}</p>
                              <button
                                onClick={() => orderWorkflowService.updateConfig({ enforceTransitions: !config?.enforceTransitions }).then(fetchData)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${config?.enforceTransitions ? 'bg-primary text-primary-foreground' : 'border border-border/70 text-foreground bg-card'}`}
                              >
                                {config?.enforceTransitions ? t('orderSettings.k_42') : t('orderSettings.k_43')}
                              </button>
                            </div>
                            <div className="p-4 rounded-xl bg-muted/20 border border-border/60 space-y-2">
                              <h3 className="text-xs font-bold text-foreground">{t('orderSettings.k_44')}</h3>
                              <p className="text-xs text-muted-foreground">{t('orderSettings.k_45')}</p>
                              <button
                                onClick={() => orderWorkflowService.updateConfig({ requireApprovalByDefault: !config?.requireApprovalByDefault }).then(fetchData)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${config?.requireApprovalByDefault ? 'bg-primary text-primary-foreground' : 'border border-border/70 text-foreground bg-card'}`}
                              >
                                {config?.requireApprovalByDefault ? t('orderSettings.k_42') : t('orderSettings.k_43')}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabErrorBoundary>
                  )}
                  {activeTab === 'statuses' && <TabErrorBoundary tabLabel={t('orderSettings.k_165')}><StatusManagement statuses={statuses} onUpdate={fetchData} /></TabErrorBoundary>}
                  {activeTab === 'transitions' && <TabErrorBoundary tabLabel={t('orderSettings.k_28')}><TransitionRules statuses={statuses} onUpdate={fetchData} /></TabErrorBoundary>}
                  {activeTab === 'approvals' && <TabErrorBoundary tabLabel={t('orderSettings.k_29')}><ApprovalRules onUpdate={fetchData} /></TabErrorBoundary>}
                  {activeTab === 'overrides' && <TabErrorBoundary tabLabel={t('orderSettings.k_30')}><OverridePermissions config={config} onUpdate={fetchData} /></TabErrorBoundary>}
                  {activeTab === 'audit' && <TabErrorBoundary tabLabel={t('orderSettings.k_31')}><AuditLogViewer /></TabErrorBoundary>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderWorkflow;
