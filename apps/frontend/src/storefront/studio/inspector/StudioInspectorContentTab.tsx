import React from "react";
import { PhotoIcon, LinkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

interface StudioInspectorContentTabProps {
  sectionType: string;
  settings: Record<string, any>;
  onUpdateField: (field: string, value: any) => void;
  onOpenImagePicker?: () => void;
}

export const StudioInspectorContentTab: React.FC<StudioInspectorContentTabProps> = ({
  sectionType,
  settings,
  onUpdateField,
  onOpenImagePicker,
}) => {
  const title = settings.title ?? settings.heading ?? "";
  const subtitle = settings.subtitle ?? settings.description ?? settings.subheading ?? "";
  const eyebrow = settings.eyebrow ?? settings.badge ?? settings.tagline ?? "";
  const ctaText = settings.ctaText ?? settings.primaryButtonText ?? settings.buttonText ?? "";
  const ctaLink = settings.ctaLink ?? settings.primaryButtonUrl ?? settings.buttonUrl ?? "";
  const currentImage = settings.image ?? settings.backgroundImage ?? settings.heroImage ?? "";

  const itemsKey = Array.isArray(settings.features)
    ? "features"
    : Array.isArray(settings.questions)
    ? "questions"
    : Array.isArray(settings.reviews)
    ? "reviews"
    : Array.isArray(settings.items)
    ? "items"
    : "items";

  const items: any[] = Array.isArray(settings[itemsKey]) ? settings[itemsKey] : [];

  const handleUpdateItem = (index: number, field: string, val: any) => {
    const next = [...items];
    next[index] = { ...(next[index] || {}), [field]: val };
    onUpdateField(itemsKey, next);
  };

  const handleAddItem = () => {
    const newItem = {
      title: "عنصر جديد",
      subtitle: "وصف توضيحي...",
      icon: "✨",
      question: "سؤال جديد؟",
      answer: "الإجابة التوضيحية...",
      name: "اسم العميل",
      rating: 5,
      comment: "تجربة رائعة!",
    };
    const next = [...items, newItem];
    onUpdateField(itemsKey, next);
  };

  const handleDeleteItem = (index: number) => {
    const next = items.filter((_, idx) => idx !== index);
    onUpdateField(itemsKey, next);
  };

  return (
    <div className="space-y-3 select-none text-[11.5px] text-[#17181c]">
      {/* 1. Main Heading */}
      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-[#6f747b]">العنوان الرئيسي</label>
        <input
          type="text"
          value={title}
          onChange={(e) => {
            onUpdateField("title", e.target.value);
            onUpdateField("heading", e.target.value);
          }}
          placeholder="أدخل عنوان القسم…"
          className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
        />
      </div>

      {/* 2. Subtitle / Description */}
      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-[#6f747b]">الوصف التوضيحي</label>
        <textarea
          rows={2}
          value={subtitle}
          onChange={(e) => {
            onUpdateField("subtitle", e.target.value);
            onUpdateField("description", e.target.value);
          }}
          placeholder="أدخل تفاصيل ومحتوى إضافي…"
          className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
        />
      </div>

      {/* 3. Eyebrow Badge */}
      <div className="space-y-1">
        <label className="block text-[10px] font-bold text-[#6f747b]">الشارة العلوية (Badge)</label>
        <input
          type="text"
          value={eyebrow}
          onChange={(e) => {
            onUpdateField("eyebrow", e.target.value);
            onUpdateField("badge", e.target.value);
          }}
          placeholder="مثال: خصم حصري • وصل حديثاً"
          className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2.5 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
        />
      </div>

      {/* 4. Action Button (CTA) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-[#6f747b]">نص الزر</label>
          <input
            type="text"
            value={ctaText}
            onChange={(e) => onUpdateField("ctaText", e.target.value)}
            placeholder="تسوق الآن"
            className="w-full rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2 py-1.5 text-[11.5px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] font-bold text-[#6f747b]">رابط الزر</label>
          <div className="flex items-center rounded-lg border border-[#ececee] bg-[#f6f7f8] px-2 text-[#8a8f96] focus-within:border-[#2b6cf6] focus-within:bg-white">
            <LinkIcon className="h-3.5 w-3.5 shrink-0 me-1" />
            <input
              type="text"
              dir="ltr"
              value={ctaLink}
              onChange={(e) => onUpdateField("ctaLink", e.target.value)}
              placeholder="/shop"
              className="w-full bg-transparent py-1.5 text-[11.5px] text-[#17181c] outline-none font-mono"
            />
          </div>
        </div>
      </div>

      {/* 5. Image Selector */}
      <div className="space-y-1.5 pt-1">
        <label className="block text-[10px] font-bold text-[#6f747b]">الصورة أو الخلفية</label>
        <div className="flex items-center gap-2">
          {currentImage ? (
            <img
              src={currentImage}
              alt="معاينة"
              className="h-10 w-14 shrink-0 rounded-md border border-[#ececee] object-cover"
            />
          ) : (
            <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-[#ececee] bg-[#f6f7f8] text-[#8a8f96]">
              <PhotoIcon className="h-4 w-4" />
            </div>
          )}
          <button
            type="button"
            onClick={onOpenImagePicker}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#ececee] bg-[#f6f7f8] py-2 text-[11px] font-semibold text-[#17181c] hover:bg-[#ececee] transition-colors"
          >
            <PhotoIcon className="h-3.5 w-3.5 text-[#2b6cf6]" />
            <span>اختيار من مكتبة الصور</span>
          </button>
        </div>
      </div>

      {/* 6. Repeatable Sub-Items (Features, FAQ, Reviews) */}
      {items.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#ececee]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#6f747b]">
              العناصر الفرعية ({items.length})
            </span>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 text-[10.5px] font-semibold text-[#2b6cf6] hover:underline"
            >
              <PlusIcon className="h-3 w-3" />
              <span>إضافة عنصر</span>
            </button>
          </div>

          <div className="space-y-1.5 max-h-36 overflow-y-auto [scrollbar-width:thin]">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-[#ececee] bg-[#f6f7f8] p-2"
              >
                <input
                  type="text"
                  value={item.title || item.question || item.name || `عنصر ${idx + 1}`}
                  onChange={(e) => handleUpdateItem(idx, "title", e.target.value)}
                  className="w-full bg-transparent text-[11px] font-medium text-[#17181c] outline-none"
                />
                <button
                  type="button"
                  onClick={() => handleDeleteItem(idx)}
                  className="rounded p-1 text-red-500 hover:bg-red-50"
                  title="حذف العنصر"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
