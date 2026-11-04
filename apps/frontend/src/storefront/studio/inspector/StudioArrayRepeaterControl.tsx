import React, { useState } from "react";
import { PlusIcon, TrashIcon, ChevronUpIcon, ChevronDownIcon, PhotoIcon, LinkIcon } from "@heroicons/react/24/outline";

export interface StudioArrayRepeaterControlProps {
  label?: string;
  arrayKey: string;
  items: any[];
  onUpdateField: (field: string, value: any) => void;
  onOpenImagePicker?: (targetField?: string) => void;
}

export const StudioArrayRepeaterControl: React.FC<StudioArrayRepeaterControlProps> = ({
  label,
  arrayKey,
  items = [],
  onUpdateField,
  onOpenImagePicker,
}) => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const kl = arrayKey.toLowerCase();
  const isFaq = kl.includes("question") || kl.includes("faq");
  const isReview = kl.includes("review") || kl.includes("testimonial");
  const isFeature = kl.includes("feature");

  const displayLabel = label || (isFaq ? "الأسئلة الشائعة" : isReview ? "آراء العملاء" : isFeature ? "المزايا والمواصفات" : kl.includes("tab") ? "التبويبات" : "العناصر الفرعية");

  const handleAddItem = () => {
    let newItem: Record<string, any>;
    if (isFaq) newItem = { question: "سؤال جديد؟", answer: "الإجابة التوضيحية..." };
    else if (isReview) newItem = { name: "اسم العميل", rating: 5, comment: "تجربة ممتازة وخدمة سريعة!" };
    else if (isFeature) newItem = { title: "ميزة جديدة", description: "تفاصيل الميزة...", icon: "✨" };
    else newItem = { title: `عنصر جديد ${items.length + 1}`, description: "وصف توضيحي...", icon: "✨", url: "/shop" };
    const next = [...items, newItem];
    onUpdateField(arrayKey, next);
    setExpandedIdx(next.length - 1);
  };

  const handleDeleteItem = (index: number) => {
    const next = items.filter((_, idx) => idx !== index);
    onUpdateField(arrayKey, next);
    if (expandedIdx === index) setExpandedIdx(null);
    else if (expandedIdx !== null && expandedIdx > index) setExpandedIdx(expandedIdx - 1);
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onUpdateField(arrayKey, next);
    if (expandedIdx === index) setExpandedIdx(target);
    else if (expandedIdx === target) setExpandedIdx(index);
  };

  const handleUpdateItemProp = (index: number, prop: string, val: any) => {
    const next = items.map((it, idx) => (idx === index ? { ...it, [prop]: val } : it));
    onUpdateField(arrayKey, next);
  };

  return (
    <div className="space-y-2 pt-2.5 border-t border-[#ececee]" data-testid={`array-repeater-${arrayKey}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-[#6f747b]">{displayLabel} ({items.length})</span>
        <button
          type="button"
          data-testid={`btn-add-${arrayKey}`}
          onClick={handleAddItem}
          className="flex items-center gap-1 text-[10.5px] font-semibold text-[#2b6cf6] hover:underline"
        >
          <PlusIcon className="h-3 w-3" />
          <span>إضافة عنصر</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#ececee] p-2.5 text-center text-[10.5px] text-[#8a8f96]">
          لا توجد عناصر حالياً. اضغط &quot;إضافة عنصر&quot; للبدء.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-80 overflow-y-auto [scrollbar-width:thin]">
          {items.map((item, idx) => {
            const isExpanded = expandedIdx === idx;
            const titleProp = isFaq ? "question" : isReview ? "name" : "title";
            const summaryTitle = item[titleProp] || item.title || item.question || item.name || item.label || `عنصر ${idx + 1}`;
            const descProp = isFaq ? "answer" : isReview ? "comment" : item.subtitle !== undefined ? "subtitle" : "description";

            return (
              <div key={idx} data-testid={`repeater-item-${arrayKey}-${idx}`} className="rounded-lg border border-[#ececee] bg-[#f6f7f8] overflow-hidden">
                <div className="flex items-center justify-between p-2 gap-1.5 bg-[#f6f7f8] hover:bg-[#f0f1f3]">
                  <button
                    type="button"
                    data-testid={`btn-toggle-expand-${arrayKey}-${idx}`}
                    onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    className="flex flex-1 items-center gap-1.5 text-start overflow-hidden outline-none"
                  >
                    <span className="font-mono text-[9px] text-[#8a8f96]">#{idx + 1}</span>
                    <span className="truncate text-[11px] font-semibold text-[#17181c]">{summaryTitle}</span>
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button type="button" data-testid={`btn-move-up-${arrayKey}-${idx}`} onClick={() => handleMoveItem(idx, "up")} disabled={idx === 0} className="p-1 text-[#8a8f96] hover:text-[#17181c] disabled:opacity-30" title="تحريك لأعلى">
                      <ChevronUpIcon className="h-3 w-3" />
                    </button>
                    <button type="button" data-testid={`btn-move-down-${arrayKey}-${idx}`} onClick={() => handleMoveItem(idx, "down")} disabled={idx === items.length - 1} className="p-1 text-[#8a8f96] hover:text-[#17181c] disabled:opacity-30" title="تحريك لأسفل">
                      <ChevronDownIcon className="h-3 w-3" />
                    </button>
                    <button type="button" data-testid={`btn-delete-${arrayKey}-${idx}`} onClick={() => handleDeleteItem(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="حذف العنصر">
                      <TrashIcon className="h-3 w-3" />
                    </button>
                    <button type="button" data-testid={`btn-chevron-expand-${arrayKey}-${idx}`} onClick={() => setExpandedIdx(isExpanded ? null : idx)} className="p-1 text-[#8a8f96]">
                      <ChevronDownIcon className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-2.5 pt-1 space-y-2 border-t border-[#ececee] bg-white">
                    <div className="space-y-0.5">
                      <label className="block text-[9.5px] font-bold text-[#6f747b]">{isFaq ? "السؤال" : isReview ? "اسم العميل" : "العنوان الرئيسي"}</label>
                      <input
                        type="text"
                        data-testid={`input-${arrayKey}-${idx}-${titleProp}`}
                        value={item[titleProp] ?? item.title ?? ""}
                        onChange={(e) => handleUpdateItemProp(idx, titleProp, e.target.value)}
                        placeholder="أدخل النص..."
                        className="w-full rounded border border-[#ececee] bg-[#f6f7f8] px-2 py-1 text-[11px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <label className="block text-[9.5px] font-bold text-[#6f747b]">{isFaq ? "الإجابة" : isReview ? "التقييم / التعليق" : "الوصف التوضيحي"}</label>
                      <textarea
                        rows={2}
                        data-testid={`input-${arrayKey}-${idx}-${descProp}`}
                        value={item[descProp] ?? item.description ?? ""}
                        onChange={(e) => handleUpdateItemProp(idx, descProp, e.target.value)}
                        placeholder="أدخل التفاصيل..."
                        className="w-full rounded border border-[#ececee] bg-[#f6f7f8] px-2 py-1 text-[11px] text-[#17181c] outline-none focus:border-[#2b6cf6] focus:bg-white"
                      />
                    </div>
                    {(isReview || item.rating !== undefined) && (
                      <div className="space-y-0.5">
                        <label className="block text-[9.5px] font-bold text-[#6f747b]">التقييم (النجوم)</label>
                        <select
                          data-testid={`select-${arrayKey}-${idx}-rating`}
                          value={item.rating ?? 5}
                          onChange={(e) => handleUpdateItemProp(idx, "rating", Number(e.target.value))}
                          className="w-full rounded border border-[#ececee] bg-[#f6f7f8] px-2 py-1 text-[11px] outline-none"
                        >
                          {[5, 4, 3, 2, 1].map((s) => <option key={s} value={s}>{s} نجوم</option>)}
                        </select>
                      </div>
                    )}
                    {(isFeature || item.icon !== undefined) && (
                      <div className="space-y-0.5">
                        <label className="block text-[9.5px] font-bold text-[#6f747b]">الأيقونة أو الرمز</label>
                        <input
                          type="text"
                          data-testid={`input-${arrayKey}-${idx}-icon`}
                          value={item.icon ?? ""}
                          onChange={(e) => handleUpdateItemProp(idx, "icon", e.target.value)}
                          placeholder="✨ أو truck أو shield"
                          className="w-full rounded border border-[#ececee] bg-[#f6f7f8] px-2 py-1 text-[11px] outline-none"
                        />
                      </div>
                    )}
                    {(item.image !== undefined || item.photo !== undefined || !isFaq) && (
                      <div className="space-y-1">
                        <label className="block text-[9.5px] font-bold text-[#6f747b]">الصورة</label>
                        <div className="flex items-center gap-1.5">
                          {item.image || item.photo ? (
                            <img src={item.image || item.photo} alt="معاينة" className="h-8 w-10 shrink-0 rounded border border-[#ececee] object-cover" />
                          ) : (
                            <div className="flex h-8 w-10 shrink-0 items-center justify-center rounded border border-dashed border-[#ececee] bg-[#f6f7f8] text-[#8a8f96]">
                              <PhotoIcon className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => onOpenImagePicker?.(`${arrayKey}.${idx}.image`)}
                            className="flex flex-1 items-center justify-center gap-1 rounded border border-[#ececee] bg-[#f6f7f8] py-1 text-[10px] font-semibold text-[#17181c] hover:bg-[#ececee]"
                          >
                            <PhotoIcon className="h-3 w-3 text-[#2b6cf6]" />
                            <span>مكتبة الصور</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          dir="ltr"
                          data-testid={`input-${arrayKey}-${idx}-image`}
                          value={item.image || item.photo || ""}
                          onChange={(e) => handleUpdateItemProp(idx, "image", e.target.value)}
                          placeholder="رابط الصورة (URL)..."
                          className="w-full rounded border border-[#ececee] bg-[#f6f7f8] px-2 py-1 text-[10.5px] font-mono outline-none"
                        />
                      </div>
                    )}
                    {(item.url !== undefined || item.link !== undefined || (!isFaq && !isReview)) && (
                      <div className="space-y-0.5">
                        <label className="block text-[9.5px] font-bold text-[#6f747b]">رابط التحويل</label>
                        <div className="flex items-center rounded border border-[#ececee] bg-[#f6f7f8] px-2 text-[#8a8f96] focus-within:border-[#2b6cf6] focus-within:bg-white">
                          <LinkIcon className="h-3 w-3 shrink-0 me-1" />
                          <input
                            type="text"
                            dir="ltr"
                            data-testid={`input-${arrayKey}-${idx}-url`}
                            value={item.url ?? item.link ?? ""}
                            onChange={(e) => handleUpdateItemProp(idx, "url", e.target.value)}
                            placeholder="/shop"
                            className="w-full bg-transparent py-1 text-[10.5px] font-mono outline-none text-[#17181c]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
