import React, { useState } from "react";
import { GripVertical, Layers } from "lucide-react";

export interface ProductPageElement {
  id: string;
  label: string;
  enabled: boolean;
}

interface SortableProductPageElementsProps {
  elements: ProductPageElement[];
  onOrderChange: (newOrder: string[]) => void;
  onToggle: (id: string, enabled: boolean) => void;
  disabled?: boolean;
}

const SortableProductPageElements: React.FC<SortableProductPageElementsProps> = ({
  elements,
  onOrderChange,
  onToggle,
  disabled = false,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    if (disabled) return;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (disabled || draggedIndex === null) return;
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    if (disabled || draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    e.preventDefault();

    const newOrder = [...elements];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    if (!draggedItem) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    newOrder.splice(dropIndex, 0, draggedItem);

    const newOrderIds = newOrder.map((el) => el.id);
    onOrderChange(newOrderIds);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Layers className="size-4 text-primary" />
        <p className="text-xs font-medium text-muted-foreground">
          اسحب العناصر لأعلى أو لأسفل لترتيبها في صفحة المنتج، وفعل العناصر المطلوبة
        </p>
      </div>

      <div className="space-y-2">
        {elements.map((element, index) => (
          <div
            key={element.id}
            draggable={!disabled}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`
              flex items-center justify-between p-3 rounded-lg border transition-all duration-150
              ${
                draggedIndex === index
                  ? "border-primary bg-primary/5 opacity-60 cursor-grabbing shadow-sm"
                  : dragOverIndex === index
                    ? "border-primary border-dashed bg-primary/10"
                    : "border-border/70 bg-card hover:border-border hover:bg-muted/40"
              }
              ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-move"}
            `}
          >
            <div className="flex items-center gap-3 flex-1">
              {/* Drag Handle */}
              <div
                className={`text-muted-foreground transition-colors ${
                  disabled
                    ? ""
                    : "hover:text-primary cursor-grab active:cursor-grabbing"
                }`}
                title="سحب للترتيب"
              >
                <GripVertical className="size-4" />
              </div>

              {/* Element Label */}
              <span
                className={`text-xs font-semibold flex-1 ${
                  disabled
                    ? "text-muted-foreground"
                    : element.enabled
                      ? "text-foreground"
                      : "text-muted-foreground line-through opacity-75"
                }`}
              >
                {element.label}
              </span>

              {/* Toggle Switch */}
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={element.enabled}
                  onChange={(e) => onToggle(element.id, e.target.checked)}
                  disabled={disabled}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50"></div>
              </label>
            </div>
          </div>
        ))}
      </div>

      {elements.length === 0 && (
        <div className="text-xs text-muted-foreground text-center py-6 bg-muted/20 rounded-lg border border-dashed border-border/70">
          لا توجد عناصر متاحة للترتيب
        </div>
      )}
    </div>
  );
};

export default SortableProductPageElements;
