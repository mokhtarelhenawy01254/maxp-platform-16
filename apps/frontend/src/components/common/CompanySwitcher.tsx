import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
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

  if (user?.role !== 'SUPER_ADMIN' && (!user?.hasMultipleCompanies || companies.length <= 1)) {
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
        className={`w-full text-right transition-all disabled:opacity-50 ${
          isCurrent
            ? "bg-violet-50 text-violet-900 dark:bg-violet-900/30 dark:text-violet-200"
            : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5"
        } ${mobile ? "px-5 py-4" : "px-4 py-2.5"}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={`truncate font-semibold ${mobile ? "text-base" : "text-sm"}`}>
              {company.name}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {company.role || "شركة"}
            </p>
          </div>

          {isCurrent ? (
            <span className="flex items-center justify-center rounded-full bg-violet-600 p-0.5 dark:bg-violet-500">
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
          className="flex min-w-0 max-w-[7.75rem] items-center gap-2 rounded-xl border border-gray-200 bg-white px-2.5 py-2 text-right text-violet-600 transition-all hover:border-violet-200 hover:bg-violet-50/50 active:scale-[0.98] disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-violet-400 dark:hover:border-violet-800 dark:hover:bg-violet-900/20"
          title={switcherLabel}
          aria-label={switcherLabel}
        >
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-900/40 dark:text-violet-400">
            {isSwitchingCompany ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent dark:border-violet-400" />
            ) : (
              <ArrowsRightLeftIcon className="h-3.5 w-3.5" />
            )}
          </span>

          <span className="min-w-0 flex-1 text-right">
            <span className="block truncate text-xs font-semibold leading-tight text-gray-900 dark:text-white">
              {currentCompanyName}
            </span>
            <span className="block truncate text-[10px] text-gray-500 dark:text-gray-400">
              {companies.length} شركات
            </span>
          </span>

          <span className="inline-flex min-h-[18px] min-w-[18px] flex-shrink-0 items-center justify-center rounded-md bg-gray-100 px-1 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {companies.length}
          </span>
        </button>

        <SheetContent
          side="bottom"
          className="gap-0 rounded-t-2xl px-0 pb-6"
          showCloseButton={false}
        >
          <SheetHeader className="border-b border-gray-100 px-5 pb-3 pt-2 text-right dark:border-gray-800">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
            <SheetTitle className="flex items-center gap-2 text-base text-right">
              <BuildingOfficeIcon className="h-4 w-4 text-violet-500" />
              تبديل الشركة
            </SheetTitle>
            <SheetDescription className="text-sm text-right text-gray-500">
              تعمل الآن داخل <span className="font-medium text-gray-900 dark:text-white">{currentCompanyName}</span>
            </SheetDescription>
          </SheetHeader>

          <div className="max-h-[70vh] space-y-0.5 overflow-y-auto pt-1">
            {companies.map((company) => renderCompanyOption(company, true))}
            {user?.role === 'SUPER_ADMIN' && (
              <div className="border-t border-gray-100 p-3 dark:border-gray-800">
                <Link
                  to="/super-admin/companies-v2"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between rounded-xl bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-all no-underline"
                >
                  <span>إدارة جميع شركات المنصة (Super Admin)</span>
                  <span>⚡</span>
                </Link>
              </div>
            )}
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
        className={`flex w-full items-center gap-2.5 rounded-xl border bg-white px-3 py-2 text-right transition-all disabled:opacity-50 dark:bg-gray-800 ${
          isOpen
            ? "border-violet-200 shadow-sm dark:border-violet-800"
            : "border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600"
        }`}
      >
        <span className="flex items-center justify-center rounded-lg bg-violet-50 p-1.5 dark:bg-violet-900/30">
          <ArrowsRightLeftIcon className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
        </span>

        <span className="flex-1 truncate text-sm font-semibold text-gray-900 dark:text-white">
          {currentCompany?.name || "الشركة"}
        </span>

        <span className="flex-shrink-0 rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
          {companies.length}
        </span>

        {isSwitchingCompany ? (
          <div className="h-3.5 w-3.5 flex-shrink-0 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
        ) : (
          <ChevronDownIcon
            className={`h-3.5 w-3.5 flex-shrink-0 text-gray-400 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-100 px-4 py-2 dark:border-gray-700/50">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500">
              اختر الشركة
            </p>
          </div>
          {companies.map((company) => renderCompanyOption(company))}
          {user?.role === 'SUPER_ADMIN' && (
            <div className="border-t border-gray-100 p-2 dark:border-gray-700/50">
              <Link
                to="/super-admin/companies-v2"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between rounded-lg bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-all no-underline"
              >
                <span>إدارة جميع شركات المنصة (Super Admin)</span>
                <span>⚡</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanySwitcher;
