import { useState } from "react";
import { XMarkIcon, TrashIcon } from "@heroicons/react/24/outline";
import { ServiceCategory, MODAL_CONTENT_CLS, MODAL_INPUT_CLS } from "./shared";

interface Props {
  category?: Partial<ServiceCategory> | null;
  onClose: () => void;
  onSave: (d: Partial<ServiceCategory>) => Promise<void>;
  onDelete: (id: string) => void;
}

const CATEGORY_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#6366f1", "#84cc16", "#14b8a6"
];

const CATEGORY_ICONS = ["≡ƒ⌐║", "≡ƒª╖", "≡ƒæü∩╕Å", "Γ¥ñ∩╕Å", "≡ƒºá", "≡ƒª┤", "≡ƒæ╢", "≡ƒº¼", "≡ƒÆë", "≡ƒö¼", "≡ƒ½ü", "≡ƒª╗", "≡ƒÅÑ", "Γ£¿"];

export default function CategoryModal({ category, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(category?.name || "");
  const [color, setColor] = useState(category?.color || CATEGORY_COLORS[0]);
  const [icon, setIcon] = useState(category?.icon || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ id: category?.id, name: name.trim(), color, icon: icon || undefined, sortOrder: category?.sortOrder || 0, isActive: category?.isActive ?? true });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className={`${MODAL_CONTENT_CLS} max-w-lg`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">{category?.id ? "╪¬╪╣╪»┘è┘ä ┘é╪│┘à" : "╪Ñ╪╢╪º┘ü╪⌐ ┘é╪│┘à"}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg dark:text-gray-300"><XMarkIcon className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">╪º╪│┘à ╪º┘ä┘é╪│┘à *</label>
            <input className={MODAL_INPUT_CLS} placeholder="┘à╪½╪º┘ä: ┘à╪│╪º┘ä┘â ╪¿┘ê┘ä┘è╪⌐" value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">╪º┘ä┘ä┘ê┘å</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 ${color === c ? "border-gray-900 dark:border-white scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} aria-label={c} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">╪º┘ä╪ú┘è┘é┘ê┘å╪⌐ (╪º╪«╪¬┘è╪º╪▒┘è)</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_ICONS.map(ic => (
                <button key={ic} type="button" onClick={() => setIcon(ic)} className={`w-9 h-9 text-lg rounded-lg border ${icon === ic ? "bg-blue-50 dark:bg-blue-900/30 border-blue-500" : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"}`}>{ic}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-6">
          {category?.id ? (
            <button onClick={() => { if (category.id) onDelete(category.id); }} className="flex items-center gap-1.5 px-4 py-2 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"><TrashIcon className="w-4 h-4" />╪¡╪░┘ü</button>
          ) : <span />}
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">╪Ñ┘ä╪║╪º╪í</button>
            <button onClick={handleSave} disabled={!name.trim() || saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? "..." : "╪¡┘ü╪╕"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
