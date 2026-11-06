import React from 'react';
import {
  X,
  Lock,
  AlertTriangle,
  Check,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from './shippingOpsShared';

export interface TempCredentials {
  email: string;
  temporaryPassword: string;
  merchantName: string;
}

export interface AddClientModalProps {
  show: boolean;
  onClose: () => void;
  form: {
    name: string;
    email: string;
    phone: string;
    address: string;
    commissionRate: number;
    expectedMonthlyOrders: number;
    coverageMode: string;
    preferredCities: string;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    name: string;
    email: string;
    phone: string;
    address: string;
    commissionRate: number;
    expectedMonthlyOrders: number;
    coverageMode: string;
    preferredCities: string;
  }>>;
  onSubmit: (e: React.FormEvent) => void;
  actionLoading: boolean;
  isEn: boolean;
}

export const AddClientModal: React.FC<AddClientModalProps> = ({
  show,
  onClose,
  form,
  setForm,
  onSubmit,
  actionLoading,
  isEn,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isEn ? 'Add New Shipping Client' : 'إضافة عميل شحن جديد'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Client Name' : 'اسم العميل / المتجر'} *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={isEn ? 'e.g. Elegance Store' : 'مثال: متجر الرقي'}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Email' : 'البريد الإلكتروني'} *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="client@example.com"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Phone Number' : 'رقم الهاتف'}
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="010XXXXXXXX"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Address' : 'العنوان / المدينة'}
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder={isEn ? 'e.g. Cairo' : 'مثال: القاهرة - المعادي'}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Expected Monthly Orders' : 'حجم الشحنات الشهري المتوقع'} *
              </label>
              <input
                type="number"
                required
                min="1"
                value={form.expectedMonthlyOrders || ''}
                onChange={(e) => setForm({ ...form, expectedMonthlyOrders: Number(e.target.value) || 0 })}
                placeholder={isEn ? 'e.g. 500' : 'مثال: 500'}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:ring-2 focus:ring-primary focus:outline-none tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                {isEn ? 'Coverage Mode' : 'نوع التغطية'}
              </label>
              <select
                value={form.coverageMode || 'BOTH'}
                onChange={(e) => setForm({ ...form, coverageMode: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:outline-none"
              >
                <option value="BOTH">{isEn ? 'Governorates & Cities' : 'محافظات ومدن معاً'}</option>
                <option value="GOVERNORATES">{isEn ? 'Governorates Only' : 'محافظات فقط'}</option>
                <option value="CITIES">{isEn ? 'Cities Only' : 'مدن فقط'}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              {isEn ? 'Preferred / Target Cities' : 'المدن والمناطق المفضلة'}
            </label>
            <input
              type="text"
              value={form.preferredCities || ''}
              onChange={(e) => setForm({ ...form, preferredCities: e.target.value })}
              placeholder={isEn ? 'e.g. Nasr City, New Cairo, 6th of October' : 'مثال: مدينة نصر، التجمع الخامس، 6 أكتوبر'}
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-800 rounded-lg bg-transparent focus:ring-2 focus:ring-primary focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {isEn ? 'Cancel' : 'إلغاء'}
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-95 disabled:opacity-50"
            >
              {actionLoading ? (isEn ? 'Saving...' : 'جاري الحفظ...') : (isEn ? 'Create Client' : 'إنشاء العميل')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export interface CredentialsModalProps {
  credentials: TempCredentials | null;
  onClose: () => void;
  copied: boolean;
  onCopy: (text: string) => void;
  isEn: boolean;
}

export const CredentialsModal: React.FC<CredentialsModalProps> = ({
  credentials,
  onClose,
  copied,
  onCopy,
  isEn,
}) => {
  if (!credentials) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <Lock className="w-6 h-6" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {isEn ? 'Temporary Portal Credentials' : 'بيانات دخول بوابة العميل المؤقتة'}
          </h3>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{isEn ? 'Save Now — Visible Once Only' : 'تنبيه أمني: انسخ كلمة المرور الآن!'}</span>
          </div>
          <p>
            {isEn
              ? 'This temporary password will not be displayed again for security reasons. Provide it to the client to log in.'
              : 'لن تظهر كلمة المرور المؤقتة مرة أخرى لأسباب أمنية. يرجى نسخها وتزويد العميل بها لتسجيل الدخول لبوابته.'}
          </p>
        </div>

        <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-500">{isEn ? 'Client' : 'العميل'}:</div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{credentials.merchantName}</div>
          <div className="text-xs text-slate-500 pt-1">{isEn ? 'Email' : 'البريد الإلكتروني'}:</div>
          <div className="text-sm font-mono text-slate-900 dark:text-white select-all">{credentials.email}</div>
          <div className="text-xs text-slate-500 pt-1">{isEn ? 'Temporary Password' : 'كلمة المرور المؤقتة'}:</div>
          <div className="flex items-center justify-between gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="font-mono text-base font-bold text-primary select-all">
              {credentials.temporaryPassword}
            </span>
            <button
              onClick={() => onCopy(credentials.temporaryPassword)}
              className="flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (isEn ? 'Copied' : 'تم النسخ') : (isEn ? 'Copy' : 'نسخ')}</span>
            </button>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 rounded-xl font-medium transition-colors"
        >
          {isEn ? 'Done & Close' : 'تم الحفظ وإغلاق'}
        </button>
      </div>
    </div>
  );
};

export interface ResetAccountModalProps {
  client: { name: string; hasAccount: boolean } | null;
  onClose: () => void;
  onConfirm: () => void;
  actionLoading: boolean;
  isEn: boolean;
}

export const ResetAccountModal: React.FC<ResetAccountModalProps> = ({
  client,
  onClose,
  onConfirm,
  actionLoading,
  isEn,
}) => {
  if (!client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {client.hasAccount
            ? (isEn ? 'Reset Password' : 'إعادة تعيين كلمة المرور')
            : (isEn ? 'Create Portal Account' : 'إنشاء حساب بوابة للعميل')}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {client.hasAccount
            ? (isEn
                ? `Are you sure you want to reset portal password for ${client.name}? The old password will be invalidated.`
                : `هل أنت متأكد من إعادة تعيين كلمة مرور البوابة لعميل (${client.name})؟ سيتم إبطال كلمة المرور السابقة فوراً.`)
            : (isEn
                ? `Create portal self-service credentials for ${client.name}?`
                : `هل تريد إنشاء حساب بوابة الخدمة الذاتية وتوليد كلمة مرور للعميل (${client.name})؟`)}
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {isEn ? 'Cancel' : 'إلغاء'}
          </button>
          <button
            type="button"
            disabled={actionLoading}
            onClick={onConfirm}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
          >
            {actionLoading ? (isEn ? 'Processing...' : 'جاري المعالجة...') : (isEn ? 'Generate Password' : 'توليد كلمة مرور')}
          </button>
        </div>
      </div>
    </div>
  );
};

export interface ClientSummaryModalProps {
  client: { name: string; email: string } | null;
  onClose: () => void;
  summaryData: any;
  summaryLoading: boolean;
  isEn: boolean;
}

export const ClientSummaryModal: React.FC<ClientSummaryModalProps> = ({
  client,
  onClose,
  summaryData,
  summaryLoading,
  isEn,
}) => {
  if (!client) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-xl space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{client.name}</h3>
            <span className="text-xs text-slate-500">{client.email}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {summaryLoading ? (
          <div className="py-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <span>{isEn ? 'Loading summary...' : 'جاري تحميل ملخص العميل...'}</span>
          </div>
        ) : summaryData ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">{isEn ? 'Total Shipments' : 'إجمالي الشحنات'}</span>
                <div className="text-xl font-bold mt-0.5 tabular-nums">{summaryData.totalShipments}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">{isEn ? 'Delivery Rate' : 'نسبة التسليم'}</span>
                <div className="text-xl font-bold mt-0.5 text-emerald-600 tabular-nums">{summaryData.deliveryRate}%</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">{isEn ? 'Delivered' : 'تم التسليم'}</span>
                <div className="text-xl font-bold mt-0.5 text-emerald-600 tabular-nums">{summaryData.deliveredCount}</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-xs text-slate-500">{isEn ? 'Returned' : 'مرتجع'}</span>
                <div className="text-xl font-bold mt-0.5 text-rose-600 tabular-nums">{summaryData.returnedCount}</div>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800 flex justify-between items-center">
              <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                {isEn ? 'Estimated Pending COD' : 'إجمالي COD المعلق المستحق'}
              </span>
              <span className="text-base font-bold text-amber-800 dark:text-amber-300 tabular-nums">
                {formatCurrency(summaryData.estimatedPendingCod)}
              </span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
