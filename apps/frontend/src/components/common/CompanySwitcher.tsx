import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  Building2,
  Zap,
  Loader2,
} from "lucide-react";

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
    if (collapsed) return;

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
        className={`w-full text-right transition-colors disabled:opacity-50 ${
          isCurrent
            ? "bg-primary/10 text-primary"
            : "text-foreground hover:bg-muted/50"
        } ${mobile ? "px-4 py-3" : "px-3.5 py-2.5"}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={`truncate font-semibold ${mobile ? "text-sm" : "text-xs"}`}>
              {company.name}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {company.role || "شركة"}
            </p>
          </div>

          {isCurrent ? (
            <span className="flex items-center justify-center rounded-full bg-primary text-primary-foreground p-0.5">
              <Check className="size-3" />
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
          className="flex min-w-0 max-w-[7.75rem] items-center gap-2 rounded-lg border border-border/70 bg-card px-2.5 py-2 text-right text-foreground transition-all hover:bg-muted/40 active:scale-[0.98] disabled:opacity-50"
          title={switcherLabel}
          aria-label={switcherLabel}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            {isSwitchingCompany ? (
              <Loader2 className="size-3.5 animate-spin text-primary" />
            ) : (
              <ArrowLeftRight className="size-3.5" />
            )}
          </span>

          <span className="min-w-0 flex-1 text-right">
            <span className="block truncate text-xs font-semibold leading-tight text-foreground">
              {currentCompanyName}
            </span>
            <span className="block truncate text-[10px] text-muted-foreground font-mono tabular-nums">
              {companies.length} شركات
            </span>
          </span>

          <span className="inline-flex min-h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-md bg-muted px-1 text-[10px] font-semibold text-muted-foreground font-mono tabular-nums">
            {companies.length}
          </span>
        </button>

        <SheetContent
          side="bottom"
          className="gap-0 rounded-t-xl px-0 pb-6 bg-card border-t border-border/70"
          showCloseButton={false}
        >
          <SheetHeader className="border-b border-border/60 px-5 pb-3 pt-2 text-right">
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <SheetTitle className="flex items-center gap-2 text-sm text-right text-foreground">
              <Building2 className="size-4 text-primary" />
              تبديل الشركة
            </SheetTitle>
            <SheetDescription className="text-xs text-right text-muted-foreground">
              تعمل الآن داخل <span className="font-semibold text-foreground">{currentCompanyName}</span>
            </SheetDescription>
          </SheetHeader>

          <div className="max-h-[60vh] divide-y divide-border/40 overflow-y-auto">
            {companies.map((company) => renderCompanyOption(company, true))}
            {user?.role === 'SUPER_ADMIN' && (
              <div className="border-t border-border/60 p-3">
                <Link
                  to="/super-admin/companies-v2"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-all no-underline"
                >
                  <span>إدارة جميع شركات المنصة (Super Admin)</span>
                  <Zap className="size-3.5" />
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
        className={`flex w-full items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-right transition-all disabled:opacity-50 ${
          isOpen
            ? "border-primary ring-1 ring-primary/40 shadow-xs"
            : "border-border/70 hover:border-border hover:bg-muted/30"
        }`}
      >
        <span className="flex items-center justify-center rounded-md bg-primary/10 p-1.5 text-primary">
          <ArrowLeftRight className="size-3.5" />
        </span>

        <span className="flex-1 truncate text-xs font-semibold text-foreground">
          {currentCompany?.name || "الشركة"}
        </span>

        <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground font-mono tabular-nums">
          {companies.length}
        </span>

        {isSwitchingCompany ? (
          <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
        ) : (
          <ChevronDown
            className={`size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {isOpen && (
        <div className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border/70 bg-card py-1 shadow-xl animate-in fade-in zoom-in-95 duration-100 divide-y divide-border/40">
          <div className="px-3.5 py-2 bg-muted/30">
            <p className="text-[11px] font-semibold text-muted-foreground">
              اختر الشركة
            </p>
          </div>
          <div className="divide-y divide-border/30 max-h-64 overflow-y-auto">
            {companies.map((company) => renderCompanyOption(company))}
          </div>
          {user?.role === 'SUPER_ADMIN' && (
            <div className="p-2 bg-muted/20">
              <Link
                to="/super-admin/companies-v2"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 transition-all no-underline"
              >
                <span>إدارة جميع شركات المنصة (Super Admin)</span>
                <Zap className="size-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CompanySwitcher;
