import React from "react";
import {
  Image as ImageIcon,
  Star,
  GripVertical,
  X,
  UploadCloud,
  RefreshCw,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ProductFormData } from "../../types";
import { getImageUrl } from "../../../../utils/imageUrl";

const SortableImageItem = ({
  url,
  isMain,
  onSetMain,
  onRemove,
}: {
  url: string;
  isMain: boolean;
  onSetMain: () => void;
  onRemove: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group p-1 rounded-xl border transition-all ${
        isMain
          ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/20"
          : "border-border/60 hover:border-border bg-card"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <img
        src={getImageUrl(url) || url}
        alt=""
        className="h-24 w-full object-cover rounded-lg border border-border/40 pointer-events-none"
      />

      {/* Main Image Badge */}
      {isMain && (
        <div className="absolute top-2 left-2 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-md shadow-xs font-semibold flex items-center gap-1 pointer-events-none">
          <Star className="w-3 h-3 fill-current" />
          <span>الرئيسية</span>
        </div>
      )}

      {/* Actions Overlay */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-2xs opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2 pointer-events-none">
        {/* Drag Handle (Desktop) */}
        <div
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing text-foreground opacity-80 hover:opacity-100 pointer-events-auto hidden sm:block"
          title="سحب لإعادة الترتيب"
        >
          <GripVertical className="w-6 h-6 drop-shadow-xs" />
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {!isMain && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSetMain();
              }}
              className="text-foreground hover:text-amber-500 bg-background/90 p-1.5 rounded-full border border-border/70 transition-colors shadow-xs"
              title="تعيين كصورة رئيسية"
            >
              <Star className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            className="text-foreground hover:text-destructive bg-background/90 p-1.5 rounded-full border border-border/70 transition-colors shadow-xs"
            title="حذف الصورة"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface MediaTabProps {
  formData: ProductFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductFormData>>;
  uploadedImages: string[];
  uploading: boolean;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDragEnd: (e: DragEndEvent) => void;
  removeUploadedImage: (url: string) => void;
  t: any;
}

export const MediaTab: React.FC<MediaTabProps> = ({
  formData,
  setFormData,
  uploadedImages,
  uploading,
  handleImageChange,
  handleDragEnd,
  removeUploadedImage,
  t,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleRemoveImage = (urlToRemove: string) => {
    setFormData((prev) => {
      if (prev.mainImage !== urlToRemove) {
        return prev;
      }

      const nextMainImage = uploadedImages.find((url) => url !== urlToRemove) || "";
      return {
        ...prev,
        mainImage: nextMainImage,
      };
    });

    void removeUploadedImage(urlToRemove);
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-4 sm:p-5 space-y-4 shadow-xs text-right">
      <div className="border-b border-border/50 pb-3">
        <h3 className="text-sm font-semibold text-foreground">
          {t("products.media.title")}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          إضافة صور المنتج وترتيب ظهورها وتحديد الصورة الرئيسية
        </p>
      </div>

      <div className="border border-dashed border-border/80 hover:border-primary/50 bg-muted/20 hover:bg-muted/40 rounded-xl p-6 text-center transition-all cursor-pointer">
        <input
          type="file"
          multiple
          onChange={handleImageChange}
          className="hidden"
          id="images"
          accept="image/png, image/jpeg, image/gif, image/webp"
        />
        <label
          htmlFor="images"
          className="cursor-pointer block"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 mx-auto flex items-center justify-center mb-2">
            <UploadCloud className="h-5 w-5" />
          </div>
          <span className="block text-xs font-semibold text-foreground">
            {t("products.media.selectImages")}
          </span>
          <span className="mt-1 block text-[11px] text-muted-foreground font-mono">
            {t("products.media.imageFormats")}
          </span>
        </label>
      </div>
      
      {uploading && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-center gap-2.5">
          <RefreshCw className="w-4 h-4 text-primary animate-spin" />
          <p className="text-xs font-medium text-primary">
            {t("products.media.uploading")}
          </p>
        </div>
      )}

      {uploadedImages.length > 0 && (
        <div className="pt-2">
          <p className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5">
            <span>{t("products.media.uploadedImages")}</span>
            <span className="font-mono tabular-nums text-muted-foreground">({uploadedImages.length})</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={uploadedImages}
                strategy={horizontalListSortingStrategy}
              >
                {uploadedImages.map((url, idx) => (
                  <SortableImageItem
                    key={url}
                    url={url}
                    isMain={
                      formData.mainImage === url ||
                      (!formData.mainImage && idx === 0)
                    }
                    onSetMain={() =>
                      setFormData((prev) => ({ ...prev, mainImage: url }))
                    }
                    onRemove={() => handleRemoveImage(url)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaTab;
