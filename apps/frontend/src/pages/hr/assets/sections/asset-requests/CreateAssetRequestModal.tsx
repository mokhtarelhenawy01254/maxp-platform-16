import React from "react";
import { NewAssetRequestFormState } from "./types";
import { ASSET_REQUEST_PRIORITIES, ASSET_REQUEST_TYPES } from "./helpers";

interface CreateAssetRequestModalProps {
  open: boolean;
  onClose: () => void;
  newRequest: NewAssetRequestFormState;
  onChangeRequest: (val: NewAssetRequestFormState) => void;
  onSubmit: () => void;
}

export const CreateAssetRequestModal: React.FC<
  CreateAssetRequestModalProps
> = ({ open, onClose, newRequest, onChangeRequest, onSubmit }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl p-8 shadow-2xl animate-scale-in">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            تقديم طلب عهدة
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
              نوع الأصل المطلوب
            </label>
            <select
              value={newRequest.assetType}
              onChange={(e) =>
                onChangeRequest({ ...newRequest, assetType: e.target.value })
              }
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl px-4 py-3 text-sm dark:text-white"
            >
              {ASSET_REQUEST_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
              الأولوية
            </label>
            <div className="flex gap-2">
              {ASSET_REQUEST_PRIORITIES.map((p) => (
                <button
                  key={p.key}
                  onClick={() =>
                    onChangeRequest({ ...newRequest, priority: p.key })
                  }
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                    newRequest.priority === p.key
                      ? "bg-primary border-primary text-primary-foreground shadow-xs"
                      : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-400"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
              سبب الطلب
            </label>
            <textarea
              value={newRequest.reason}
              onChange={(e) =>
                onChangeRequest({ ...newRequest, reason: e.target.value })
              }
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-xl px-4 py-3 text-sm dark:text-white h-32"
              placeholder="لماذا تحتاج هذه العهدة؟"
            ></textarea>
          </div>
        </div>
        <div className="flex gap-3 mt-8">
          <button
            onClick={onSubmit}
            className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold hover:bg-primary/90 shadow-xs transition-colors"
          >
            إرسال الطلب
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-3.5 rounded-xl font-bold hover:bg-gray-200 transition-all"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
