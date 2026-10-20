import React from "react";
import { Box, X } from "lucide-react";
import DentalModelViewer from "../../../DentalModelViewer";
import { Active3DAttachment } from "../types/dentalTechBenchTypes";

interface Bench3DViewerModalProps {
  attachment: Active3DAttachment | null;
  onClose: () => void;
}

export const Bench3DViewerModal: React.FC<Bench3DViewerModalProps> = ({
  attachment,
  onClose,
}) => {
  if (!attachment) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bench-3d-modal-title"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-indigo-500" />
            <h3
              id="bench-3d-modal-title"
              className="font-bold text-sm text-gray-900 dark:text-white"
            >
              معاينة ثلاثية الأبعاد: {attachment.fileName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            aria-label="إغلاق المعاينة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 min-h-[450px] bg-slate-950">
          <DentalModelViewer
            url={attachment.url}
            ext={attachment.ext}
          />
        </div>
      </div>
    </div>
  );
};

export default Bench3DViewerModal;
