import React from 'react';
import {
  Phone,
  BarChart2,
  Key,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Package,
} from 'lucide-react';
import { formatCurrency } from './shippingOpsShared';

export interface ClientAccount {
  userId: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface ClientMetrics {
  totalShipments: number;
  monthShipments: number;
  deliveredCount: number;
  returnedCount: number;
  pendingCount: number;
  pendingCodAmount: number;
}

export interface ShippingClient {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
  commissionRate: number;
  expectedMonthlyOrders?: number | null;
  coverageMode?: string | null;
  preferredCities?: string | null;
  currentPackage?: {
    id: string;
    name: string;
    pricingMode: string;
    monthlyVolumeTo?: number | null;
    perShipmentPrice?: number | null;
    flatMonthlyPrice?: number | null;
  } | null;
  hasAccount: boolean;
  account?: ClientAccount | null;
  metrics: ClientMetrics;
}

interface ClientTableRowProps {
  client: ShippingClient;
  isEn: boolean;
  onOpenSummary: (client: ShippingClient) => void;
  onOpenReset: (client: ShippingClient) => void;
  onToggleStatus: (client: ShippingClient) => void;
}

export const ClientTableRow: React.FC<ClientTableRowProps> = ({
  client,
  isEn,
  onOpenSummary,
  onOpenReset,
  onToggleStatus,
}) => {
  const hasAcc = client.hasAccount && client.account;
  const isAccActive = hasAcc ? client.account?.isActive : false;

  return (
    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
      <td className="px-4 py-3">
        <div className="font-semibold text-slate-900 dark:text-white">{client.name}</div>
        {client.phone && (
          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            <Phone className="w-3 h-3" />
            <span className="tabular-nums" dir="ltr">{client.phone}</span>
          </div>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
        {client.email}
      </td>
      <td className="px-4 py-3 text-center">
        {!hasAcc ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span>{isEn ? 'No Portal' : 'بدون حساب'}</span>
          </span>
        ) : isAccActive ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
            <ShieldCheck className="w-3 h-3" />
            <span>{isEn ? 'Active' : 'مفعّل'}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
            <ShieldAlert className="w-3 h-3" />
            <span>{isEn ? 'Disabled' : 'معطّل'}</span>
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-center font-medium tabular-nums text-slate-700 dark:text-slate-300">
        {client.expectedMonthlyOrders ? (
          <span className="inline-flex items-center gap-1">
            <span>{client.expectedMonthlyOrders}</span>
            <span className="text-[11px] text-slate-400">{isEn ? '/mo' : 'ش/ش'}</span>
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        {client.currentPackage ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">
            <Package className="w-3 h-3 text-blue-500" />
            <span className="truncate max-w-[110px]">{client.currentPackage.name}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-400">{isEn ? 'No Package' : 'بدون باقة'}</span>
        )}
      </td>
      <td className="px-4 py-3 text-center font-medium tabular-nums text-slate-900 dark:text-white">
        {client.metrics?.monthShipments || 0}
      </td>
      <td className="px-4 py-3 text-center font-medium tabular-nums text-amber-600 dark:text-amber-400">
        {formatCurrency(client.metrics?.pendingCodAmount || 0)}
      </td>
      <td className="px-4 py-3 text-end">
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => onOpenSummary(client)}
            title={isEn ? 'Performance Summary' : 'ملخص الأداء'}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition-colors"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenReset(client)}
            title={hasAcc ? (isEn ? 'Reset Password' : 'إعادة تعيين كلمة المرور') : (isEn ? 'Create Portal Account' : 'إنشاء حساب بوابة')}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-amber-600 dark:text-amber-400 transition-colors"
          >
            <Key className="w-4 h-4" />
          </button>
          {hasAcc && (
            <button
              onClick={() => onToggleStatus(client)}
              title={isAccActive ? (isEn ? 'Deactivate Account' : 'تعطيل الحساب') : (isEn ? 'Activate Account' : 'تفعيل الحساب')}
              className={`p-1.5 rounded transition-colors ${
                isAccActive
                  ? 'hover:bg-rose-50 text-rose-600 dark:hover:bg-rose-950/40'
                  : 'hover:bg-emerald-50 text-emerald-600 dark:hover:bg-emerald-950/40'
              }`}
            >
              {isAccActive ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
