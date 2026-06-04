import React, { useEffect, useRef, useState } from "react";
import {
  ArrowsRightLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline";

import { useAuth } from "../../hooks/useAuthSimple";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";

interface CompanySwitcherProps {
  collapsed?: boolean;
}

type UserCompany = NonNullable<
  NonNullable<ReturnType<typeof useAuth>["user"]>["companies"]
>[number];

const CompanySwitcher: React.FC<CompanySwitcherProps> = ({
  collapsed = false,
}) => {
  const { user, switchCompany, isSwitchingCompany } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const companies = user?.companies ?? [];
  const currentCompany =
    companies.find((company) => company.isCurrent) || user?.company;
  const currentCompanyName = currentCompany?.name || "الشركة الحالية";
  const currentCompanyStatusLabel = "الحالية";
  const switcherLabel = `تبديل الشركة الحالية: ${currentCompanyName}`;

  useEffect(() => {
    if (collapsed) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [collapsed]);

  useEffect(() => {
    setIsOpen(false);
  }, [currentCompany?.id]);

  if (!user?.hasMultipleCompanies || companies.length <= 1) {
    return null;
  }

  const handleSwitchCompany = async (companyId: string) => {
    if (companyId === currentCompany?.id) {
      setIsOpen(false);
      return;
    }

    const success = await switchCompany(companyId);
    if (success) {
      setIsOpen(false);
    }
  };

  const renderCompanyOption = (company: UserCompany, mobile = false) => {
    const isCurrent = company.id === currentCompany?.id || company.isCurrent;

    return (
      <button
        key={company.id}
        type="button"
        onClick={() => handleSwitchCompany(company.id)}
        disabled={isSwitchingCompany}
        className={`w-full rounded-xl px-4 py-3 text-right transition-all disabled:opacity-50 ${
          isCurrent
            ? "bg-blue-50 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200"
            : "text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
        } ${mobile ? "min-h-12" : ""}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{company.name}</p>
            <div className="mt-1 flex flex-wrap items-center justify-end gap-1.5">
              <p className="text-[11px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
                {company.role || "COMPANY"}
              </p>
              {isCurrent ? (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
                  الحالية
                </span>
              ) : null}
            </div>
          </div>

          {isCurrent ? (
            <span className="flex items-center justify-center rounded-full bg-blue-600 p-0.5 dark:bg-blue-500">
              <CheckIcon className="h-3 w-3 text-white" />
            </span>
          ) : null}
        </div>
      </button>
    );
  };

  if (collapsed) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          disabled={isSwitchingCompany}
          className="flex min-w-0 max-w-[7.75rem] items-center gap-2 rounded-2xl border-2 border-blue-200 bg-white px-2.5 py-2 text-right text-blue-600 shadow-md transition-all hover:border-blue-400 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 dark:border-blue-700 dark:bg-gray-800 dark:text-blue-300 dark:hover:border-blue-500"
          title={switcherLabel}
          aria-label={switcherLabel}
        >
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 shadow-sm dark:bg-blue-900/50 dark:text-blue-300">
            {isSwitchingCompany ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-300" />
            ) : (
              <ArrowsRightLeftIcon className="h-4 w-4" />
            )}
          </span>

          <span className="min-w-0 flex-1 text-right">
            <span className="block truncate text-[12px] font-bold leading-tight text-gray-900 dark:text-white">
              {currentCompanyName}
            </span>
            <span className="block truncate text-[10px] font-semibold text-gray-500 dark:text-gray-400">
              {currentCompanyStatusLabel}
            </span>
          </span>

          <span className="business-shell-switch-badge inline-flex min-h-[20px] min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 px-1.5 text-[10px] font-bold leading-none text-white shadow-sm dark:from-blue-500 dark:to-indigo-600">
            {companies.length}
          </span>
        </button>

        <SheetContent
          side="bottom"
          className="gap-0 rounded-t-[28px] border-border/80 px-0 pb-5"
          showCloseButton={false}
        >
          <SheetHeader className="gap-1 border-b border-border/70 px-4 pb-3 pt-3 text-right">
            <div className="mx-auto mb-1 h-1.5 w-12 rounded-full bg-muted" />
            <SheetTitle className="flex items-center gap-2 text-right">
              <BuildingOfficeIcon className="h-4 w-4 text-blue-500" />
              تبديل الشركة
            </SheetTitle>
            <SheetDescription className="text-right">
              أنت تعمل الآن داخل <span className="font-medium text-foreground">{currentCompanyName}</span>.
            </SheetDescription>
          </SheetHeader>

          <div className="max-h-[70vh] space-y-1 overflow-y-auto px-2 pt-2">
            {companies.map((company) => renderCompanyOption(company, true))}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={isSwitchingCompany}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex w-full items-center gap-3 rounded-xl border-2 border-blue-200 bg-white px-4 py-2.5 shadow-md transition-all hover:border-blue-400 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-blue-500"
      >
        <span className="flex items-center justify-center rounded-lg bg-blue-100 p-1.5 dark:bg-blue-900/50">
          <ArrowsRightLeftIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </span>

        <span className="flex-1 truncate text-right text-sm font-bold text-gray-900 dark:text-white">
          {currentCompany?.name || "الشركة"}
        </span>

        <span className="flex-shrink-0 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm dark:from-blue-500 dark:to-indigo-600">
          {companies.length}
        </span>

        {isSwitchingCompany ? (
          <div className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-400" />
        ) : (
          <ChevronDownIcon
            className={`h-4 w-4 flex-shrink-0 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white py-1 shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="px-4 pb-1.5 pt-2.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              اختر الشركة
            </p>
          </div>
          {companies.map((company) => renderCompanyOption(company))}
        </div>
      )}
    </div>
  );
};

export default CompanySwitcher;
