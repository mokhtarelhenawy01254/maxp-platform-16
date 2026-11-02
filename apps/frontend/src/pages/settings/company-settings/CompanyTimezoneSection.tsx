import React from "react";
import { ClockIcon } from "@heroicons/react/24/outline";
import {
  DateFormatType,
  DATE_FORMAT_LABELS,
  formatTimeWithZone,
} from "../../../utils/dateFormat";

interface CompanyTimezoneSectionProps {
  timezone?: string;
  handleTimezoneChange: (timezone: string) => void;
  currentTime: Date;
  dateFormat: DateFormatType;
  setDateFormat: (format: DateFormatType) => void;
  dateFormatLoading: boolean;
  dateFormatError: string | null;
  formatDate: (date: Date | string) => string;
}

const AVAILABLE_DATE_FORMATS: DateFormatType[] = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
];

export const CompanyTimezoneSection: React.FC<CompanyTimezoneSectionProps> = ({
  timezone = "Asia/Riyadh",
  handleTimezoneChange,
  currentTime,
  dateFormat,
  setDateFormat,
  dateFormatLoading,
  dateFormatError,
  formatDate,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
        <ClockIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mr-2" />
        إعدادات الوقت والتاريخ
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label
            htmlFor="company-timezone"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            المنطقة الزمنية للشركة
          </label>
          <select
            id="company-timezone"
            name="timezone"
            autoComplete="off"
            value={timezone}
            onChange={(e) => handleTimezoneChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <optgroup label="الخليج العربي">
              <option value="Asia/Riyadh">الرياض - السعودية (GMT+3)</option>
              <option value="Asia/Kuwait">الكويت (GMT+3)</option>
              <option value="Asia/Bahrain">البحرين (GMT+3)</option>
              <option value="Asia/Qatar">قطر (GMT+3)</option>
              <option value="Asia/Dubai">دبي - الإمارات (GMT+4)</option>
              <option value="Asia/Muscat">مسقط - عمان (GMT+4)</option>
            </optgroup>
            <optgroup label="الشام والعراق">
              <option value="Asia/Amman">عمّان - الأردن (GMT+3)</option>
              <option value="Asia/Beirut">بيروت - لبنان (GMT+2)</option>
              <option value="Asia/Damascus">دمشق - سوريا (GMT+3)</option>
              <option value="Asia/Baghdad">بغداد - العراق (GMT+3)</option>
              <option value="Asia/Jerusalem">القدس - فلسطين (GMT+2)</option>
            </optgroup>
            <optgroup label="شمال أفريقيا">
              <option value="Africa/Cairo">القاهرة - مصر (GMT+2)</option>
              <option value="Africa/Tripoli">طرابلس - ليبيا (GMT+2)</option>
              <option value="Africa/Tunis">تونس (GMT+1)</option>
              <option value="Africa/Algiers">الجزائر (GMT+1)</option>
              <option value="Africa/Casablanca">الدار البيضاء - المغرب (GMT+1)</option>
              <option value="Africa/Khartoum">الخرطوم - السودان (GMT+2)</option>
            </optgroup>
            <optgroup label="أخرى">
              <option value="UTC">توقيت عالمي (UTC)</option>
            </optgroup>
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            سيتم استخدام هذا التوقيت في التقارير والحسابات اليومية
          </p>
        </div>
        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            توقيت الشركة الحالي
          </span>
          <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md p-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                الساعة الآن:
              </p>
              <p className="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {formatTimeWithZone(currentTime, timezone)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {timezone}
              </p>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1">
                {new Intl.DateTimeFormat("ar-EG", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  timeZone: timezone,
                }).format(currentTime)}
              </p>
            </div>
          </div>
        </div>
        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            تنسيق التاريخ
          </span>
          <div className="space-y-2">
            {AVAILABLE_DATE_FORMATS.map((format) => (
              <label key={format} className="flex items-center cursor-pointer">
                <input
                  id={`company-date-format-${format.replace(/\//g, "-")}`}
                  type="radio"
                  name="dateFormat"
                  value={format}
                  checked={dateFormat === format}
                  onChange={(e) => setDateFormat(e.target.value as DateFormatType)}
                  disabled={dateFormatLoading}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600"
                />
                <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">
                  {DATE_FORMAT_LABELS[format]}
                </span>
              </label>
            ))}
          </div>
          {dateFormatError && (
            <p className="text-xs text-red-600 mt-1">{dateFormatError}</p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            التنسيق المختار: {DATE_FORMAT_LABELS[dateFormat] || dateFormat}
          </p>
        </div>
        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            معاينة التاريخ
          </span>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              التاريخ الحالي:
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white font-mono tabular-nums">
              {formatDate(new Date())}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
