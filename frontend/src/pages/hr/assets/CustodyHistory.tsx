import React, { useState, useEffect } from "react";
import {
  ClipboardDocumentListIcon,
  UserIcon,
  ComputerDesktopIcon,
  MagnifyingGlassIcon,
  CalendarIcon,
  CheckCircleIcon,
  PencilSquareIcon,
  ArrowUturnLeftIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { companyAwareApi } from "../../../services/companyAwareApi";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import toast from "react-hot-toast";
import AssetForm from "./AssetForm";
import AssetAssignmentModal from "./AssetAssignmentModal";

interface CustodyRecord {
  id: string;
  assetId: string;
  employeeId: string;
  assignedAt: string;
  returnedAt: string | null;
  condition: string;
  notes: string;
  asset: {
    id: string;
    name: string;
    code: string;
    category: { name: string };
    status: string;
  };
  employee: {
    firstName: string;
    lastName: string;
    employeeId: string;
  };
}

const CustodyHistory: React.FC = () => {
  const [records, setRecords] = useState<CustodyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // States for Modals
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [returningAsset, setReturningAsset] = useState<any>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const response = await companyAwareApi.get("/hr/assets/custody/active");
      if (
        response.data.success &&
        response.data.data &&
        response.data.data.length > 0
      ) {
        setRecords(response.data.data);
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error("Error fetching custody records:", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(
    (record) =>
      record.asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.employee.firstName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      record.employee.lastName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      record.asset.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-40 gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-[3px] border-indigo-100 border-t-indigo-600 relative"></div>
        </div>
        <p className="text-gray-400 font-bold animate-pulse">جاري تحميل البيانات...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardDocumentListIcon className="h-7 w-7 text-amber-600" />
            العهد النشطة
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            تتبع وإدارة جميع الأصول المسلمة للموظفين حالياً
          </p>
        </div>
        <div className="relative max-w-sm w-full">
          <MagnifyingGlassIcon className="h-5 w-5 absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="بحث عن موظف أو أصل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-12 pl-4 py-3 border-2 border-gray-100 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm font-medium"
          />
        </div>
      </div>

      {filteredRecords.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm"
        >
          <div className="h-24 w-24 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ClipboardDocumentListIcon className="h-12 w-12 text-gray-300 dark:text-gray-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-400">لا توجد عهد نشطة حالياً</h3>
          <p className="text-sm text-gray-400 mt-2">ابدأ بتعيين أصل لموظف من قائمة الأصول</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredRecords.map((record, idx) => (
              <motion.div
                key={record.id}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                className="group relative bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden"
              >
                {/* Decorative background circle */}
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex flex-col lg:flex-row lg:items-center gap-8 relative z-10">
                  {/* Asset Info */}
                  <div className="flex items-center gap-5 flex-1 min-w-[300px]">
                    <div className="relative">
                      <div className="p-4 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/20 dark:to-violet-900/20 rounded-[2rem] group-hover:rotate-6 transition-transform duration-500">
                        <ComputerDesktopIcon className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full flex items-center justify-center">
                        <CheckCircleIcon className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-black text-xl text-gray-900 dark:text-white mb-2 decoration-indigo-500/30 group-hover:underline underline-offset-4 decoration-2">
                        {record.asset.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                          {record.asset.code}
                        </span>
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                          <TagIcon className="h-3 w-3" />
                          {record.asset.category.name}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Divider line for mobile */}
                  <div className="lg:hidden h-px bg-gray-50 dark:bg-gray-700/50"></div>

                  {/* Employee Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-tr from-violet-600 to-fuchsia-500 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                      <UserIcon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-0.5">الموظف الحالي</p>
                      <h5 className="font-black text-lg text-gray-900 dark:text-white">
                        {record.employee.firstName} {record.employee.lastName}
                      </h5>
                    </div>
                  </div>

                  {/* Assignment Info */}
                  <div className="flex flex-col sm:flex-row items-center gap-8 justify-end">
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 justify-end">
                        <CalendarIcon className="h-3.5 w-3.5 text-indigo-400" />
                        <span>منذ تاريخ</span>
                      </div>
                      <p className="text-sm font-black text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/30 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                        {format(new Date(record.assignedAt), "PPP", { locale: ar })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setEditingAsset(record.asset)}
                        className="p-3 bg-white dark:bg-gray-800 text-gray-400 hover:text-indigo-600 border border-gray-100 dark:border-gray-700 rounded-2xl transition-all shadow-sm hover:shadow-lg hover:-translate-y-1"
                        title="تعديل"
                      >
                        <PencilSquareIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setReturningAsset({ ...record.asset, type: 'return' })}
                        className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-1 active:translate-y-0 transition-all text-sm"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                        استرجاع
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals Integration */}
      {editingAsset && (
        <AssetForm
          initialData={editingAsset}
          onClose={() => setEditingAsset(null)}
          onSuccess={() => {
            setEditingAsset(null);
            fetchRecords();
          }}
        />
      )}

      {returningAsset && (
        <AssetAssignmentModal
          asset={returningAsset}
          type="return"
          onClose={() => setReturningAsset(null)}
          onSuccess={() => {
            setReturningAsset(null);
            fetchRecords();
          }}
        />
      )}
    </div>
  );
};

export default CustodyHistory;
