import React from "react";
import {
  ArrowUturnLeftIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  Squares2X2Icon,
  SunIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { TodayAttendanceData } from "./types";
import { formatReportTime, getOwnerReportsImageUrl } from "./helpers";
import { DateInput } from '../../../components/ui/DateInput';

interface OwnerTodayAttendanceSectionProps {
  todayAttendanceData: TodayAttendanceData;
  attendancePreset: string;
  onPresetChange: (preset: string) => void;
  onSetCustomPreset: () => void;
  attendanceStartDate: string;
  onStartDateChange: (val: string) => void;
  attendanceEndDate: string;
  onEndDateChange: (val: string) => void;
}

export const OwnerTodayAttendanceSection: React.FC<
  OwnerTodayAttendanceSectionProps
> = ({
  todayAttendanceData,
  attendancePreset,
  onPresetChange,
  onSetCustomPreset,
  attendanceStartDate,
  onStartDateChange,
  attendanceEndDate,
  onEndDateChange,
}) => {
  return (
    <>
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDaysIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
            اختر الفترة الزمنية
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onPresetChange("today")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              attendancePreset === "today"
                ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <SunIcon className="w-4 h-4" />
            <span className="text-sm">اليوم</span>
          </button>

          <button
            onClick={() => onPresetChange("yesterday")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              attendancePreset === "yesterday"
                ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <ArrowUturnLeftIcon className="w-4 h-4" />
            <span className="text-sm">أمس</span>
          </button>

          <button
            onClick={() => onPresetChange("lastWeek")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              attendancePreset === "lastWeek"
                ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <CalendarIcon className="w-4 h-4" />
            <span className="text-sm">آخر 7 أيام</span>
          </button>

          <button
            onClick={() => onPresetChange("thisMonth")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              attendancePreset === "thisMonth"
                ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <Squares2X2Icon className="w-4 h-4" />
            <span className="text-sm">هذا الشهر</span>
          </button>

          <button
            onClick={() => onPresetChange("lastMonth")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              attendancePreset === "lastMonth"
                ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <CalendarDaysIcon className="w-4 h-4" />
            <span className="text-sm">الشهر الماضي</span>
          </button>
        </div>

        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="customRange"
              checked={attendancePreset === "custom"}
              onChange={(e) => {
                if (e.target.checked) {
                  onSetCustomPreset();
                }
              }}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <label
              htmlFor="customRange"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              فترة مخصصة
            </label>
          </div>

          {attendancePreset === "custom" && (
            <div className="flex flex-wrap items-center gap-3 mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30 animate-fadeIn">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  من:
                </label>
                <DateInput
                  value={attendanceStartDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono tabular-nums dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <span className="text-gray-400 font-bold">→</span>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  إلى:
                </label>
                <DateInput
                  value={attendanceEndDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono tabular-nums dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 p-5 rounded-xl text-white shadow-lg">
          <div className="flex items-center gap-2 text-sm opacity-90 mb-2">
            <CalendarDaysIcon className="w-5 h-5" />
            <span className="font-medium">الفترة المختارة</span>
          </div>
          <p className="text-lg font-bold leading-relaxed">
            {attendanceStartDate === attendanceEndDate
              ? new Date(attendanceStartDate).toLocaleDateString("ar-EG", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : `${new Date(attendanceStartDate).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })} - ${new Date(attendanceEndDate).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" })}`}
          </p>
          <div className="mt-3 pt-3 border-t border-white/20">
            <p className="text-xs opacity-80 font-mono tabular-nums">
              {attendanceStartDate === attendanceEndDate
                ? "يوم واحد"
                : `${Math.ceil((new Date(attendanceEndDate).getTime() - new Date(attendanceStartDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} يوم`}
            </p>
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-xl text-white">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <UserGroupIcon className="w-4 h-4" />
            إجمالي الحضور
          </div>
          <p className="text-3xl font-bold font-mono tabular-nums mt-1">
            {todayAttendanceData.totalPresent}
          </p>
        </div>
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-4 rounded-xl text-white">
          <div className="flex items-center gap-2 text-sm opacity-80">
            <ExclamationCircleIcon className="w-4 h-4" />
            متأخرين
          </div>
          <p className="text-3xl font-bold font-mono tabular-nums mt-1">
            {todayAttendanceData.totalLate}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-blue-600" />
            سجل حضور اليوم
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            الموظفين اللي سجلوا حضورهم اليوم فقط
          </p>
        </div>

        {todayAttendanceData.records.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <ClockIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">لا يوجد حضور مسجل اليوم</p>
            <p className="text-sm">لم يسجل أي موظف حضوره حتى الآن</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    الموظف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    الشركة
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    وقت الحضور
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    وقت الانصراف
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    ساعات العمل
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    الحالة
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {todayAttendanceData.records.map((record) => (
                  <tr
                    key={record.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center overflow-hidden">
                          {record.employee.avatar ? (
                            <img
                              src={
                                getOwnerReportsImageUrl(
                                  record.employee.avatar,
                                ) || ""
                              }
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-bold text-gray-400">
                              {record.employee.firstName?.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {record.employee.firstName}{" "}
                            {record.employee.lastName}
                          </p>
                          {record.employee.employeeNumber && (
                            <p className="text-xs font-mono tabular-nums text-gray-500 dark:text-gray-400">
                              #{record.employee.employeeNumber}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center overflow-hidden">
                          {record.company.logo ? (
                            <img
                              src={
                                getOwnerReportsImageUrl(record.company.logo) ||
                                ""
                              }
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <BuildingOffice2Icon className="w-3 h-3 text-gray-400" />
                          )}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {record.company.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono tabular-nums">
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {formatReportTime(record.checkIn)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono tabular-nums">
                      {record.checkOut ? (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {formatReportTime(record.checkOut)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">
                          لم ينصرف بعد
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono tabular-nums">
                      {record.workHours ? (
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          {record.workHours.toFixed(1)} ساعة
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.status === "LATE" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-medium font-mono tabular-nums">
                          <ExclamationCircleIcon className="w-3.5 h-3.5" />
                          متأخر {record.lateMinutes} دقيقة
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-xs font-medium">
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          في الوقت
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
};
