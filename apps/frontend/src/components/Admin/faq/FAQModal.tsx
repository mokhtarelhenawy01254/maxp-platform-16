import { useState, useEffect, type FormEvent } from "react";
import { X, Tag, Plus, Check } from "lucide-react";

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags?: string[];
  order?: number;
  helpful?: number;
  notHelpful?: number;
  isActive: boolean;
  createdAt?: string;
}

interface FAQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    question: string;
    answer: string;
    category: string;
    tags: string[];
    isActive: boolean;
  }) => Promise<void>;
  editingFaq: FAQItem | null;
  existingCategories: string[];
  isSaving: boolean;
}

export default function FAQModal({
  isOpen,
  onClose,
  onSave,
  editingFaq,
  existingCategories,
  isSaving,
}: FAQModalProps) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [category, setCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Suggested channels tags
  const standardChannels = [
    { id: "ai_bot", label: "بوت الذكاء الاصطناعي (WhatsApp/Chat)" },
    { id: "website", label: "الموقع والمتجر الإلكتروني" },
    { id: "quick_reply", label: "ردود موظفي خدمة العملاء" },
  ];

  useEffect(() => {
    if (editingFaq) {
      setQuestion(editingFaq.question || "");
      setAnswer(editingFaq.answer || "");
      setCategory(editingFaq.category || "عام");
      setTags(Array.isArray(editingFaq.tags) ? editingFaq.tags : []);
      setIsActive(editingFaq.isActive ?? true);
      setIsCustomCategory(!existingCategories.includes(editingFaq.category));
      setCustomCategoryInput(existingCategories.includes(editingFaq.category) ? "" : editingFaq.category);
    } else {
      setQuestion("");
      setAnswer("");
      setCategory(existingCategories[0] || "عام");
      setTags([]);
      setIsActive(true);
      setIsCustomCategory(false);
      setCustomCategoryInput("");
    }
    setTagInput("");
  }, [editingFaq, isOpen, existingCategories]);

  if (!isOpen) return null;

  const handleAddTag = () => {
    const trimmed = tagInput.trim().replace(/^#/, "");
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const toggleChannelTag = (channelLabel: string) => {
    if (tags.includes(channelLabel)) {
      setTags(tags.filter((t) => t !== channelLabel));
    } else {
      setTags([...tags, channelLabel]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const finalCategory = isCustomCategory ? customCategoryInput.trim() : category.trim();
    if (!question.trim() || !answer.trim()) return;

    await onSave({
      question: question.trim(),
      answer: answer.trim(),
      category: finalCategory || "عام",
      tags,
      isActive,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-2xs p-3 sm:p-4"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-border/70 flex items-center justify-between bg-muted/20">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              {editingFaq ? "تعديل السؤال الشائع" : "إضافة سؤال شائع جديد"}
            </h2>
            <p className="text-[11px] text-muted-foreground">
              سيتم فهرسة السؤال تلقائياً واستخدامه في ردود الذكاء الاصطناعي وصفحات الدعم
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
            aria-label="إغلاق النافذة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Question */}
          <div>
            <label className="block font-semibold text-foreground mb-1">
              صيغة السؤال الأساسي <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="مثال: ما هي مواعيد تسليم الحالات؟ أو ما هي شروط الضمان؟"
              className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Answer */}
          <div>
            <label className="block font-semibold text-foreground mb-1">
              الإجابة المعتمدة <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="اكتب الإجابة النموذجية والمعتمدة بدقة ووضوح..."
              className="w-full bg-background border border-border/80 rounded-xl p-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-foreground">التصنيف</label>
              <button
                type="button"
                onClick={() => setIsCustomCategory(!isCustomCategory)}
                className="text-[11px] text-primary hover:underline cursor-pointer"
              >
                {isCustomCategory ? "اختيار من التصنيفات السابقة" : "+ كتابة تصنيف جديد"}
              </button>
            </div>

            {isCustomCategory ? (
              <input
                value={customCategoryInput}
                onChange={(e) => setCustomCategoryInput(e.target.value)}
                placeholder="اكتب اسم التصنيف الجديد (مثال: التركيبات، المواعيد، الفواتير...)"
                className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ) : (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-background border border-border/80 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {existingCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Channel Scope */}
          <div className="space-y-1.5 pt-1">
            <label className="font-semibold text-foreground block">قنوات التفعيل المستهدفة</label>
            <div className="flex flex-wrap gap-1.5">
              {standardChannels.map((ch) => {
                const isSelected = tags.includes(ch.label);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleChannelTag(ch.label)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] border transition cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-primary/10 text-primary border-primary/30 font-medium"
                        : "bg-muted/30 text-muted-foreground border-border/60 hover:bg-muted"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    {ch.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Synonyms & Tags */}
          <div className="space-y-2 pt-1">
            <label className="font-semibold text-foreground flex items-center justify-between">
              <span>المرادفات والكلمات المفتاحية للـ AI (Synonyms / Tags)</span>
              <span className="text-[10px] text-muted-foreground font-normal">تزيد دقة ردود الذكاء الاصطناعي</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="أضف صيغة بديلة أو كلمة مفتاحية واضغط Enter..."
                className="flex-1 bg-background border border-border/80 rounded-xl px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 rounded-xl border border-border/80 text-foreground hover:bg-muted transition cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                إضافة
              </button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-muted/60 text-foreground border border-border/70"
                  >
                    <Tag className="w-3 h-3 text-muted-foreground" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-muted-foreground hover:text-rose-500 mr-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Status Toggle */}
          <div className="pt-2 border-t border-border/60 flex items-center justify-between">
            <div>
              <div className="font-semibold text-foreground">حالة التفعيل</div>
              <p className="text-[11px] text-muted-foreground">عند التعطيل، لن يتم استخدامه في الردود أو العرض</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition cursor-pointer ${
                isActive
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                  : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {isActive ? "نشط ومفعل" : "معطل مؤقتاً"}
            </button>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-2 text-xs rounded-xl border border-border/80 text-foreground hover:bg-muted transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving || !question.trim() || !answer.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? "جاري الحفظ..." : editingFaq ? "حفظ التعديلات" : "إضافة السؤال"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
