import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ExternalApiCredential,
  ExternalApiAuditLog,
  TenantCompany,
  CreateCredentialInput
} from './types';
import { CredentialsTable } from './components/CredentialsTable';
import { CreateCredentialModal } from './components/CreateCredentialModal';
import { RevealKeyModal } from './components/RevealKeyModal';
import { RevokeKeyModal } from './components/RevokeKeyModal';
import { AuditLogsViewer } from './components/AuditLogsViewer';
import tokenManager from '../../../utils/tokenManager';
import { buildApiUrl } from '../../../utils/urlHelper';
import { Key, Plus, FileCode, Activity, ShieldCheck, ShieldAlert, BookOpen } from 'lucide-react';

export const ExternalApiCredentialsPage: React.FC = () => {
  const [credentials, setCredentials] = useState<ExternalApiCredential[]>([]);
  const [companies, setCompanies] = useState<TenantCompany[]>([]);
  const [auditLogs, setAuditLogs] = useState<ExternalApiAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [isAuditLogsOpen, setIsAuditLogsOpen] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [revealedKeyName, setRevealedKeyName] = useState<string>('');
  const [selectedCredential, setSelectedCredential] = useState<ExternalApiCredential | null>(null);

  const requestWithAuth = useCallback(async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
    const token = tokenManager.getAccessToken();
    const res = await fetch(buildApiUrl(path), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {})
      }
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }
    return data;
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [credsRes, compsRes] = await Promise.all([
        requestWithAuth<{ success: boolean; data: ExternalApiCredential[] }>('super-admin/external-api/credentials'),
        requestWithAuth<{ success: boolean; data: TenantCompany[] }>('super-admin/external-api/companies').catch(() => ({ success: true, data: [] }))
      ]);

      setCredentials(credsRes.data || []);
      setCompanies(compsRes.data || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل تحميل بيانات مفاتيح API');
    } finally {
      setLoading(false);
    }
  }, [requestWithAuth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateCredential = async (input: CreateCredentialInput) => {
    try {
      setSubmitting(true);
      const res = await requestWithAuth<{
        success: boolean;
        message: string;
        data: ExternalApiCredential;
        secret: { apiKey: string; warning: string };
      }>('super-admin/external-api/credentials', {
        method: 'POST',
        body: JSON.stringify(input)
      });

      toast.success(res.message);
      setIsCreateOpen(false);
      setRevealedKey(res.secret.apiKey);
      setRevealedKeyName(input.name);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل إنشاء المفتاح');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeCredential = async (credentialId: string, reason: string) => {
    try {
      setSubmitting(true);
      const res = await requestWithAuth<{ success: boolean; message: string }>(
        `super-admin/external-api/credentials/${credentialId}`,
        {
          method: 'DELETE',
          body: JSON.stringify({ reason })
        }
      );

      toast.success(res.message);
      setIsRevokeOpen(false);
      setSelectedCredential(null);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'فشل إلغاء المفتاح');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenAuditLogs = async (cred: ExternalApiCredential) => {
    setSelectedCredential(cred);
    setIsAuditLogsOpen(true);
    try {
      setAuditLoading(true);
      const res = await requestWithAuth<{ success: boolean; data: { logs: ExternalApiAuditLog[] } }>(
        `super-admin/external-api/audit-logs?credentialId=${cred.id}`
      );
      setAuditLogs(res.data?.logs || []);
    } catch (err) {
      toast.error('فشل جلب سجلات التدقيق');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleRefreshAuditLogs = async () => {
    if (!selectedCredential) return;
    try {
      setAuditLoading(true);
      const res = await requestWithAuth<{ success: boolean; data: { logs: ExternalApiAuditLog[] } }>(
        `super-admin/external-api/audit-logs?credentialId=${selectedCredential.id}`
      );
      setAuditLogs(res.data?.logs || []);
    } catch (_err) {
      toast.error('فشل تحديث سجلات التدقيق');
    } finally {
      setAuditLoading(false);
    }
  };

  const activeCount = credentials.filter((c) => c.status === 'ACTIVE').length;
  const totalRequests = credentials.reduce((sum, c) => sum + (c.requestCount || 0), 0);
  const revokedCount = credentials.filter((c) => c.status === 'REVOKED').length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-right">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Key className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              واجهة API الخارجية والتكاملات
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            إدارة مفاتيح API الخارجية للوكلاء وبوتات التسويق مع سجل تدقيق لكل طلب وتحكم صارم بالسكوبات وعناوين IP.
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <a
            href="/api/v1/external/docs"
            target="_blank"
            rel="noreferrer"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition active:scale-[0.98]"
          >
            <BookOpen className="h-4 w-4" />
            <span>توثيق API التفاعلي</span>
          </a>

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition active:scale-[0.98] shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>إنشاء مفتاح جديد</span>
          </button>
        </div>
      </div>

      {/* Telemetry Bento Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl border border-border/60 bg-card shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground font-medium">إجمالي المفاتيح</span>
          <div className="text-2xl font-bold text-foreground font-mono tabular-nums">
            {credentials.length}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 shadow-sm space-y-1">
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">المفاتيح النشطة</span>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {activeCount}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border/60 bg-card shadow-sm space-y-1">
          <span className="text-xs text-muted-foreground font-medium">إجمالي الطلبات المعالجة</span>
          <div className="text-2xl font-bold text-foreground font-mono tabular-nums">
            {totalRequests.toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 shadow-sm space-y-1">
          <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">المفاتيح الملغاة (Kill Switch)</span>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono tabular-nums">
            {revokedCount}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <CredentialsTable
        credentials={credentials}
        loading={loading}
        onRevoke={(cred) => {
          setSelectedCredential(cred);
          setIsRevokeOpen(true);
        }}
        onViewAuditLogs={handleOpenAuditLogs}
      />

      {/* Modals */}
      <CreateCredentialModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateCredential}
        companies={companies}
        submitting={submitting}
      />

      <RevealKeyModal
        apiKey={revealedKey}
        keyName={revealedKeyName}
        onClose={() => setRevealedKey(null)}
      />

      <RevokeKeyModal
        credential={selectedCredential}
        isOpen={isRevokeOpen}
        onClose={() => {
          setIsRevokeOpen(false);
          setSelectedCredential(null);
        }}
        onConfirm={handleRevokeCredential}
        submitting={submitting}
      />

      <AuditLogsViewer
        isOpen={isAuditLogsOpen}
        onClose={() => {
          setIsAuditLogsOpen(false);
          setSelectedCredential(null);
        }}
        logs={auditLogs}
        loading={auditLoading}
        onRefresh={handleRefreshAuditLogs}
        selectedCredential={selectedCredential}
      />
    </div>
  );
};

export default ExternalApiCredentialsPage;
