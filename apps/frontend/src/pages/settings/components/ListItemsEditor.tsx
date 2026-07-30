import React, { useState } from "react";
import { uploadService } from "../../../services/uploadService";
import { Upload, Trash2, ChevronUp, ChevronDown, GripVertical, Image as ImageIcon } from 'lucide-react';

export interface FieldDef {
    key: string;
    label: string;
    type: "text" | "textarea" | "image" | "number" | "icon";
    placeholder?: string;
}

interface ListItemsEditorProps {
    items: any[];
    onChange: (newItems: any[]) => void;
    fields: FieldDef[];
    newItemTemplate: any;
    itemTitleField: string; // The field to show as title (e.g. 'title' or 'customerName')
    maxItems?: number;
}

const ListItemsEditor: React.FC<ListItemsEditorProps> = ({
    items = [],
    onChange,
    fields,
    newItemTemplate,
    itemTitleField,
    maxItems = 10,
}) => {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

    const handleUpdateItem = (index: number, key: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [key]: value };
        onChange(newItems);
    };

    const handleAddItem = () => {
        if (items.length >= maxItems) return;
        onChange([...items, { ...newItemTemplate }]);
        setExpandedIndex(items.length);
    };

    const handleRemoveItem = (index: number, e: React.MouseEvent) => {
        e.stopPropagation();
        const newItems = [...items];
        newItems.splice(index, 1);
        onChange(newItems);
        if (expandedIndex === index) setExpandedIndex(null);
    };

    const moveItem = (index: number, direction: "up" | "down", e: React.MouseEvent) => {
        e.stopPropagation();
        if (direction === "up" && index === 0) return;
        if (direction === "down" && index === items.length - 1) return;

        const newItems = [...items];
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
        onChange(newItems);

        if (expandedIndex === index) setExpandedIndex(targetIndex);
        else if (expandedIndex === targetIndex) setExpandedIndex(index);
    };

    const handleImageUpload = async (index: number, key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingIndex(index);
            const url = await uploadService.uploadImage(file, "homepage");
            handleUpdateItem(index, key, url);
        } catch (error) {
            console.error("Upload error:", error);
            alert("حدث خطأ أثناء رفع الصورة");
        } finally {
            setUploadingIndex(null);
            // Reset input
            if (e.target) e.target.value = '';
        }
    };

    return (
        <div className="space-y-3">
            {items.map((item, index) => (
                <div
                    key={index}
                    className={`border rounded-md overflow-hidden transition-all duration-200 ${expandedIndex === index ? 'border-indigo-400 shadow-md ring-1 ring-indigo-200' : 'border-gray-200'}`}
                >
                    {/* Item Header */}
                    <div
                        className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                        onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                    >
                        <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                            <span className="text-sm font-medium text-gray-700">
                                {item[itemTitleField] || `عنصر ${index + 1}`}
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={(e) => moveItem(index, "up", e)}
                                disabled={index === 0}
                                className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-400"
                                title="تحريك لأعلى"
                            >
                                <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => moveItem(index, "down", e)}
                                disabled={index === items.length - 1}
                                className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:hover:text-gray-400"
                                title="تحريك لأسفل"
                            >
                                <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                                onClick={(e) => handleRemoveItem(index, e)}
                                className="p-1 text-gray-400 hover:text-red-500 ml-2"
                                title="حذف العنصر"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Item Content (Expanded) */}
                    {expandedIndex === index && (
                        <div className="p-4 bg-white space-y-4 border-t border-gray-100">
                            {fields.map((field) => (
                                <div key={field.key}>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">
                                        {field.label}
                                    </label>

                                    {field.type === "text" && (
                                        <input
                                            type="text"
                                            value={item[field.key] || ""}
                                            onChange={(e) => handleUpdateItem(index, field.key, e.target.value)}
                                            placeholder={field.placeholder}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        />
                                    )}

                                    {field.type === "textarea" && (
                                        <textarea
                                            value={item[field.key] || ""}
                                            onChange={(e) => handleUpdateItem(index, field.key, e.target.value)}
                                            placeholder={field.placeholder}
                                            rows={3}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        />
                                    )}

                                    {field.type === "number" && (
                                        <input
                                            type="number"
                                            value={item[field.key] || 0}
                                            onChange={(e) => handleUpdateItem(index, field.key, parseFloat(e.target.value))}
                                            placeholder={field.placeholder}
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                        />
                                    )}

                                    {field.type === "image" && (
                                        <div>
                                            {item[field.key] && (
                                                <div className="relative mb-2 w-32 h-32 border rounded overflow-hidden">
                                                    <img src={item[field.key]} alt="Preview" className="w-full h-full object-cover" />
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <label className="cursor-pointer bg-white px-3 py-1.5 text-xs border border-gray-300 rounded shadow-sm hover:bg-gray-50 flex items-center gap-2">
                                                    {uploadingIndex === index ? (
                                                        <span className="text-gray-500">جاري الرفع...</span>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-3 h-3 text-gray-500" />
                                                            <span className="font-medium text-gray-700">تغيير الصورة</span>
                                                        </>
                                                    )}
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={(e) => handleImageUpload(index, field.key, e)}
                                                        disabled={uploadingIndex === index}
                                                    />
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    {field.type === "icon" && (
                                        <input
                                            type="text"
                                            value={item[field.key] || ""}
                                            onChange={(e) => handleUpdateItem(index, field.key, e.target.value)}
                                            placeholder="e.g. ⭐, 🚀, or icon class"
                                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-sans"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}

            {/* Add New Item Button */}
            {items.length < maxItems && (
                <button
                    onClick={handleAddItem}
                    className="w-full py-2 flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md hover:bg-indigo-100 transition-colors"
                >
                    <span>إضافة عنصر جديد</span>
                </button>
            )}

            {items.length >= maxItems && (
                <div className="text-center text-xs text-orange-500 p-2 bg-orange-50 rounded border border-orange-100">
                    تم الوصول للحد الأقصى من العناصر ({maxItems})
                </div>
            )}
        </div>
    );
};

export default ListItemsEditor;
