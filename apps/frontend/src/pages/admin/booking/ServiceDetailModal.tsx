import { XMarkIcon, BuildingOffice2Icon } from "@heroicons/react/24/outline";
import { BookingService } from "./shared";

interface Props {
  service: BookingService;
  onClose: () => void;
}

export default function ServiceDetailModal({ service, onClose }: Props) {
  const bs = service.branchServices || [];
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold">{service.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{service.description || "لا يوجد وصف"}</p>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${service.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>{service.isActive ? "نشط" : "غير نشط"}</span>
        </div>
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2"><BuildingOffice2Icon className="w-4 h-4" />الفروع والباقات</h4>
            {bs.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">لم يتم ربط الخدمة بأي فرع</p>
            ) : (
              <div className="space-y-3">
                {bs.map(b => (
                  <div key={b.id} className="border dark:border-gray-600 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{b.branch.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${b.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>{b.isActive ? "متاحة" : "غير متاحة"}</span>
                    </div>
                    {b.hasPackages && (b.packages || []).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {(b.packages || []).map((pkg, i) => (
                          <span key={i} className="text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                            {pkg.count} جلسات - {pkg.price} ج.م
                            {pkg.originalPrice && <span className="line-through mr-1 text-gray-400">{pkg.originalPrice} ج.م</span>}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500">لا توجد باقات</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 space-y-1">
            <p>تاريخ الإضافة: {new Date(service.createdAt).toLocaleDateString("ar-EG")}</p>
            <p>معرف الخدمة: {service.id}</p>
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">إغلاق</button>
        </div>
      </div>
    </div>
  );
}
