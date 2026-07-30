import { X as XMarkIcon, Plus as PlusIcon, Circle as SwatchIcon } from 'lucide-react';
import React from "react";
import { ProductAttribute } from "../../types";
;

interface AttributesTabProps {
  attributeMode: "templates" | "custom";
  setAttributeMode: React.Dispatch<React.SetStateAction<"templates" | "custom">>;
  attributes: ProductAttribute[];
  setAttributes: React.Dispatch<React.SetStateAction<ProductAttribute[]>>;
  newAttributeName: string;
  setNewAttributeName: React.Dispatch<React.SetStateAction<string>>;
  newAttributeValuesList: string[];
  updateValueField: (index: number, value: string) => void;
  removeValueField: (index: number) => void;
  addValueField: () => void;
  addAttribute: () => void;
  removeAttribute: (id: string) => void;
  generateVariations: () => void;
  setActiveTab: (tab: string) => void;
  t: any;
}

export const AttributesTab: React.FC<AttributesTabProps> = ({
  attributeMode,
  setAttributeMode,
  attributes,
  setAttributes,
  newAttributeName,
  setNewAttributeName,
  newAttributeValuesList,
  updateValueField,
  removeValueField,
  addValueField,
  addAttribute,
  removeAttribute,
  generateVariations,
  setActiveTab,
  t,
}) => {
  const [editingAttrId, setEditingAttrId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editValues, setEditValues] = React.useState<string[]>([]);

  const handleValueKeyPress = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addValueField();
      // Use setTimeout to focus the next input after it renders
      setTimeout(() => {
        const inputs = document.querySelectorAll(".attribute-value-input");
        const nextInput = inputs[index + 1] as HTMLInputElement;
        if (nextInput) nextInput.focus();
      }, 0);
    }
  };

  const beginEdit = (attr: ProductAttribute) => {
    setEditingAttrId(attr.id);
    setEditName(attr.name);
    setEditValues(attr.values);
  };

  const cancelEdit = () => {
    setEditingAttrId(null);
    setEditName("");
    setEditValues([]);
  };

  const saveEdit = () => {
    const cleanedValues = editValues.map((v) => v.trim()).filter(Boolean);
    if (!editName.trim() || cleanedValues.length === 0) {
      return;
    }
    setAttributes((prev) =>
      prev.map((a) =>
        a.id === editingAttrId ? { ...a, name: editName.trim(), values: cleanedValues } : a
      )
    );
    cancelEdit();
  };

  const updateEditValue = (idx: number, value: string) => {
    setEditValues((prev) => prev.map((v, i) => (i === idx ? value : v)));
  };

  const addEditValue = () => setEditValues((prev) => [...prev, ""]);

  const removeEditValue = (idx: number) =>
    setEditValues((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t("products.attributes.title")}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t("products.attributes.description")}
          </p>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => setAttributeMode("templates")}
          className={`flex-1 p-4 rounded-lg border-2 transition-all ${
            attributeMode === "templates"
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-400"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div className="text-2xl mb-2">📦</div>
          <h4 className="font-medium text-gray-900 dark:text-white">
            {t("products.attributes.templates")}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t("products.attributes.templatesDesc")}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setAttributeMode("custom")}
          className={`flex-1 p-4 rounded-lg border-2 transition-all ${
            attributeMode === "custom"
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 dark:border-indigo-400"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
          }`}
        >
          <div className="text-2xl mb-2">✏️</div>
          <h4 className="font-medium text-gray-900 dark:text-white">
            {t("products.attributes.custom")}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {t("products.attributes.customDesc")}
          </p>
        </button>
      </div>

      {/* Templates Mode */}
      {attributeMode === "templates" && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">
            {t("products.attributes.selectFromTemplates")}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                icon: "🎨",
                name: t("products.attributes.templateColor"),
                slug: "color",
                values: ["أسود", "أبيض", "أحمر", "أزرق", "أخضر"],
              },
              {
                icon: "📏",
                name: t("products.attributes.templateSize"),
                slug: "size",
                values: ["S", "M", "L", "XL", "XXL"],
              },
              {
                icon: "👟",
                name: t("products.attributes.templateShoeSize"),
                slug: "shoe_size",
                values: ["38", "39", "40", "41", "42", "43", "44"],
              },
              {
                icon: "🧵",
                name: t("products.attributes.templateMaterial"),
                slug: "material",
                values: ["قطن", "بوليستر", "جلد", "كتان"],
              },
              {
                icon: "💍",
                name: t("products.attributes.templateMetalColor"),
                slug: "metal_color",
                values: ["ذهبي", "فضي", "روز جولد", "أسود"],
              },
              {
                icon: "💾",
                name: t("products.attributes.templateCapacity"),
                slug: "capacity",
                values: ["64GB", "128GB", "256GB", "512GB"],
              },
              {
                icon: "🧴",
                name: "حجم العبوة",
                slug: "volume",
                values: ["30ml", "50ml", "100ml", "150ml"],
              },
              {
                icon: "🌸",
                name: "الرائحة",
                slug: "scent",
                values: ["شرقي", "خشبي", "زهري", "فريش"],
              },
              {
                icon: "✨",
                name: "التركيز",
                slug: "concentration",
                values: ["EDT", "EDP", "Parfum"],
              },
              {
                icon: "📱",
                name: "الموديل",
                slug: "model",
                values: ["Standard", "Pro", "Max", "Ultra"],
              },
              {
                icon: "⚖️",
                name: t("products.attributes.templateWeight"),
                slug: "weight",
                values: ["250g", "500g", "1kg", "2kg"],
              },
              {
                icon: "📦",
                name: t("products.attributes.templatePack"),
                slug: "pack",
                values: ["قطعة", "3 قطع", "6 قطع", "12 قطعة"],
              },
            ].map((template) => {
              const isAdded = attributes.some((a) => a.slug === template.slug);
              return (
                <button
                  key={template.slug}
                  type="button"
                  onClick={() => {
                    if (!isAdded) {
                      const newAttr: ProductAttribute = {
                        id: `attr_${template.slug}_${Date.now()}`,
                        name: template.name,
                        slug: template.slug,
                        values: template.values,
                        visible: true,
                        forVariations: true,
                        requiredForOrder: true,
                      };
                      setAttributes((prev) => [...prev, newAttr]);
                    }
                  }}
                  disabled={isAdded}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    isAdded
                      ? "border-green-300 bg-green-50 dark:bg-green-900/30 dark:border-green-700 cursor-default"
                      : "border-dashed border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                  }`}
                >
                  <span className="text-2xl">{template.icon}</span>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                    {template.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {template.values.slice(0, 3).join("، ")}...
                  </p>
                  {isAdded && (
                    <span className="text-xs text-green-600 dark:text-green-400 mt-1 block">
                      ✓ مضاف
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom Mode */}
      {attributeMode === "custom" && (
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("products.attributes.attributeName")}
              </label>
              <input
                type="text"
                value={newAttributeName}
                onChange={(e) => setNewAttributeName(e.target.value)}
                placeholder="مثل: اللون، الحجم، النكهة"
                className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("products.attributes.values")}{" "}
                <span className="text-gray-400 dark:text-gray-500 font-normal">
                  {t("products.attributes.valuesHint")}
                </span>
              </label>
              <div className="space-y-2">
                {newAttributeValuesList.map((value, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateValueField(index, e.target.value)}
                      onKeyDown={(e) => handleValueKeyPress(e, index)}
                      placeholder={index === 0 ? "القيمة الأولى" : "قيمة أخرى..."}
                      className="attribute-value-input flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                    {newAttributeValuesList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeValueField(index)}
                        className="px-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addValueField}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1"
                >
                  <PlusIcon className="h-4 w-4" /> {t("products.attributes.addValue")}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={addAttribute}
              disabled={
                !newAttributeName.trim() ||
                !newAttributeValuesList.some((v) => v.trim())
              }
              className="px-4 py-2 bg-indigo-600 dark:bg-indigo-600 text-white rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-700 text-sm disabled:opacity-50 disabled:dark:opacity-50"
            >
              <PlusIcon className="h-4 w-4 inline ml-1" />{" "}
              {t("products.attributes.addAttribute")}
            </button>
          </div>
        </div>
      )}

      {/* Added Attributes List */}
      {attributes.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t("products.attributes.addedAttributes")} ({attributes.length}):
          </h4>
          <div className="space-y-2">
            {attributes.map((attr) => (
              <div
                key={attr.id}
                className="flex items-center justify-between bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3"
              >
                {editingAttrId === attr.id ? (
                  <div className="w-full space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        placeholder={t("products.attributes.attributeName")}
                      />
                      <div className="md:col-span-2 space-y-2">
                        {editValues.map((val, i) => (
                          <div key={i} className="flex gap-2">
                            <input
                              value={val}
                              onChange={(e) => updateEditValue(i, e.target.value)}
                              className="flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                              placeholder={t("products.attributes.values")}
                            />
                            {editValues.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeEditValue(i)}
                                className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={addEditValue}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                        >
                          + {t("products.attributes.addValue")}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={attr.forVariations}
                          onChange={(e) =>
                            setAttributes((prev) =>
                              prev.map((a) =>
                                a.id === attr.id
                                  ? {
                                      ...a,
                                      forVariations: e.target.checked,
                                      requiredForOrder: e.target.checked
                                        ? a.requiredForOrder !== false
                                        : false,
                                    }
                                  : a
                              )
                            )
                          }
                          className="h-4 w-4 text-indigo-600 dark:text-indigo-500 rounded"
                        />
                        {t("products.attributes.forVariations")}
                      </label>
                      <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={attr.forVariations && attr.requiredForOrder !== false}
                          disabled={!attr.forVariations}
                          onChange={(e) =>
                            setAttributes((prev) =>
                              prev.map((a) =>
                                a.id === attr.id
                                  ? { ...a, requiredForOrder: e.target.checked }
                                  : a
                              )
                            )
                          }
                          className="h-4 w-4 text-indigo-600 dark:text-indigo-500 rounded disabled:opacity-50"
                        />
                        يسأل عنه النظام عند إنشاء الأوردر
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={saveEdit}
                          disabled={!editName.trim() || !editValues.some((v) => v.trim())}
                          className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm disabled:opacity-50"
                        >
                          {t("common.save") ?? "حفظ"}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-md text-sm"
                        >
                          {t("common.cancel") ?? "إلغاء"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <span className="font-medium text-gray-800 dark:text-gray-200">
                        {attr.name}
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {attr.values.map((val, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded text-xs"
                          >
                            {val}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={attr.forVariations}
                          onChange={(e) =>
                            setAttributes((prev) =>
                              prev.map((a) =>
                                a.id === attr.id
                                  ? {
                                      ...a,
                                      forVariations: e.target.checked,
                                      requiredForOrder: e.target.checked
                                        ? a.requiredForOrder !== false
                                        : false,
                                    }
                                  : a
                              )
                            )
                          }
                          className="h-4 w-4 text-indigo-600 dark:text-indigo-500 rounded"
                        />
                        {t("products.attributes.forVariations")}
                      </label>
                      <label className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={attr.forVariations && attr.requiredForOrder !== false}
                          disabled={!attr.forVariations}
                          onChange={(e) =>
                            setAttributes((prev) =>
                              prev.map((a) =>
                                a.id === attr.id
                                  ? { ...a, requiredForOrder: e.target.checked }
                                  : a
                              )
                            )
                          }
                          className="h-4 w-4 text-indigo-600 dark:text-indigo-500 rounded disabled:opacity-50"
                        />
                        مطلوب للأوردر
                      </label>
                      <button
                        type="button"
                        onClick={() => beginEdit(attr)}
                        className="text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-200 text-sm"
                      >
                        {t("common.edit") ?? "تعديل"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAttribute(attr.id)}
                        className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-1"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Variations Button */}
      {attributes.filter((a) => a.forVariations).length > 0 && (
        <div className="mt-6 flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
          <div>
            <p className="text-green-800 dark:text-green-300 font-medium">
              🔄 {t("products.attributes.generateVariants")}{" "}
              {attributes
                .filter((a) => a.forVariations)
                .reduce((acc, attr) => acc * attr.values.length, 1)}
            </p>
            <p className="text-green-600 dark:text-green-400 text-sm">
              من{" "}
              {attributes
                .filter((a) => a.forVariations)
                .map((a) => a.name)
                .join(" × ")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              generateVariations();
              setActiveTab("variants");
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            {t("products.attributes.generateVariants")}
            <span className="transform rotate-180">→</span>
          </button>
        </div>
      )}

      {attributes.length === 0 && (
        <div className="mt-6 text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <SwatchIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
          <p>لم تضف أي صفات بعد</p>
          <p className="text-sm">اختر من القوالب الجاهزة أو أنشئ صفات مخصصة</p>
        </div>
      )}
    </div>
  );
};
