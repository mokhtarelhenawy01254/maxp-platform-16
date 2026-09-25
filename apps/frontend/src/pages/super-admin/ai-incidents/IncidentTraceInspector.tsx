import React, { useState } from 'react';
import {
  Terminal,
  Play,
  Bell,
  Copy,
  Check,
  Shield,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Code2,
  Cpu,
} from 'lucide-react';
import { apiClient } from '../../../services/apiClient';
import type { AiIncident } from './IncidentStreamPane';

interface IncidentTraceInspectorProps {
  incident: AiIncident | null;
  onRefresh: () => void;
}

export const IncidentTraceInspector: React.FC<IncidentTraceInspectorProps> = ({
  incident,
  onRefresh,
}) => {
  const [retesting, setRetesting] = useState(false);
  const [retestResult, setRetestResult] = useState<any>(null);
  const [notifying, setNotifying] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [killSwitching, setKillSwitching] = useState(false);

  if (!incident) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400 dark:text-slate-500 bg-slate-50/40 dark:bg-slate-900/40">
        <Terminal className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
          اختر استثناءً أو عطلاً من القائمة
        </p>
        <p className="text-[11px] mt-1 max-w-xs leading-relaxed">
          ستظهر هنا لوحة التفتيش العميق للـ Payload والـ Root Cause مع أزرار الفحص التشغيلي المباشر.
        </p>
      </div>
    );
  }

  const handleCopyTrace = () => {
    const traceData = {
      incidentId: incident.id,
      toolName: incident.toolName,
      company: incident.companyName,
      category: incident.category,
      errorMessage: incident.errorMessage,
      arguments: incident.arguments,
      userMessage: incident.userMessage,
      timestamp: incident.createdAt,
    };
    navigator.clipboard.writeText(JSON.stringify(traceData, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRetest = async () => {
    setRetesting(true);
    setRetestResult(null);
    try {
      let res;
      try {
        res = await apiClient.post<any>(`/ai/chat/incidents/${incident.id}/retest`);
      } catch {
        res = await apiClient.post<any>(`/super-admin/ai/incidents/${incident.id}/retest`);
      }
      if (res.data?.success) {
        setRetestResult(res.data.diagnostic);
      }
    } catch (err: any) {
      setRetestResult({ passed: false, message: err.message || 'فشل الفحص التشخيصي' });
    } finally {
      setRetesting(false);
    }
  };

  const handleNotifyTenant = async () => {
    setNotifying(true);
    setNotifySuccess(null);
    try {
      let res;
      try {
        res = await apiClient.post<any>(`/ai/chat/incidents/${incident.id}/notify-tenant`);
      } catch {
        res = await apiClient.post<any>(`/super-admin/ai/incidents/${incident.id}/notify-tenant`);
      }
      if (res.data?.success) {
        setNotifySuccess(res.data.message || 'تم إرسال التنبيه لإدارة المتجر.');
      }
    } catch (err: any) {
      setNotifySuccess('تعذر إرسال التنبيه: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setNotifying(false);
    }
  };

  const handleToggleKillSwitch = async () => {
    setKillSwitching(true);
    try {
      try {
        await apiClient.post(`/ai/chat/incidents/${incident.id}/kill-switch`, {
          disableTool: !incident.isolated,
        });
      } catch {
        await apiClient.post(`/super-admin/ai/incidents/${incident.id}/kill-switch`, {
          disableTool: !incident.isolated,
        });
      }
      onRefresh();
    } catch (err: any) {
      console.error(err);
    } finally {
      setKillSwitching(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/60 dark:bg-slate-900 overflow-y-auto">
      {/* Header bar of the inspector */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
              {incident.toolName}
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {incident.model}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyTrace}
              className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-[0.97] cursor-pointer"
              title="نسخ تفاصيل الخطأ"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              <span className="text-[10px] font-mono">{copied ? 'تم النسخ' : 'نسخ Trace'}</span>
            </button>
          </div>
        </div>

        {/* Operational Trigger Bar (2026 SaaS Actions) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            type="button"
            onClick={handleRetest}
            disabled={retesting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] text-white font-medium shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Play className={`h-3 w-3 ${retesting ? 'animate-spin' : ''}`} />
            <span>إعادة فحص الأداة</span>
          </button>

          <button
            type="button"
            onClick={handleNotifyTenant}
            disabled={notifying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.97] text-slate-700 dark:text-slate-200 font-medium transition-all disabled:opacity-50 cursor-pointer"
          >
            <Bell className="h-3 w-3 text-amber-500" />
            <span>إشعار التاجر بالخلل</span>
          </button>

          <button
            type="button"
            onClick={handleToggleKillSwitch}
            disabled={killSwitching}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all active:scale-[0.97] cursor-pointer ${
              incident.isolated
                ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950 dark:border-rose-800 dark:text-rose-200'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
            }`}
          >
            <Shield className="h-3 w-3" />
            <span>{incident.isolated ? 'إلغاء العزل' : 'عزل الأداة (Kill-Switch)'}</span>
          </button>
        </div>

        {notifySuccess && (
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
            {notifySuccess}
          </div>
        )}

        {retestResult && (
          <div
            className={`p-2.5 rounded-lg border text-xs space-y-1 ${
              retestResult.passed
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between font-bold">
              <span>نتيجة فحص التشخيص: {retestResult.passed ? 'سليمة برمجياً' : 'فشل الفحص'}</span>
              <span className="font-mono text-[10px] tabular-nums">{retestResult.latencyMs}ms</span>
            </div>
            <p className="text-[11px] leading-relaxed font-sans">{retestResult.message}</p>
          </div>
        )}
      </div>

      {/* Deep Inspection Body */}
      <div className="p-4 space-y-4 text-xs font-sans text-right">
        {/* Section 1: User Prompt Grounding */}
        {incident.userMessage && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
              <span>سياق رسالة المستخدم قبل الاستدعاء</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 leading-relaxed shadow-2xs">
              <p className="whitespace-pre-line text-pretty">{incident.userMessage}</p>
            </div>
          </div>
        )}

        {/* Section 2: Error Root Cause */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>رسالة الخطأ المرتجعة (Root Cause Error)</span>
          </div>
          <div className="p-3 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 font-mono text-[11px] leading-relaxed break-all">
            {incident.errorMessage || 'Unknown system error'}
          </div>
        </div>

        {/* Section 3: Tool Payload Inspector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5 text-sky-500" />
              <span>المدخلات الممررة للأداة (Tool Arguments JSON)</span>
            </span>
            <span className="font-mono text-[10px] text-slate-400">
              {Object.keys(incident.arguments || {}).length} Fields
            </span>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-black p-3.5 text-slate-100 font-mono text-[11px] overflow-x-auto dir-ltr text-left leading-relaxed">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(incident.arguments, null, 2)}
            </pre>
          </div>
        </div>

        {/* Section 4: Stack Trace (if available) */}
        {incident.stack && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              تفاصيل الـ Stack Trace البرمجي:
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-black p-3 text-slate-300 font-mono text-[10px] overflow-x-auto dir-ltr text-left max-h-48">
              <pre className="whitespace-pre-wrap">{incident.stack}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
