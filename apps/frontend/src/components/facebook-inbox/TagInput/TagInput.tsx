import React, { useState } from "react";
import { XMarkIcon, PlusIcon } from "@heroicons/react/24/outline";

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
    tone: "primary",
  },
  {
    name: "أخضر",
    value: "green",
    tone: "success",
  },
  {
    name: "أحمر",
    value: "red",
    tone: "danger",
  },
  {
    name: "أصفر",
    value: "yellow",
    tone: "warning",
  },
  {
    name: "بنفسجي",
    value: "purple",
    tone: "secondary",
  },
  {
    name: "وردي",
    value: "pink",
    tone: "secondary",
  },
  {
    name: "برتقالي",
    value: "orange",
    tone: "warning",
  },
  {
    name: "رمادي",
    value: "gray",
    tone: "neutral",
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
  currentTags,
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

  const getToneStyle = (
    tone: (typeof TAG_COLORS)[number]["tone"],
  ): React.CSSProperties => {
    if (tone === "success") {
      return {
        background: "color-mix(in srgb, var(--business-success) 14%, transparent)",
        borderColor:
          "color-mix(in srgb, var(--business-success) 28%, transparent)",
        color: "var(--business-success)",
      };
    }

    if (tone === "danger") {
      return {
        background: "color-mix(in srgb, var(--business-danger) 14%, transparent)",
        borderColor:
          "color-mix(in srgb, var(--business-danger) 28%, transparent)",
        color: "var(--business-danger)",
      };
    }

    if (tone === "warning") {
      return {
        background: "color-mix(in srgb, var(--business-warning) 14%, transparent)",
        borderColor:
          "color-mix(in srgb, var(--business-warning) 28%, transparent)",
        color: "var(--business-warning)",
      };
    }

    if (tone === "secondary") {
      return {
        background: "color-mix(in srgb, var(--color-secondary) 14%, transparent)",
        borderColor:
          "color-mix(in srgb, var(--color-secondary) 28%, transparent)",
        color: "var(--color-secondary)",
      };
    }

    if (tone === "neutral") {
      return {
        background: "var(--shell-control-bg)",
        borderColor: "var(--shell-control-border)",
        color: "var(--color-foreground)",
      };
    }

    return {
      background: "color-mix(in srgb, var(--color-primary) 14%, transparent)",
      borderColor: "color-mix(in srgb, var(--color-primary) 28%, transparent)",
      color: "var(--color-primary)",
    };
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
    <div className="space-y-2">
      {/* Current Tags */}
      <div className="flex flex-wrap gap-2">
        {currentTags.map((tagId) => {
          const colorTheme = getColorTheme(getTagColor(tagId));
          return (
            <span
              key={tagId}
              className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium"
              style={getToneStyle(colorTheme.tone)}
            >
              {getTagLabel(tagId)}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tagId)}
                  className="transition-opacity hover:opacity-70"
                >
                  <XMarkIcon className="w-3 h-3" />
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
            className="business-chip-button px-2.5 py-1 text-xs font-medium"
          >
            <PlusIcon className="w-3 h-3" />
            إضافة
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="relative">
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setShowDropdown(false);
              setShowCustomForm(false);
            }}
          />
          <div className="business-dropdown-surface absolute left-0 z-20 mt-1 max-h-80 w-64 overflow-y-auto p-2">
            {!showCustomForm ? (
              <div>
                <p
                  className="px-2 py-1 text-xs"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  اختر من القائمة:
                </p>
                <div className="space-y-1">
                  {PREDEFINED_TAGS.map((tag) => {
                    const colorTheme = getColorTheme(tag.color);
                    const isActive = currentTags.includes(tag.id);
                    return (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => handleAddPredefinedTag(tag.id)}
                        disabled={isActive}
                        className="business-dropdown-option justify-between"
                        data-disabled={isActive}
                      >
                        <span
                          className="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium"
                          style={getToneStyle(colorTheme.tone)}
                        >
                          {tag.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div
                  className="mt-2 border-t pt-2"
                  style={{ borderColor: "var(--business-muted-line)" }}
                >
                  <button
                    type="button"
                    onClick={() => setShowCustomForm(true)}
                    className="business-dropdown-option justify-center text-sm font-semibold"
                    style={{ color: "var(--color-primary)" }}
                  >
                    + إنشاء تصنيف جديد
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-1">
                <p
                  className="mb-2 text-xs"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  تصنيف مخصص:
                </p>
                <input
                  type="text"
                  value={customTagName}
                  onChange={(e) => setCustomTagName(e.target.value)}
                  placeholder="اسم التصنيف"
                  className="business-control-input mb-2 w-full px-3 py-2 text-sm"
                  autoFocus
                />

                <div className="flex flex-wrap gap-1 mb-3">
                  {TAG_COLORS.map((color) => (
                    <button
                      type="button"
                      key={color.value}
                      onClick={() => setSelectedColor(color.value)}
                      className="h-6 w-6 rounded-full border-2 transition-transform hover:scale-105"
                      style={{
                        ...getToneStyle(color.tone),
                        borderColor:
                          selectedColor === color.value
                            ? "var(--color-foreground)"
                            : "transparent",
                      }}
                      title={color.name}
                    />
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleAddCustomTag}
                    className="business-chip-button flex-1 px-3 py-1.5 text-sm"
                    data-active="true"
                  >
                    إضافة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomForm(false);
                      setCustomTagName("");
                    }}
                    className="business-chip-button px-3 py-1.5 text-sm"
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
