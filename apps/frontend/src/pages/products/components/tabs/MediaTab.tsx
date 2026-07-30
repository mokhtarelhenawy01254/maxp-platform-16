import { Image as PhotoIcon, Star as StarIcon, List as Bars4Icon, X as XMarkIcon } from 'lucide-react';
import React from "react";
;
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
      className={`relative group p-1 rounded-xl border-2 transition-all ${
        isMain ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20" : "border-transparent"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <img
        src={getImageUrl(url) || url}
        alt=""
        className="h-24 w-full object-cover rounded-lg border border-gray-200 dark:border-gray-600 pointer-events-none"
      />

      {/* Main Image Badge */}
      {isMain && (
        <div className="absolute top-2 left-2 bg-yellow-500 text-white text-[10px] px-1.5 py-0.5 rounded shadow-sm font-bold flex items-center gap-0.5 pointer-events-none">
          <StarIcon className="w-3 h-3 fill-current" />
          الرئيسية
        </div>
      )}

      {/* Actions Overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-2">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="p-1 cursor-grab active:cursor-grabbing text-white opacity-80 hover:opacity-100"
          title="سحب لإعادة الترتيب"
        >
          <Bars4Icon className="w-8 h-8 drop-shadow-md" />
        </div>

        <div className="flex items-center gap-2">
          {!isMain && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSetMain();
              }}
              className="text-white hover:text-yellow-400 bg-black/50 p-1.5 rounded-full backdrop-blur-sm transition-colors"
              title="تعيين كصورة رئيسية"
            >
              <StarIcon className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
            className="text-white hover:text-red-400 bg-black/50 p-1.5 rounded-full backdrop-blur-sm transition-colors"
            title="حذف الصورة"
          >
            <XMarkIcon className="w-4 h-4" />
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
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6 animate-fade-in">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
        {t("products.media.title")}
      </h3>
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
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
          className="cursor-pointer text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 block"
        >
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-300" />
          <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
            {t("products.media.selectImages")}
          </span>
          <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
            {t("products.media.imageFormats")}
          </span>
        </label>
      </div>
      
      {uploading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-4 flex items-center gap-3 animate-pulse">
           <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {t("products.media.uploading")}
          </p>
        </div>
      )}

      {uploadedImages.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            {t("products.media.uploadedImages")} ({uploadedImages.length})
          </p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
