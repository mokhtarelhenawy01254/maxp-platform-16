import React from "react";
import { Search, X, ChevronDown } from "lucide-react";

export interface ActorOption {
  id: string;
  name: string;
  email?: string | null;
  avatar?: string | null;
}

export interface ActivityLogFilterBarProps {
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
    <div className="border-b border-border/70 bg-card/40 px-3 sm:px-6 py-2.5 flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
      {/* Search Order Number */}
      <form onSubmit={onSearchSubmit} className="relative min-w-[180px] sm:min-w-[240px]">
        <Search className="w-3.5 h-3.5 pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="ابحث برقم الطلب (مثال: ORD-450)..."
          className="w-full pe-8 ps-8 py-1.5 text-xs rounded-xl bg-background border border-border/70 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono tabular-nums text-start transition-all"
        />
        {orderNumber && (
          <button
            type="button"
            onClick={onClearOrderSearch}
            className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-all"
            aria-label="مسح البحث"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </form>

      {/* Actor / Employee Selector */}
      <div className="relative min-w-[150px] sm:min-w-[180px]">
        <select
          aria-label="الموظف أو النظام"
          value={selectedActorId}
          onChange={(e) => setSelectedActorId(e.target.value)}
          className="w-full appearance-none pe-8 ps-2.5 py-1.5 text-xs rounded-xl bg-background border border-border/70 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer font-medium"
        >
          <option value="">جميع الموظفين والأنظمة ({actors.length})</option>
          {actors.map((actor) => (
            <option key={actor.id} value={actor.id}>
              {actor.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>

      {/* Change Type Filter */}
      <div className="relative min-w-[130px]">
        <select
          aria-label="نوع الحركة"
          value={changeType}
          onChange={(e) => setChangeType(e.target.value)}
          className="w-full appearance-none pe-8 ps-2.5 py-1.5 text-xs rounded-xl bg-background border border-border/70 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer font-medium"
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
        <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>

      {/* Date Preset Segmented Control */}
      <div className="inline-flex items-center p-0.5 rounded-xl bg-muted/60 border border-border/70 text-[11px] font-medium">
        <button
          type="button"
          onClick={() => setDatePreset("ALL")}
          className={`px-2.5 py-1 rounded-lg transition-colors ${
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
          className={`px-2.5 py-1 rounded-lg transition-colors ${
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
          className={`px-2.5 py-1 rounded-lg transition-colors ${
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
          className={`px-2.5 py-1 rounded-lg transition-colors ${
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
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-destructive hover:bg-destructive/10 px-2.5 py-1 rounded-lg border border-border/70 transition-colors cursor-pointer"
        >
          <X className="w-3 h-3" />
          <span>إعادة ضبط</span>
        </button>
      )}
    </div>
  );
};

export default ActivityLogFilterBar;
