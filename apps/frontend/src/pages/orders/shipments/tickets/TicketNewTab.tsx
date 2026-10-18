import React from "react";
import { Send, Image, ChevronDown } from "lucide-react";
import type { TicketCategory } from "./ticketTypes";

export interface TicketNewTabProps {
  code: string;
  setCode: (val: string) => void;
  categories: TicketCategory[];
  selectedCategoryId: string | number;
  setSelectedCategoryId: (val: string | number) => void;
  loadingCategories: boolean;
  priority: "low" | "medium" | "high";
  setPriority: (val: "low" | "medium" | "high") => void;
  content: string;
  setContent: (val: string) => void;
  imageFile: File | null;
  setImageFile: (val: File | null) => void;
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const TicketNewTab: React.FC<TicketNewTabProps> = ({
  code,
  setCode,
  categories,
  selectedCategoryId,
  setSelectedCategoryId,
  loadingCategories,
  priority,
  setPriority,
  content,
  setContent,
  imageFile,
  setImageFile,
  submitting,
  onSubmit,
  onClose,
}) => {
  return (
    <form onSubmit={onSubmit} className="p-4 space-y-3.5">
      {/* Reference Code */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">
          كود الشحنة أو رقم الطلب المرجعي
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="مثال: ORD-920609-745 أو رقم بوليصة الشحن..."
          className="w-full h-10 px-3 text-xs rounded-xl border border-border/70 bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono tabular-nums outline-none transition-all"
        />
      </div>

      {/* Category & Priority Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Category */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            نوع المشكلة أو الاستفسار *
          </label>
          <div className="relative">
            <select
              aria-label="نوع المشكلة أو الاستفسار"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              disabled={loadingCategories}
              className="w-full h-10 appearance-none pe-8 ps-3 text-xs rounded-xl border border-border/70 bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name || cat.nameEn}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>

        {/* Priority */}
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">
            درجة الأولوية
          </label>
          <div className="relative">
            <select
              aria-label="درجة الأولوية"
              value={priority}
              onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
              className="w-full h-10 appearance-none pe-8 ps-3 text-xs rounded-xl border border-border/70 bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all cursor-pointer"
            >
              <option value="medium">عادية / متوسطة</option>
              <option value="low">منخفضة</option>
              <option value="high">عاجلة / قصوى</option>
            </select>
            <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Ticket Details */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">
          تفاصيل التذكرة والملاحظات *
        </label>
        <textarea
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="اكتب تفاصيل استفسارك أو مشكلتك لمتابعتها مع خدمة عملاء الشحن..."
          className="w-full text-xs rounded-xl border border-border/70 bg-background p-3 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none transition-all"
        />
      </div>

      {/* Attachment */}
      <div>
        <label className="block text-xs font-semibold text-foreground mb-1">
          مرفق (صورة إيصال أو بوليصة أو المنتج - اختياري)
        </label>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-2 border border-dashed border-border/70 hover:border-primary rounded-xl text-xs cursor-pointer text-muted-foreground hover:text-primary transition bg-background">
            <Image className="h-4 w-4" />
            <span className="truncate max-w-[200px]">
              {imageFile ? imageFile.name : "اختر صورة للمرفق"}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setImageFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />
          </label>
          {imageFile && (
            <button
              type="button"
              onClick={() => setImageFile(null)}
              className="text-xs text-destructive hover:underline cursor-pointer"
            >
              إلغاء المرفق
            </button>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl text-xs font-medium text-foreground hover:bg-muted active:scale-95 transition cursor-pointer"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition disabled:opacity-50 active:scale-95 shadow-xs cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
          <span>{submitting ? "جاري الإرسال..." : "إرسال التذكرة"}</span>
        </button>
      </div>
    </form>
  );
};

export default TicketNewTab;
