import React from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { useCourierManagementData } from './hooks/useCourierManagementData';
import { CourierSummaryCards } from './components/CourierSummaryCards';
import { CourierTable } from './components/CourierTable';
import { CourierModal } from './components/CourierModal';

const CourierManagementPage: React.FC = () => {
  const {
    couriers,
    summary,
    loading,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    isModalOpen,
    setIsModalOpen,
    editingCourier,
    saving,
    formData,
    setFormData,
    fetchData,
    handleOpenCreate,
    handleOpenEdit,
    handleSave,
    handleDelete,
  } = useCourierManagementData();

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">إدارة المناديب والتوصيل الداخلي</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            متابعة أسطول التوصيل الداخلي، أداء المناديب، ومراقبة العهد النقدية والبضائع في الميدان
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/shipping/delivery-runs"
            className="px-3.5 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            رحلات التوزيع والمانيفست
          </Link>
          <Link
            to="/shipping/courier-settlements"
            className="px-3.5 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            التوريد المالي وتسوية الوردية
          </Link>
          <Link
            to="/marketplace/apps/internal-courier-fleet/settings"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Cog6ToothIcon className="w-4 h-4 text-slate-500" />
            إعدادات الأسطول
          </Link>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-slate-900 dark:bg-slate-50 dark:text-slate-900 rounded-lg hover:bg-slate-800 transition active:scale-95"
          >
            <PlusIcon className="w-4 h-4" />
            إضافة مندوب جديد
          </button>
        </div>
      </div>

      {/* Telemetry Summary Cards */}
      <CourierSummaryCards summary={summary} />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlassIcon className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم، الهاتف، أو رقم اللوحة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-100"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none"
          >
            <option value="ALL">كل حالات العمل</option>
            <option value="AVAILABLE">متاح بالمقر</option>
            <option value="ON_DUTY">في المأمورية</option>
            <option value="OFF_DUTY">خارج الدوام</option>
          </select>
          <button
            onClick={fetchData}
            title="تحديث"
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Couriers Grid/Table */}
      <CourierTable
        couriers={couriers}
        onOpenEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      {/* Add / Edit Modal */}
      <CourierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingCourier={editingCourier}
        formData={formData}
        setFormData={setFormData}
        saving={saving}
        onSave={handleSave}
      />
    </div>
  );
};

export default CourierManagementPage;
