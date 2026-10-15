import React, { useState } from "react";
import { X, Plus, Tag as TagIcon, Check } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagInputProps {
  conversationId: string;
  currentTags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
}

const TAG_COLORS = [
  {
    name: "أزرق",
    value: "blue",
    badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    dotClass: "bg-sky-500",
  },
  {
    name: "أخضر",
    value: "green",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    dotClass: "bg-emerald-500",
  },
  {
    name: "أحمر",
    value: "red",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    dotClass: "bg-rose-500",
  },
  {
    name: "أصفر",
    value: "yellow",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    dotClass: "bg-amber-500",
  },
  {
    name: "بنفسجي",
    value: "purple",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    dotClass: "bg-purple-500",
  },
  {
    name: "وردي",
    value: "pink",
    badgeClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
    dotClass: "bg-pink-500",
  },
  {
    name: "برتقالي",
    value: "orange",
    badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    dotClass: "bg-orange-500",
  },
  {
    name: "رمادي",
    value: "gray",
    badgeClass: "bg-muted text-muted-foreground border-border/60",
    dotClass: "bg-zinc-400",
  },
] as const;

// Predefined tags
const PREDEFINED_TAGS: Tag[] = [
  { id: "vip", name: "VIP", color: "purple" },
  { id: "urgent", name: "عاجل", color: "red" },
  { id: "follow-up", name: "متابعة", color: "yellow" },
  { id: "resolved", name: "محلول", color: "green" },
  { id: "complaint", name: "شكوى", color: "orange" },
  { id: "question", name: "استفسار", color: "blue" },
  { id: "order", name: "طلب", color: "pink" },
  { id: "technical", name: "تقني", color: "gray" },
];

const TagInput: React.FC<TagInputProps> = ({
  currentTags = [],
  onTagsChange,
  disabled = false,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [customTagName, setCustomTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");
  const [showCustomForm, setShowCustomForm] = useState(false);

  const getColorTheme = (color: string) => {
    const colorObj = TAG_COLORS.find((c) => c.value === color);
    return colorObj || TAG_COLORS[0]!;
  };

  const handleAddPredefinedTag = (tagId: string) => {
    if (!currentTags.includes(tagId)) {
      onTagsChange([...currentTags, tagId]);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(currentTags.filter((t) => t !== tagId));
  };

  const handleAddCustomTag = () => {
    if (customTagName.trim()) {
      const customTagId = `custom_${selectedColor}_${customTagName
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")}`;
      if (!currentTags.includes(customTagId)) {
        onTagsChange([...currentTags, customTagId]);
      }
      setCustomTagName("");
      setShowCustomForm(false);
      setShowDropdown(false);
    }
  };

  const getTagLabel = (tagId: string) => {
    const predefined = PREDEFINED_TAGS.find((t) => t.id === tagId);
    if (predefined) return predefined.name;

    if (tagId.startsWith("custom_")) {
      const [firstPart, ...nameParts] = tagId.replace("custom_", "").split("_");
      const hasColorPrefix = TAG_COLORS.some(
        (color) => color.value === firstPart,
      );

      if (hasColorPrefix) {
        return nameParts.join(" ").trim();
      }

      return [firstPart, ...nameParts].join(" ").trim();
    }
    return tagId;
  };

  const getTagColor = (tagId: string) => {
    const predefined = PREDEFINED_TAGS.find((t) => t.id === tagId);
    if (predefined) return predefined.color;

    if (tagId.startsWith("custom_")) {
      const colorCandidate = tagId.replace("custom_", "").split("_")[0];
      const matchedColor = TAG_COLORS.find(
        (color) => color.value === colorCandidate,
      );

      if (matchedColor) {
        return matchedColor.value;
      }
    }

    return selectedColor;
  };

  return (
    <div className="space-y-1.5" dir="rtl">
      {/* Current Tags */}
      <div className="flex flex-wrap items-center gap-1.5">
        {currentTags.map((tagId) => {
          const colorTheme = getColorTheme(getTagColor(tagId));
          return (
            <span
              key={tagId}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${colorTheme.badgeClass}`}
            >
              <span>{getTagLabel(tagId)}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tagId)}
                  className="hover:opacity-75 transition-opacity p-0.5"
                  aria-label={`حذف ${getTagLabel(tagId)}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          );
        })}

        {/* Add Tag Button */}
        {!disabled && (
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-border/80 px-2 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>إضافة وسم</span>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="relative">
          <div
            className="fixed inset-0 z-20"
            onClick={() => {
              setShowDropdown(false);
              setShowCustomForm(false);
            }}
          />
          <div className="absolute right-0 top-full mt-1.5 z-30 max-h-72 w-60 overflow-y-auto rounded-xl border border-border/70 bg-card p-2 shadow-xl text-card-foreground animate-in fade-in duration-100">
            {!showCustomForm ? (
              <div className="space-y-2">
                <p className="px-1 text-[11px] font-medium text-muted-foreground">
                  اختر من الوسوم المتاحة:
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {PREDEFINED_TAGS.map((tag) => {
                    const colorTheme = getColorTheme(tag.color);
                    const isActive = currentTags.includes(tag.id);
                    return (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => handleAddPredefinedTag(tag.id)}
                        disabled={isActive}
                        className={`flex items-center justify-between px-2 py-1 rounded-lg border text-xs font-medium transition-colors ${
                          isActive
                            ? "opacity-40 cursor-not-allowed border-border/40 bg-muted/20"
                            : "hover:bg-muted/50 cursor-pointer border-border/60"
                        } ${colorTheme.badgeClass}`}
                      >
                        <span className="truncate">{tag.name}</span>
                        {isActive && <Check className="w-3 h-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-border/50">
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(true)}
                    className="w-full py-1 text-xs font-medium text-primary hover:underline text-center"
                  >
                    + إنشاء وسم مخصص
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-1 space-y-2.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  وسم مخصص جديد:
                </p>
                <input
                  type="text"
                  value={customTagName}
                  onChange={(e) => setCustomTagName(e.target.value)}
                  placeholder="اسم الوسم"
                  className="w-full px-2.5 py-1.5 text-xs bg-background border border-border/70 rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  autoFocus
                />

                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {TAG_COLORS.map((color) => (
                    <button
                      type="button"
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${
                        color.dotClass
                      } ${
                        selectedColor === color.value
                          ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : ""
                      }`}
                      title={color.name}
                      aria-label={color.name}
                    />
                  ))}
                </div>

                <div className="flex gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    disabled={!customTagName.trim()}
                    className="flex-1 py-1 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 rounded-lg transition-colors"
                  >
                    إضافة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomForm(false);
                      setCustomTagName("");
                    }}
                    className="px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground border border-border/60 rounded-lg hover:bg-muted/40 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagInput;
