import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PlusIcon } from "@heroicons/react/24/outline";

interface CustomerListEmptyStateProps {
  isAdmin: boolean;
}

export const CustomerListEmptyState: React.FC<CustomerListEmptyStateProps> = ({
  isAdmin,
}) => {
  const { t } = useTranslation();

  return (
    <div className="text-center py-12">
      <svg
        className="mx-auto h-12 w-12 text-zinc-400 dark:text-zinc-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
      <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {t("customers.noCustomers")}
      </h3>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        {t("customers.noCustomersDesc")}
      </p>
      {isAdmin && (
        <div className="mt-6">
          <Link
            to="/customers/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            <PlusIcon className="h-4 w-4" />
            <span>{t("customers.addCustomer")}</span>
          </Link>
        </div>
      )}
    </div>
  );
};
