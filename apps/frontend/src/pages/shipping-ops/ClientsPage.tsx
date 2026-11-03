import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from './shippingOpsShared';
import {
  AddClientModal,
  CredentialsModal,
  ResetAccountModal,
  ClientSummaryModal,
  TempCredentials,
} from './ClientModals';
import { ClientTableRow, ShippingClient } from './ClientTableRow';

export const ClientsPage: React.FC = () => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [clients, setClients] = useState<ShippingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState<ShippingClient | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState<ShippingClient | null>(null);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // New Credentials Display (one-time)
  const [credentialsNotice, setCredentialsNotice] = useState<TempCredentials | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    commissionRate: 10,
  });

  const token = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? window.localStorage.getItem('token') : '';
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);

      const res = await fetch(`/api/v1/shipping-clients-admin/clients?${params.toString()}`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setClients(data.data || []);
      } else {
        toast.error(data.error || 'فشل في جلب قائمة عملاء الشحن');
      }
    } catch {
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error('يرجى ملء الاسم والبريد الإلكتروني');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/v1/shipping-clients-admin/clients', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'تم إنشاء عميل الشحن وحساب البوابة');
        setShowAddModal(false);
        setCredentialsNotice({
          merchantName: data.data.merchant.name,
          email: data.data.credentials.email,
          temporaryPassword: data.data.credentials.temporaryPassword,
        });
        setForm({ name: '', email: '', phone: '', address: '', commissionRate: 10 });
        fetchClients();
      } else {
        toast.error(data.error || 'فشل في إنشاء العميل');
      }
    } catch {
      toast.error('حدث خطأ أثناء إرسال البيانات');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (client: ShippingClient) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/shipping-clients-admin/clients/${client.id}/account`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'تم إنشاء/إعادة تعيين كلمة المرور');
        setShowResetModal(null);
        setCredentialsNotice({
          merchantName: client.name,
          email: data.data.credentials.email,
          temporaryPassword: data.data.credentials.temporaryPassword,
        });
        fetchClients();
      } else {
        toast.error(data.error || 'فشل في إعادة تعيين كلمة المرور');
      }
    } catch {
      toast.error('حدث خطأ أثناء إعادة التعيين');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (client: ShippingClient) => {
    const targetStatus = !(client.account ? client.account.isActive : client.isActive);
    try {
      const res = await fetch(`/api/v1/shipping-clients-admin/clients/${client.id}/account`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ isActive: targetStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(targetStatus ? 'تم تفعيل حساب العميل' : 'تم تعطيل حساب العميل');
        fetchClients();
      } else {
        toast.error(data.error || 'فشل في تحديث حالة الحساب');
      }
    } catch {
      toast.error('خطأ أثناء تعديل الحالة');
    }
  };

  const handleOpenSummary = async (client: ShippingClient) => {
    setShowSummaryModal(client);
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/v1/shipping-clients-admin/clients/${client.id}/summary`, {
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.success) {
        setSummaryData(data.data.summary);
      }
    } catch {
      toast.error('فشل في جلب ملخص العميل');
    } finally {
      setSummaryLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('تم نسخ كلمة المرور المؤقتة');
    setTimeout(() => setCopied(false), 2500);
  };

  // KPIs
  const totalClients = clients.length;
  const activeAccounts = clients.filter((c) => c.hasAccount && c.account?.isActive).length;
  const monthShipments = clients.reduce((acc, c) => acc + (c.metrics?.monthShipments || 0), 0);
  const totalPendingCod = clients.reduce((acc, c) => acc + (c.metrics?.pendingCodAmount || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isEn ? 'Shipping Clients' : 'عملاء الشحن'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isEn
              ? 'Manage shipping client (merchant) portal accounts, temporary passwords, and scoping.'
              : 'إدارة حسابات عملاء الشحن (التجار) وصلاحيات بوابة الخدمة الذاتية'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchClients()}
            disabled={loading}
            aria-label={isEn ? 'Refresh' : 'تحديث'}
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium shadow-sm hover:opacity-95 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? 'Add Client' : 'إضافة عميل'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-500 font-medium">{isEn ? 'Total Clients' : 'إجمالي العملاء'}</span>
          <div className="text-2xl font-bold mt-1 text-slate-900 dark:text-white tabular-nums">{totalClients}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-500 font-medium">{isEn ? 'Active Portals' : 'بوابات مفعّلة'}</span>
          <div className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 tabular-nums">{activeAccounts}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-500 font-medium">{isEn ? 'Month Shipments' : 'شحنات الشهر'}</span>
          <div className="text-2xl font-bold mt-1 text-slate-900 dark:text-white tabular-nums">{monthShipments}</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-500 font-medium">{isEn ? 'Pending COD' : 'COD معلّق'}</span>
          <div className="text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400 tabular-nums">
            {formatCurrency(totalPendingCod)}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl">
        <Search className="w-4 h-4 text-slate-400 ms-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isEn ? 'Search by name, email, or phone...' : 'البحث بالاسم، البريد الإلكتروني، أو الهاتف...'}
          className="flex-1 bg-transparent border-0 text-sm focus:outline-none text-slate-900 dark:text-white placeholder-slate-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-start">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3 text-start">{isEn ? 'Client' : 'العميل'}</th>
                <th className="px-4 py-3 text-start">{isEn ? 'Email' : 'البريد الإلكتروني'}</th>
                <th className="px-4 py-3 text-center">{isEn ? 'Portal Account' : 'حالة البوابة'}</th>
                <th className="px-4 py-3 text-center">{isEn ? 'Month Shipments' : 'شحنات الشهر'}</th>
                <th className="px-4 py-3 text-center">{isEn ? 'Pending COD' : 'COD معلّق'}</th>
                <th className="px-4 py-3 text-end">{isEn ? 'Actions' : 'الإجراءات'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>{isEn ? 'Loading clients...' : 'جاري تحميل العملاء...'}</span>
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p>{isEn ? 'No clients found' : 'لا يوجد عملاء شحن مسجلين'}</p>
                  </td>
                </tr>
              ) : (
                clients.map((client) => (
                  <ClientTableRow
                    key={client.id}
                    client={client}
                    isEn={isEn}
                    onOpenSummary={handleOpenSummary}
                    onOpenReset={setShowResetModal}
                    onToggleStatus={handleToggleStatus}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modular Modals */}
      <AddClientModal
        show={showAddModal}
        onClose={() => setShowAddModal(false)}
        form={form}
        setForm={setForm}
        onSubmit={handleCreateClient}
        actionLoading={actionLoading}
        isEn={isEn}
      />

      <CredentialsModal
        credentials={credentialsNotice}
        onClose={() => setCredentialsNotice(null)}
        copied={copied}
        onCopy={copyToClipboard}
        isEn={isEn}
      />

      <ResetAccountModal
        client={showResetModal}
        onClose={() => setShowResetModal(null)}
        onConfirm={() => showResetModal && handleResetPassword(showResetModal)}
        actionLoading={actionLoading}
        isEn={isEn}
      />

      <ClientSummaryModal
        client={showSummaryModal}
        onClose={() => setShowSummaryModal(null)}
        summaryData={summaryData}
        summaryLoading={summaryLoading}
        isEn={isEn}
      />
    </div>
  );
};

export default ClientsPage;
