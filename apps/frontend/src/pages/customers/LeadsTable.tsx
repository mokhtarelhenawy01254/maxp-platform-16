import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle,
  Minus,
  AlertTriangle,
  Eye,
  Pencil,
  Trash2,
  Phone,
  Mail,
  MapPin,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { Customer } from '../../services/customerService';

interface LeadsTableProps {
  customers: Customer[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  isAdmin: boolean;
  formatDate: (date: string) => string;
  onDeleteCustomer: (id: string) => void;
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  onPageChange: (page: number) => void;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
  customers,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  isAdmin,
  formatDate,
  onDeleteCustomer,
  pagination,
  onPageChange,
}) => {
  const getRatingBadge = (rating?: string) => {
    if (!rating) return null;
    switch (rating) {
      case 'EXCELLENT':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
            <Sparkles className="w-3 h-3 text-purple-500" />
            <span>ممتاز</span>
          </span>
        );
      case 'GOOD':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            <span>جيد</span>
          </span>
        );
      case 'AVERAGE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border/70">
            <Minus className="w-3 h-3" />
            <span>متوسط</span>
          </span>
        );
      case 'BAD':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-destructive/10 text-destructive px-2 py-0.5 rounded-full border border-destructive/20">
            <AlertTriangle className="w-3 h-3 text-destructive" />
            <span>يحتاج متابعة</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; class: string }> = {
      LEAD: { label: 'عميل محتمل', class: 'bg-primary/10 text-primary border-primary/20' },
      NEW: { label: 'جديد', class: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
      CONTACTED: { label: 'تم التواصل', class: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
      QUALIFIED: { label: 'مؤهل للشراء', class: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
      LOST: { label: 'مفقود', class: 'bg-destructive/10 text-destructive border-destructive/20' },
    };
    const s = statusMap[status] || { label: status, class: 'bg-muted/40 text-muted-foreground border-border/70' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${s.class}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-2xs">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 border-b border-border/70 text-muted-foreground">
            <tr>
              {isAdmin && (
                <th className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={customers.length > 0 && selectedIds.size === customers.length}
                    onChange={onToggleSelectAll}
                    className="rounded border-border/80 text-primary focus:ring-0 cursor-pointer"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-right font-semibold">العميل المحتمل</th>
              <th className="px-4 py-3 text-right font-semibold">بيانات التواصل</th>
              <th className="px-4 py-3 text-right font-semibold">المدينة / المصدر</th>
              <th className="px-4 py-3 text-right font-semibold">التقييم</th>
              <th className="px-4 py-3 text-right font-semibold">الحالة</th>
              <th className="px-4 py-3 text-right font-semibold">تاريخ التسجيل</th>
              <th className="px-4 py-3 text-center font-semibold">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {customers.map((customer) => {
              const isSelected = selectedIds.has(customer.id);
              const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'عميل غير مسمى';

              return (
                <tr
                  key={customer.id}
                  className={`hover:bg-muted/20 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                >
                  {isAdmin && (
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(customer.id)}
                        className="rounded border-border/80 text-primary focus:ring-0 cursor-pointer"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-foreground text-xs">{fullName}</div>
                    {customer.email && (
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5" dir="ltr">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {customer.phone ? (
                      <div className="font-mono text-xs text-foreground flex items-center gap-1.5" dir="ltr">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span>{customer.phone}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="flex items-center gap-1 text-[11px]">
                      {customer.city && (
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          {customer.city}
                        </span>
                      )}
                      {customer.source && (
                        <span className="bg-muted/40 px-1.5 py-0.5 rounded text-[10px] border border-border/60">
                          {customer.source}
                        </span>
                      )}
                      {!customer.city && !customer.source && <span>—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">{getRatingBadge(customer.rating)}</td>
                  <td className="px-4 py-3">{getStatusBadge(customer.status || 'LEAD')}</td>
                  <td className="px-4 py-3 font-mono tabular-nums text-muted-foreground text-[11px]">
                    {formatDate(customer.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        to={`/customers/${customer.id}`}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors"
                        title="عرض التفاصيل"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Link>
                      {isAdmin && (
                        <>
                          <Link
                            to={`/customers/${customer.id}/edit`}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-lg transition-colors"
                            title="تعديل"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => onDeleteCustomer(customer.id)}
                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="حذف"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-2 text-xs">
          <span className="text-muted-foreground font-mono tabular-nums">
            صفحة {pagination.page} من {pagination.totalPages} ({pagination.total} عميل)
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-foreground disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="p-1.5 rounded-lg border border-border/70 bg-card hover:bg-muted/40 text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
