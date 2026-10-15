import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Search, X, Check, MapPin } from "lucide-react";
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
  selectedIds = [],
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
        region: fallback?.region || "delta",
        regionNameAr: fallback?.regionNameAr || EGYPT_REGIONS.delta,
        popular:
          fallback?.popular ||
          ["cairo", "giza", "alexandria", "qalyubia"].includes(uiId),
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
    const popularIds = availableGovernorates
      .filter((g) => g.popular)
      .map((g) => g.id);
    onChange(popularIds);
  };

  const selectedCount = selectedIds.length;
  const totalCount = availableGovernorates.length;

  return (
    <div className="space-y-3.5" dir="rtl">
      {/* Header with counts and actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="text-xs text-muted-foreground font-mono tabular-nums">
          {t("storeBranches.selectedCount", {
            selected: selectedCount,
            total: totalCount,
          })}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={selectPopular}
            className="px-2.5 py-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-colors"
          >
            {t("storeBranches.commonGovernorates")}
          </button>
          <button
            type="button"
            onClick={selectAll}
            className="px-2.5 py-1 text-xs font-medium border border-border/70 text-foreground bg-muted/30 hover:bg-muted rounded-lg transition-colors"
          >
            {t("storeBranches.selectAll")}
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="px-2.5 py-1 text-xs font-medium border border-rose-500/20 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            {t("storeBranches.deselectAll")}
          </button>
        </div>
      </div>

      {/* Search and Region Filter */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("storeBranches.searchGovernorates")}
            className="w-full pr-9 pl-8 py-2 text-xs bg-background border border-border/70 text-foreground rounded-xl placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="px-3 py-2 text-xs bg-background border border-border/70 text-foreground rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all"
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
      <div className="border border-border/70 rounded-xl max-h-80 overflow-y-auto bg-card divide-y divide-border/60">
        {Object.entries(groupedByRegion).length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
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
              <div key={region} className="divide-y divide-border/40">
                {/* Region Header */}
                <div
                  onClick={() => toggleRegion(region)}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 bg-muted/30 hover:bg-muted/50 cursor-pointer select-none transition-colors"
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      allRegionSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : someRegionSelected
                          ? "bg-primary/40 border-primary text-primary-foreground"
                          : "border-border/80 bg-background"
                    }`}
                  >
                    {(allRegionSelected || someRegionSelected) && (
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-foreground">
                    {regionName}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
                    ({regionIds.filter((id) => selectedIds.includes(id)).length}
                    /{govs.length})
                  </span>
                </div>

                {/* Governorates in Region */}
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-border/40">
                  {govs.map((gov) => {
                    const isSelected = selectedIds.includes(gov.id);
                    return (
                      <div
                        key={gov.id}
                        onClick={() => toggleGovernorate(gov.id)}
                        className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-muted/20 cursor-pointer select-none transition-colors"
                      >
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-border/80 bg-background"
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-foreground truncate">
                              {gov.nameAr}
                            </span>
                            {gov.popular && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-primary/10 text-primary border border-primary/20">
                                شائع
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground font-mono">
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
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-primary">
              {t("storeBranches.selectedGovernorates", {
                count: selectedCount,
              })}
            </span>
            <span className="text-[11px] text-muted-foreground font-mono tabular-nums">
              {selectedCount} محافظة
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedIds.slice(0, 10).map((id) => {
              const gov = availableGovernorates.find((g) => g.id === id);
              return gov ? (
                <span
                  key={id}
                  className="px-2 py-0.5 bg-card border border-border/60 text-foreground text-[11px] rounded-md shadow-2xs"
                >
                  {gov.nameAr}
                </span>
              ) : null;
            })}
            {selectedCount > 10 && (
              <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[11px] rounded-md font-mono tabular-nums border border-border/50">
                +{selectedCount - 10} {t("storeBranches.other")}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GovernoratesSelector;
