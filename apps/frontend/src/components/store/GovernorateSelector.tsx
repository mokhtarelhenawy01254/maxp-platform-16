import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import {
  EGYPT_GOVERNORATES,
  EGYPT_REGIONS,
  Governorate,
} from "../../constants/egyptGovernorates";
import type { CanonicalGovernorate } from "../../services/storeSettingsService";

interface GovernoratesSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  governorates?: CanonicalGovernorate[];
}

const CANONICAL_TO_UI_ID: Record<string, string> = {
  cairo: "cairo",
  giza: "giza",
  qalyubia: "qalyubia",
  alexandria: "alexandria",
  beheira: "beheira",
  gharbia: "gharbia",
  sharqia: "sharqia",
  monufia: "monufia",
  dakahlia: "dakahlia",
  "port-said": "port-said",
  ismailia: "ismailia",
  suez: "suez",
  fayoum: "fayoum",
  "beni-suef": "beni-suef",
  minya: "minya",
  asyut: "asyut",
  sohag: "sohag",
  qena: "qena",
  luxor: "luxor",
  aswan: "aswan",
  "red-sea": "red-sea",
  "new-valley": "new-valley",
  matrouh: "matrouh",
  "north-sinai": "north-sinai",
  "south-sinai": "south-sinai",
  "6th-october": "6th-october",
  "sheikh-zayed": "sheikh-zayed",
  "new-cairo": "new-cairo",
  helwan: "helwan",
  "15th-may": "15th-may",
};

export const GovernoratesSelector: React.FC<GovernoratesSelectorProps> = ({
  selectedIds,
  onChange,
  governorates,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("all");

  const availableGovernorates = useMemo<Governorate[]>(() => {
    if (!governorates?.length) {
      return EGYPT_GOVERNORATES;
    }

    return governorates.map((gov) => {
      const uiId = CANONICAL_TO_UI_ID[gov.code] || gov.code;
      const fallback = EGYPT_GOVERNORATES.find((item) => item.id === uiId);
      return {
        id: uiId,
        nameAr: gov.nameAr,
        nameEn: gov.nameEn || fallback?.nameEn || gov.code,
        region: fallback?.region || 'delta',
        regionNameAr: fallback?.regionNameAr || EGYPT_REGIONS.delta,
        popular: fallback?.popular || ['cairo', 'giza', 'alexandria', 'qalyubia'].includes(uiId),
      };
    });
  }, [governorates]);

  const filteredGovernorates = useMemo(() => {
    return availableGovernorates.filter((gov) => {
      const matchesSearch =
        gov.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gov.nameEn.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRegion =
        selectedRegion === "all" || gov.region === selectedRegion;
      return matchesSearch && matchesRegion;
    });
  }, [availableGovernorates, searchTerm, selectedRegion]);

  const groupedByRegion = useMemo(() => {
    const groups: Record<string, Governorate[]> = {};
    filteredGovernorates.forEach((gov) => {
      const regionGroup = groups[gov.region] ?? [];
      regionGroup.push(gov);
      groups[gov.region] = regionGroup;
    });
    return groups;
  }, [filteredGovernorates]);

  const toggleGovernorate = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((gid) => gid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleRegion = (region: string) => {
    const regionGovs = availableGovernorates.filter((g) => g.region === region);
    const regionIds = regionGovs.map((g) => g.id);
    const allSelected = regionIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      onChange(selectedIds.filter((id) => !regionIds.includes(id)));
    } else {
      const newIds = [...selectedIds];
      regionIds.forEach((id) => {
        if (!newIds.includes(id)) {
          newIds.push(id);
        }
      });
      onChange(newIds);
    }
  };

  const selectAll = () => {
    onChange(filteredGovernorates.map((g) => g.id));
  };

  const clearAll = () => {
    onChange([]);
  };

  const selectPopular = () => {
    const popularIds = availableGovernorates.filter((g) => g.popular).map(
      (g) => g.id,
    );
    onChange(popularIds);
  };

  const selectedCount = selectedIds.length;
  const totalCount = availableGovernorates.length;

  return (
    <div className="space-y-4">
      {/* Header with counts */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t("storeBranches.selectedCount", { selected: selectedCount, total: totalCount })}
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectPopular}
            className="px-3 py-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            {t("storeBranches.commonGovernorates")}
          </button>
          <button
            onClick={selectAll}
            className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t("storeBranches.selectAll")}
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            {t("storeBranches.deselectAll")}
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("storeBranches.searchGovernorates")}
            className="w-full pr-10 pl-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">{t("storeBranches.allGovernorates")}</option>
          {Object.entries(EGYPT_REGIONS).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/* Governorates List */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-96 overflow-y-auto">
        {Object.entries(groupedByRegion).length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {t("storeBranches.noResults")}
          </div>
        ) : (
          Object.entries(groupedByRegion).map(([region, govs]) => {
            const regionName =
              EGYPT_REGIONS[region as keyof typeof EGYPT_REGIONS];
            const regionIds = govs.map((g) => g.id);
            const allRegionSelected = regionIds.every((id) =>
              selectedIds.includes(id),
            );
            const someRegionSelected = regionIds.some((id) =>
              selectedIds.includes(id),
            );

            return (
              <div
                key={region}
                className="border-b border-gray-200 dark:border-gray-700 last:border-b-0"
              >
                {/* Region Header */}
                <div
                  onClick={() => toggleRegion(region)}
                  className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      allRegionSelected
                        ? "bg-indigo-600 border-indigo-600"
                        : someRegionSelected
                          ? "bg-indigo-300 dark:bg-indigo-700 border-indigo-300 dark:border-indigo-700"
                          : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {(allRegionSelected || someRegionSelected) && (
                      <CheckIcon
                        className="h-3 w-3 text-white"
                        strokeWidth={3}
                      />
                    )}
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {regionName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({regionIds.filter((id) => selectedIds.includes(id)).length}
                    /{govs.length})
                  </span>
                </div>

                {/* Governorates in Region */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  {govs.map((gov) => {
                    const isSelected = selectedIds.includes(gov.id);
                    return (
                      <div
                        key={gov.id}
                        onClick={() => toggleGovernorate(gov.id)}
                        className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/30 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-indigo-600 border-indigo-600"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {isSelected && (
                            <CheckIcon
                              className="h-3 w-3 text-white"
                              strokeWidth={3}
                            />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900 dark:text-white">
                              {gov.nameAr}
                            </span>
                            {gov.popular && (
                              <span className="px-1.5 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded">
                                {t("storeBranches.commonGovernorates")}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {gov.nameEn}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Summary */}
      {selectedCount > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <CheckIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-indigo-900 dark:text-indigo-300 mb-1">
                {t("storeBranches.selectedGovernorates", { count: selectedCount })}
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedIds.slice(0, 10).map((id) => {
                  const gov = availableGovernorates.find((g) => g.id === id);
                  return gov ? (
                    <span
                      key={id}
                      className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 text-xs rounded"
                    >
                      {gov.nameAr}
                    </span>
                  ) : null;
                })}
                {selectedCount > 10 && (
                  <span className="px-2 py-1 bg-indigo-200 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 text-xs rounded font-medium">
                    +{selectedCount - 10} {t("storeBranches.other")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
