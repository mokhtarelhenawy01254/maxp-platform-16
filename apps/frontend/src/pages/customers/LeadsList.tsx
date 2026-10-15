import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Search,
  Upload,
  Download,
  Trash2,
  Users,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  customerService,
  Customer,
  CustomerFilters,
} from "../../services/customerService";
import LoadingSpinner from "../../components/LoadingSpinner";
import { useDateFormat } from "../../hooks/useDateFormat";
import CustomerImportModal from "./CustomerImportModal";
import { useAuth } from "../../hooks/useAuthSimple";
import { LeadsTable } from "./LeadsTable";

const LeadsList: React.FC = () => {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const { user } = useAuth();
  const isAdmin = ["OWNER", "COMPANY_ADMIN", "SUPER_ADMIN", "MANAGER"].includes(
    user?.role || "",
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<CustomerFilters>({
    page: 1,
    limit: 10,
    sortBy: "updatedAt",
    sortOrder: "desc",
    status: "LEAD",
    hasOrders: false,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const toggleSelectAll = () => {
    if (selectedIds.size === customers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set((customers || []).map((c) => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedIds.size} عميل محتمل؟`)) return;

    setIsBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => customerService.deleteCustomer(id)),
      );
      setSelectedIds(new Set());
      loadCustomers();
    } catch (err: any) {
      setError(err.message || "فشل في حذف العملاء");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا العميل المحتمل؟")) return;
    try {
      await customerService.deleteCustomer(id);
      loadCustomers();
    } catch (err: any) {
      setError(err.message || "فشل حذف العميل");
    }
  };

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await customerService.getCustomers(filters);
      setCustomers(response.data || []);
      setPagination(response.pagination || {
        page: 1,
        limit: 10,
        total: (response.data || []).length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    } catch (err: any) {
      setError(err.message || t("customers.loadingError"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, [filters]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({
      ...prev,
      search: searchQuery,
      page: 1,
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleExport = async (format: "csv" | "json") => {
    try {
      await customerService.exportCustomers(format, filters);
    } catch (err: any) {
      setError(err.message || t("customers.exportError"));
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              العملاء المحتملين (Leads)
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted/40 text-muted-foreground border border-border/70 font-mono tabular-nums">
              {pagination.total} عميل
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            إدارة ومتابعة العملاء الذين لم يكملوا عمليات الشراء بعد
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition-all active:scale-[0.97]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف ({selectedIds.size})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border/70 rounded-xl text-xs font-semibold text-foreground bg-card hover:bg-muted/30 transition-all shadow-2xs"
            >
              <Upload className="h-3.5 w-3.5 text-muted-foreground" />
              <span>استيراد</span>
            </button>
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border/70 rounded-xl text-xs font-semibold text-foreground bg-card hover:bg-muted/30 transition-all shadow-2xs"
            >
              <Download className="h-3.5 w-3.5 text-muted-foreground" />
              <span>تصدير CSV</span>
            </button>
            <Link
              to="/customers/new"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-2xs active:scale-[0.97]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إضافة عميل</span>
            </Link>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-card p-3 rounded-2xl border border-border/70 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث بالاسم، الهاتف أو البريد..."
                className="w-full pr-9 pl-3 py-2 text-xs border border-border/70 rounded-xl bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-hidden"
              />
            </div>
          </form>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-xl border border-border/60">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>عرض العملاء بحالة:</span>
            <span className="font-bold text-foreground">عميل محتمل (LEAD)</span>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading && customers.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <RotateCcw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-card border border-border/70 rounded-2xl p-12 text-center shadow-2xs">
          <div className="h-12 w-12 rounded-2xl bg-muted/40 flex items-center justify-center text-muted-foreground mx-auto mb-3 border border-border/60">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground mb-1">لا يوجد عملاء محتملين حالياً</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
            العملاء المحتملين الذين لم يكملوا الطلبات سيظهرون هنا لمتابعتهم.
          </p>
          {isAdmin && (
            <Link
              to="/customers/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.97] transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إضافة عميل محتمل</span>
            </Link>
          )}
        </div>
      ) : (
        <LeadsTable
          customers={customers}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleSelectAll={toggleSelectAll}
          isAdmin={isAdmin}
          formatDate={formatDate}
          onDeleteCustomer={handleDeleteCustomer}
          pagination={pagination}
          onPageChange={handlePageChange}
        />
      )}

      {/* Customer Import Modal */}
      {isImportModalOpen && (
        <CustomerImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            setIsImportModalOpen(false);
            loadCustomers();
          }}
        />
      )}
    </div>
  );
};

export default LeadsList;
