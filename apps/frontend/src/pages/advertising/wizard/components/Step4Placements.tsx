import React from "react";
import { Sparkles, Layout, Facebook, Instagram, MessageCircle, Globe } from "lucide-react";
import type { FormData } from "../types";
import { PLACEMENTS } from "../constants";

interface Step4PlacementsProps {
  formData: FormData;
  handleChange: (field: keyof FormData, value: any) => void;
  toggleArrayValue: (field: keyof FormData, value: string) => void;
  getError: (field: string) => string;
}

export const Step4Placements: React.FC<Step4PlacementsProps> = ({
  formData,
  handleChange,
  toggleArrayValue,
  getError,
}) => {
  return (
    <div className="space-y-6">
      {/* Placement Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          نوع المواضع
        </label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => handleChange("placementType", "AUTOMATIC")}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.placementType === "AUTOMATIC"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Sparkles
              className={`w-8 h-8 mx-auto mb-2 ${formData.placementType === "AUTOMATIC" ? "text-blue-500" : "text-gray-400"}`}
            />
            <div className="font-medium">Advantage+ Placements</div>
            <div className="text-xs text-gray-500 mt-1">
              دع Facebook يختار أفضل المواضع تلقائياً
            </div>
          </button>
          <button
            type="button"
            onClick={() => handleChange("placementType", "MANUAL")}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              formData.placementType === "MANUAL"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Layout
              className={`w-8 h-8 mx-auto mb-2 ${formData.placementType === "MANUAL" ? "text-blue-500" : "text-gray-400"}`}
            />
            <div className="font-medium">مواضع يدوية</div>
            <div className="text-xs text-gray-500 mt-1">اختر المواضع بنفسك</div>
          </button>
        </div>
      </div>

      {/* Manual Placements */}
      {formData.placementType === "MANUAL" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            اختر المواضع <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {PLACEMENTS.map((placement) => (
              <button
                key={placement.id}
                type="button"
                onClick={() => toggleArrayValue("placements", placement.id)}
                className={`flex items-center gap-3 p-3 border-2 rounded-xl transition-all ${
                  formData.placements.includes(placement.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div
                  className={
                    formData.placements.includes(placement.id)
                      ? "text-blue-500"
                      : "text-gray-400"
                  }
                >
                  {placement.icon}
                </div>
                <span className="font-medium text-sm">{placement.label}</span>
              </button>
            ))}
          </div>
          {getError("placements") && (
            <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {getError("placements")}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
