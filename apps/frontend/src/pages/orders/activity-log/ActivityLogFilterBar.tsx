import React from "react";
import { Search, X } from "lucide-react";

export interface ActorOption {
  id: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
}

interface ActivityLogFilterBarProps {
  orderNumber: string;
  setOrderNumber: (val: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onClearOrderSearch: () => void;
  selectedActorId: string;
  setSelectedActorId: (val: string) => void;
  actors: ActorOption[];
  changeType: string;
  setChangeType: (val: string) => void;
  datePreset: "ALL" | "TODAY" | "7DAYS" | "30DAYS";
  setDatePreset: (val: "ALL" | "TODAY" | "7DAYS" | "30DAYS") => void;
  isFilterActive: boolean;
  onResetFilters: () => void;
}

export const ActivityLogFilterBar: React.FC<ActivityLogFilterBarProps> = ({
  orderNumber,
  setOrderNumber,
  onSearchSubmit,
  onClearOrderSearch,
  selectedActorId,
  setSelectedActorId,
  actors,
  changeType,
  setChangeType,
  datePreset,
  setDatePreset,
  isFilterActive,
  onResetFilters,
}) => {
  return (
    <div className="border-b border-border/70 bg-card/30 px-4 sm:px-6 py-2.5 flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
      {/* Search Order Number */}
      <form onSubmit={onSearchSubmit} className="relative min-w-[180px] sm:min-w-[240px]">
        <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="ابحث برقم الطلب (مثال: ORD-450)..."
          className="w-full pl-7 pr-8 py-1.5 text-xs rounded-lg bg-background border border-border/70 placeholder:text-muted-foreground/70 focus:outline-hidden focus:ring-1 focus:ring-ring font-mono"
        />
        {orderNumber && (
          <button
            type="button"
            onClick={onClearOrderSearch}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </form>

      {/* Actor / Employee Selector */}
      <div className="min-w-[150px] sm:min-w-[180px]">
        <select
          value={selectedActorId}
          onChange={(e) => setSelectedActorId(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-background border border-border/70 text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
        >
          <option value="">جميع الموظفين والأنظمة ({actors.length})</option>
          {actors.map((actor) => (
            <option key={actor.id} value={actor.id}>
              {actor.name}
            </option>
          ))}
        </select>
      </div>

      {/* Change Type Filter */}
      <div className="min-w-[130px]">
        <select
          value={changeType}
          onChange={(e) => setChangeType(e.target.value)}
          className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-background border border-border/70 text-foreground focus:outline-hidden focus:ring-1 focus:ring-ring"
        >
          <option value="ALL">جميع أنواع الحركات</option>
          <option value="normal">تغيير حالة عادي</option>
          <option value="data_update">تعديل بيانات</option>
          <option value="bot_whatsapp">تأكيد بوت واتساب</option>
          <option value="bulk_update">تحديث جماعي</option>
          <option value="override">تجاوز بصلاحية</option>
          <option value="approved">اعتماد رسمي</option>
          <option value="cancelled">إلغاء طلب</option>
          <option value="return">حركات المرتجعات</option>
        </select>
      </div>

      {/* Date Preset Segmented Control */}
      <div className="inline-flex items-center p-0.5 rounded-lg bg-muted/60 border border-border/70 text-[11px] font-medium">
        <button
          type="button"
          onClick={() => setDatePreset("ALL")}
          className={`px-2 py-1 rounded-md transition-colors ${
            datePreset === "ALL"
              ? "bg-card text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          كل الأوقات
        </button>
        <button
          type="button"
          onClick={() => setDatePreset("TODAY")}
          className={`px-2 py-1 rounded-md transition-colors ${
            datePreset === "TODAY"
              ? "bg-card text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          اليوم
        </button>
        <button
          type="button"
          onClick={() => setDatePreset("7DAYS")}
          className={`px-2 py-1 rounded-md transition-colors ${
            datePreset === "7DAYS"
              ? "bg-card text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          7 أيام
        </button>
        <button
          type="button"
          onClick={() => setDatePreset("30DAYS")}
          className={`px-2 py-1 rounded-md transition-colors ${
            datePreset === "30DAYS"
              ? "bg-card text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          30 يوماً
        </button>
      </div>

      {/* Reset Filters */}
      {isFilterActive && (
        <button
          type="button"
          onClick={onResetFilters}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted border border-border/70 transition-colors"
        >
          <X className="w-3 h-3" />
          <span>إعادة ضبط</span>
        </button>
      )}
    </div>
  );
};
