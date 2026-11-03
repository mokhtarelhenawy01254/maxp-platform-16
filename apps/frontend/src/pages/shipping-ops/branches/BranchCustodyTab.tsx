import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Search,
  Filter,
  RefreshCw,
  ArrowLeftRight,
  GitCompare,
} from 'lucide-react';
import { toast } from 'sonner';
import { ShippingBranch } from '../shippingOpsShared';
import { BranchTransferModal } from './BranchTransferModal';
import { BranchCustodyDiffTab } from './BranchCustodyDiffTab';
import { BranchCustodyKPIs } from './BranchCustodyKPIs';
import { BranchCustodyTable } from './BranchCustodyTable';

interface BranchCustodyTabProps {
  branches: ShippingBranch[];
}

export const BranchCustodyTab: React.FC<BranchCustodyTabProps> = ({ branches }) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    branches.length > 0 ? branches[0].id : ''
  );
  const [subView, setSubView] = useState<'inventory' | 'diff'>('inventory');

  // Inventory & Summary state
  const [loading, setLoading] = useState(false);
  const [shipments, setShipments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Multi-select for transfer
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const token = localStorage.getItem('token');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const currentBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  const fetchBranchData = useCallback(async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      if (search) params.append('search', search);
      params.append('page', String(page));
      params.append('limit', '25');

      const [invRes, sumRes] = await Promise.all([
        fetch(`/api/v1/shipping-portal/branches/${selectedBranchId}/inventory?${params.toString()}`, {
          headers: authHeaders,
        }),
        fetch(`/api/v1/shipping-portal/branches/${selectedBranchId}/summary`, {
          headers: authHeaders,
        }),
      ]);

      const [invData, sumData] = await Promise.all([invRes.json(), sumRes.json()]);

      if (invData.success) {
        setShipments(invData.shipments || []);
        setTotalPages(invData.pagination?.totalPages || 1);
        setTotalCount(invData.pagination?.total || 0);
      }
      if (sumData.success) {
        setSummary(sumData.summary || null);
      }
    } catch {
      toast.error('حدث خطأ أثناء تحميل بيانات عهدة الفرع');
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, statusFilter, search, page]);

  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  useEffect(() => {
    if (selectedBranchId && subView === 'inventory') {
      fetchBranchData();
      setSelectedIds([]);
    }
  }, [selectedBranchId, subView, fetchBranchData]);

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === shipments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(shipments.map((s) => s.id));
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Cockpit Controls & View Switcher */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Branch Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {isEn ? 'Select Branch:' : 'فرع العهدة:'}
            </span>
          </div>
          <select
            value={selectedBranchId}
            onChange={(e) => {
              setSelectedBranchId(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/70 text-xs font-semibold outline-none min-w-[200px]"
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.governorate} - {b.code})
              </option>
            ))}
          </select>

          {/* Subview Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              onClick={() => setSubView('inventory')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                subView === 'inventory'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              {isEn ? 'Current Inventory' : 'شحنات العهدة الحالية'}
            </button>
            <button
              onClick={() => setSubView('diff')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                subView === 'diff'
                  ? 'bg-white dark:bg-slate-900 text-purple-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>{isEn ? 'Custody Diff' : 'تقرير فروق العهدة'}</span>
            </button>
          </div>
        </div>

        {/* Action buttons if inventory view */}
        {subView === 'inventory' && (
          <div className="flex items-center gap-2">
            <button
              onClick={fetchBranchData}
              disabled={loading}
              className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
              title="تحديث العهدة"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Transfer Action Trigger */}
            <button
              onClick={() => setShowTransferModal(true)}
              disabled={selectedIds.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>{isEn ? `Transfer (${selectedIds.length})` : `تحويل شحنات (${selectedIds.length})`}</span>
            </button>
          </div>
        )}
      </div>

      {subView === 'diff' ? (
        <BranchCustodyDiffTab />
      ) : (
        <>
          {/* KPI Cards for Selected Branch */}
          {summary && <BranchCustodyKPIs summary={summary} />}

          {/* Filters Bar & Status Chips */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="ابحث بالباركود أو رقم التتبع أو اسم المستلم..."
                  className="w-full pr-9 pl-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs outline-none"
                />
              </div>

              {/* Status select */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs outline-none"
                >
                  <option value="ALL">جميع الحالات</option>
                  <option value="RECEIVED_AT_HUB">تم الاستلام في الهاَب</option>
                  <option value="OUT_FOR_DELIVERY">قيد التسليم</option>
                  <option value="PENDING">قيد الانتظار</option>
                  <option value="FAILED_ATTEMPT">محاولة فاشلة</option>
                  <option value="RETURNED">مرتجع</option>
                </select>
              </div>
            </div>
          </div>

          {/* Inventory Table */}
          <BranchCustodyTable
            shipments={shipments}
            loading={loading}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        </>
      )}

      {/* Transfer Modal */}
      {currentBranch && (
        <BranchTransferModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          sourceBranch={currentBranch}
          branches={branches}
          selectedShipmentIds={selectedIds}
          onSuccess={() => {
            fetchBranchData();
            setSelectedIds([]);
          }}
        />
      )}
    </div>
  );
};
