import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { XMarkIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../hooks/useAuthSimple";

export interface FilterState {
  unreadOnly: boolean;
  assignedTo: "all" | "me" | "unassigned";
  startDate: Date | null;
  endDate: Date | null;
}

interface FilterPanelProps {
  isOpen: boolean;
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onClose: () => void;
  onReset: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  isOpen,
  filters,
  onFilterChange,
  onClose,
  onReset,
}) => {
  const { user } = useAuth();

  if (!isOpen) return null;

  const handleChange = (key: keyof FilterState, value: any) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div
      className="business-modal-surface border-b p-4 transition-all duration-300 ease-in-out"
      style={{ borderColor: "var(--business-muted-line)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FunnelIcon
            className="w-5 h-5"
            style={{ color: "var(--color-primary)" }}
          />
          <h3
            className="font-medium"
            style={{ color: "var(--color-foreground)" }}
          >
            تصفية المحادثات
          </h3>
        </div>
        <button onClick={onClose} className="business-chip-button">
          <XMarkIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Unread Only */}
        <div className="flex items-center gap-2 mt-6">
          <input
            type="checkbox"
            id="unreadOnly"
            checked={filters.unreadOnly}
            onChange={(e) => handleChange("unreadOnly", e.target.checked)}
            className="rounded"
            style={{ accentColor: "var(--color-primary)" }}
          />
          <label
            htmlFor="unreadOnly"
            className="text-sm cursor-pointer select-none"
            style={{ color: "var(--color-foreground)" }}
          >
            غير مقروءة فقط
          </label>
        </div>

        {/* Assignment */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            تعيين لـ
          </label>
          <select
            value={filters.assignedTo}
            onChange={(e) => handleChange("assignedTo", e.target.value)}
            className="business-control-input"
          >
            <option value="all">الكل</option>
            <option value="me">محادثاتي ({user?.firstName})</option>
            <option value="unassigned">غير معين</option>
          </select>
        </div>

        {/* Date Range - Start */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            من تاريخ
          </label>
          <DatePicker
            selected={filters.startDate}
            onChange={(date: Date | null) => handleChange("startDate", date)}
            className="business-control-input"
            placeholderText="اختر تاريخ البداية"
            dateFormat="dd/MM/yyyy"
            isClearable
          />
        </div>

        {/* Date Range - End */}
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "var(--color-muted-foreground)" }}
          >
            إلى تاريخ
          </label>
          <DatePicker
            selected={filters.endDate}
            onChange={(date: Date | null) => handleChange("endDate", date)}
            className="business-control-input"
            placeholderText="اختر تاريخ النهاية"
            dateFormat="dd/MM/yyyy"
            minDate={filters.startDate || undefined}
            isClearable
          />
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex justify-end mt-4 pt-3 border-t"
        style={{ borderColor: "var(--business-muted-line)" }}
      >
        <button
          onClick={onReset}
          className="text-xs font-medium px-3 py-1"
          style={{ color: "var(--business-danger)" }}
        >
          إعادة تعيين الفلاتر
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;
