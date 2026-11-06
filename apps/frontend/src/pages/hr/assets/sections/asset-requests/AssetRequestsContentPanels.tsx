import React from "react";
import {
  PlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  CheckBadgeIcon,
  TagIcon,
  UserIcon,
  ComputerDesktopIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { AssetRequestRecord, AssetRequestsViewMode } from "./types";
import {
  getAssetRequestStatusColor,
  getAssetRequestStatusText,
} from "./helpers";

interface AssetRequestsContentPanelsProps {
  view: AssetRequestsViewMode;
  requests: AssetRequestRecord[];
  onOpenModal: () => void;
  onUpdateStatus: (
    id: string,
    status: string,
    rejectionReason?: string,
  ) => void;
}

export const AssetRequestsContentPanels: React.FC<
  AssetRequestsContentPanelsProps
> = ({ view, requests, onOpenModal, onUpdateStatus }) => {
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const approvedCount = requests.filter((r) => r.status === "APPROVED").length;

  if (view === "employee") {
    return (
      <div className="space-y-6">
        {/* Employee Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 text-amber-600 mb-2">
              <ClockIcon className="h-5 w-5" />
              <span className="text-sm font-bold">طلبات معلقة</span>
            </div>
            <p className="text-2xl font-black dark:text-white font-mono tabular-nums">
              {pendingCount}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3 text-blue-600 mb-2">
              <CheckBadgeIcon className="h-5 w-5" />
              <span className="text-sm font-bold">تمت الموافقة</span>
            </div>
            <p className="text-2xl font-black dark:text-white font-mono tabular-nums">
              {approvedCount}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <button
              onClick={onOpenModal}
              className="w-full h-full flex flex-col items-center justify-center gap-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-all border-2 border-dashed border-indigo-200 dark:border-indigo-800 py-2"
            >
              <PlusIcon className="h-6 w-6" />
              <span className="font-bold">طلب جديد</span>
            </button>
          </div>
        </div>

        {/* My Requests Table */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-x-auto">
          <table className="w-full text-right min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-400 text-xs font-bold uppercase tracking-wider text-right">
                <th className="px-6 py-4">التاريخ</th>
                <th className="px-6 py-4">النوع</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4">السبب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {requests.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-gray-400 italic"
                  >
                    لا توجد طلبات حالياً
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium dark:text-gray-300 font-mono tabular-nums">
                        {format(new Date(req.createdAt), "yyyy/MM/dd")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                          <ComputerDesktopIcon className="h-4 w-4 text-indigo-600" />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {req.assetType}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold border ${getAssetRequestStatusColor(req.status)}`}
                      >
                        {getAssetRequestStatusText(req.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
                        {req.reason}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          إدارة طلبات الموظفين
        </h3>
        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
          <span className="font-mono tabular-nums">{pendingCount}</span> طلب
          بانتظار القرار
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {requests
          .filter((r) => r.status === "PENDING")
          .map((req) => (
            <div
              key={req.id}
              className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 border border-indigo-100 dark:border-indigo-800">
                    <UserIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">
                      {req.requesterName ||
                        `${req.requester?.firstName || ""} ${req.requester?.lastName || ""}`.trim() ||
                        "غير معروف"}
                    </h4>
                    <p className="text-xs text-gray-400 font-mono tabular-nums">
                      {req.requester?.employeeNumber}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold dark:text-gray-300 font-mono tabular-nums">
                    {format(new Date(req.createdAt), "PPP", { locale: ar })}
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-2">
                  <TagIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-bold dark:text-white">
                    المطلوب: {req.assetType}
                  </span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl">
                  <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                    “{req.reason}”
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => onUpdateStatus(req.id, "APPROVED")}
                  className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                  موافقة وارسال WhatsApp
                </button>
                <button
                  onClick={() => {
                    const res = prompt("سبب الرفض:");
                    if (res) onUpdateStatus(req.id, "REJECTED", res);
                  }}
                  className="flex-1 bg-white dark:bg-gray-700 border border-red-200 text-red-600 py-3 rounded-xl text-sm font-bold hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                >
                  <XCircleIcon className="h-5 w-5" />
                  رفض
                </button>
              </div>
            </div>
          ))}

        {requests
          .filter((r) => r.status === "APPROVED")
          .map((req) => (
            <div
              key={req.id}
              className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs"
            >
              <div className="flex justify-between items-center mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full">
                  معتمد - بانتظار التسليم
                </span>
                <span className="text-[10px] text-gray-400 font-mono tabular-nums">
                  {req.id}
                </span>
              </div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                {req.requesterName ||
                  `${req.requester?.firstName || ""} ${req.requester?.lastName || ""}`.trim() ||
                  "غير معروف"}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 font-medium">
                تمت الموافقة على {req.assetType}. يرجى تخصيص أصل فعلي لإتمام
                العملية.
              </p>
              <button className="w-full rounded-xl border border-border/70 bg-muted/40 text-foreground py-2.5 text-sm font-semibold hover:bg-muted/70 transition-colors">
                تخصيص وتسليم الأصل
              </button>
            </div>
          ))}
      </div>
    </div>
  );
};
