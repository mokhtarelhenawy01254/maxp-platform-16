import React from "react";
import {
  DocumentIcon,
  PhotoIcon,
  DocumentTextIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import { Asset, AssetDocument, DocumentType } from "./types";
import { COLOR_MAP } from "./helpers";

interface DocumentsHeaderAndFiltersProps {
  documents: AssetDocument[];
  assets: Asset[];
  documentTypes: DocumentType[];
  activeTab: string;
  onActiveTabChange: (tabId: string) => void;
  searchQuery: string;
  onSearchQueryChange: (val: string) => void;
  selectedAsset: string;
  onSelectedAssetChange: (val: string) => void;
  onOpenUploadModal: (docType?: string) => void;
}

export const DocumentsHeaderAndFilters: React.FC<
  DocumentsHeaderAndFiltersProps
> = ({
  documents,
  assets,
  documentTypes,
  activeTab,
  onActiveTabChange,
  searchQuery,
  onSearchQueryChange,
  selectedAsset,
  onSelectedAssetChange,
  onOpenUploadModal,
}) => {
  const tabs = [
    { id: "all", label: "الكل", count: documents.length },
    {
      id: "image",
      label: "صور الأصول",
      count: documents.filter((d) => d.documentType === "image").length,
    },
    {
      id: "invoice",
      label: "فواتير الشراء",
      count: documents.filter((d) => d.documentType === "invoice").length,
    },
    {
      id: "warranty",
      label: "شهادات الضمان",
      count: documents.filter((d) => d.documentType === "warranty").length,
    },
    {
      id: "manual",
      label: "أدلة الاستخدام",
      count: documents.filter((d) => d.documentType === "manual").length,
    },
    {
      id: "other",
      label: "أخرى",
      count: documents.filter((d) => d.documentType === "other").length,
    },
  ];

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <DocumentIcon className="h-7 w-7 text-indigo-600" />
            الوثائق والمرفقات
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            إدارة جميع مستندات الأصول في مكان واحد
          </p>
        </div>
        <button
          onClick={() => onOpenUploadModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-xs font-semibold"
        >
          <PlusIcon className="h-5 w-5" />
          رفع مستند جديد
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {documentTypes.map((type) => {
          const colorKey =
            type.value === "image"
              ? "blue"
              : type.value === "invoice"
                ? "green"
                : type.value === "warranty"
                  ? "purple"
                  : type.value === "manual"
                    ? "orange"
                    : "gray";
          const colors = COLOR_MAP[colorKey] ?? {
            bg: "bg-gray-600",
            text: "text-gray-600",
            light: "bg-gray-100 dark:bg-gray-700",
          };
          return (
            <button
              key={type.value}
              onClick={() => onOpenUploadModal(type.value)}
              className={`${colors.light} p-4 rounded-xl text-center hover:shadow-md transition-all border-2 border-transparent`}
            >
              <div className="flex justify-center mb-2">
                {type.value === "image" && (
                  <PhotoIcon className="h-8 w-8 text-blue-600" />
                )}
                {type.value === "invoice" && (
                  <DocumentTextIcon className="h-8 w-8 text-green-600" />
                )}
                {type.value === "warranty" && (
                  <ShieldCheckIcon className="h-8 w-8 text-purple-600" />
                )}
                {type.value === "manual" && (
                  <BookOpenIcon className="h-8 w-8 text-orange-600" />
                )}
                {type.value === "other" && (
                  <DocumentIcon className="h-8 w-8 text-gray-600" />
                )}
              </div>
              <p className={`font-medium ${colors.text} text-sm`}>
                {type.label}
              </p>
            </button>
          );
        })}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث في المستندات..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={selectedAsset}
              onChange={(e) => onSelectedAssetChange(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">جميع الأصول</option>
              {assets
                .filter((asset) => asset && asset.id && asset.name)
                .map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} {asset.code ? `(${asset.code})` : ""}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onActiveTabChange(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`mr-2 px-2 py-0.5 rounded-full text-xs font-mono tabular-nums ${
                    activeTab === tab.id
                      ? "bg-white/20"
                      : "bg-white dark:bg-gray-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};
