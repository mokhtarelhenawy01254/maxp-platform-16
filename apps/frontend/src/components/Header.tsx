import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../hooks/useAuthSimple";
import { useCompany } from "../contexts/CompanyContext";
import NotificationDropdown from "./notifications/NotificationDropdown";
import OrderNotificationBell from "./notifications/OrderNotificationBell";
import LanguageSwitcher from "./common/LanguageSwitcher";
import { envConfig } from "../config/environment";
import { CompanyLogo } from "./ui/CompanyLogo";
import {
  Bars3Icon,
  XMarkIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  ChatBubbleLeftRightIcon,
  BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import { buildStoreUrl } from "../utils/storeUrl";
import { hasStoreApp } from "../utils/storeShortcut";
import HeaderWalletShortcut from "./wallet/HeaderWalletShortcut";
import AppUpdateIndicator from "./common/AppUpdateIndicator";

import { useTimer } from "../contexts/TimerContext";
import { PlayIcon, PauseIcon, StopIcon } from "@heroicons/react/24/solid";

const GlobalTimer: React.FC = () => {
  const {
    activeTimer,
    activeTimers,
    elapsedSeconds,
    elapsedSecondsByTask,
    stopTimer,
    pauseTimer,
    resumeTimer,
  } = useTimer();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  if (activeTimers.length === 0) return null;

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const otherCount = activeTimers.length - 1;

  return (
    <div className="relative hidden md:block">
      {/* Main timer pill */}
      <div
        className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-full border border-indigo-100 dark:border-indigo-800 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex flex-col">
          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 font-mono">
            {formatTime(elapsedSeconds)}
          </span>
          <span className="text-[10px] text-indigo-500 max-w-[100px] truncate">
            {activeTimer.taskTitle || "Dev Task"}
          </span>
        </div>

        {otherCount > 0 && (
          <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-indigo-500 rounded-full">
            {otherCount}+
          </span>
        )}

        <div className="flex items-center gap-1 border-r border-indigo-200 dark:border-indigo-700 pr-2 mr-1">
          {activeTimer.isPaused ? (
            <button
              onClick={(e) => { e.stopPropagation(); resumeTimer(activeTimer.taskId!); }}
              className="p-1 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-600"
              title="استئناف"
            >
              <PlayIcon className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); pauseTimer(activeTimer.taskId!); }}
              className="p-1 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-800 text-indigo-600"
              title="إيقاف مؤقت"
            >
              <PauseIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); stopTimer(activeTimer.taskId!); }}
            className="p-1 rounded-full hover:bg-red-200 dark:hover:bg-red-900/40 text-red-500"
            title="إنهاء"
          >
            <StopIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Dropdown for all timers */}
      {isOpen && activeTimers.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            <div className="p-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                جميع المؤقتات ({activeTimers.length})
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {activeTimers.map((timer) => {
                const secs = elapsedSecondsByTask[timer.taskId!] || 0;
                return (
                  <div
                    key={timer.id || timer.taskId}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-50 dark:border-gray-700/30 last:border-0"
                  >
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => {
                        navigate(`/super-admin/dev-tasks/${timer.taskId}`);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          {formatTime(secs)}
                        </span>
                        {timer.isPaused && (
                          <span className="text-[10px] text-yellow-500">⏸️</span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-600 dark:text-gray-400 truncate">
                        {timer.taskTitle || "بدون عنوان"}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {timer.isPaused ? (
                        <button
                          onClick={() => resumeTimer(timer.taskId!, timer.id || undefined)}
                          className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                          title="استئناف"
                        >
                          <PlayIcon className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => pauseTimer(timer.taskId!, timer.id || undefined)}
                          className="p-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600"
                          title="إيقاف مؤقت"
                        >
                          <PauseIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => stopTimer(timer.taskId!, timer.id || undefined)}
                        className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                        title="إنهاء"
                      >
                        <StopIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Header: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { company } = useCompany();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Parse company settings if they are a string, otherwise use directly
  const getCompanySettings = () => {
    if (!company?.settings) return {};
    if (typeof company.settings === "string") {
      try {
        return JSON.parse(company.settings);
      } catch (e) {
        return {};
      }
    }
    return company.settings;
  };

  const settings = getCompanySettings();
  const showSearchInHeader = settings.showOrderSearchInHeader !== false;

  const storeUrl = React.useMemo(() => {
    const slug = user?.company?.slug || company?.slug || "";
    const customDomain = user?.company?.customDomain || company?.customDomain;
    const companyId = user?.companyId || user?.company?.id || company?.id;
    return buildStoreUrl(slug, "/shop", customDomain || undefined, companyId || undefined);
  }, [user, company]);

  const isStoreActive = React.useMemo(() => {
    const activeApps = user?.company?.activeApps || company?.activeApps;
    return hasStoreApp(activeApps as string[]);
  }, [user, company]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/orders?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/auth/login");
  };

  const navigation = [
    { name: t("header.dashboard"), href: "/company-dashboard" },
    { name: t("header.customers"), href: "/customers" },
    { name: t("header.conversations"), href: "/conversations" },
    { name: t("header.products"), href: "/products" },
    { name: t("header.orders"), href: "/orders" },
    { name: t("header.reports"), href: "/analytics/orders" },
  ];

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 z-50 relative">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center">
            {/* Logo */}
            <Link to="/company-dashboard" className="flex items-center">
              <CompanyLogo
                src={user?.company?.logo}
                alt={user?.company?.name}
                className="h-10 w-10 rounded-lg object-cover shadow-sm border border-gray-200 dark:border-gray-600"
                companyName={user?.company?.name}
              >
                <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <svg
                    className="h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
              </CompanyLogo>
              <div className="mr-3">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {user?.company?.name || t("header.platformName")}
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8 space-x-reverse mr-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side - Language, Notifications and Profile */}
          <div className="flex items-center space-x-4 space-x-reverse">
            {/* Order Search */}
            {showSearchInHeader && (
              <form onSubmit={handleSearch} className="hidden sm:flex items-center">
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("header.searchOrders", "بحث عن طلب...")}
                    className="block w-36 sm:w-48 xl:w-64 rounded-full border-0 py-1.5 pr-9 pl-3 text-sm leading-6 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:placeholder:text-gray-400 transition-all duration-300"
                  />
                </div>
              </form>
            )}

            {/* Quick Wallet Recharge Shortcut Button with Live Balance */}
            <HeaderWalletShortcut />

            {/* Visit Store Button */}
            {isStoreActive && (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={t("header.visitStore", "المتجر")}
                aria-label={t("header.visitStore", "المتجر")}
              >
                <BuildingStorefrontIcon className="h-5 w-5" />
              </a>
            )}

            {/* Global Timer */}
            <GlobalTimer />

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* New Orders Bell */}
            <OrderNotificationBell />

            {/* Update Indicator */}
            <AppUpdateIndicator />

            {/* Notifications */}
            <NotificationDropdown />

            {/* Support - WhatsApp */}
            <a
              href="https://wa.me/201123087745"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="تواصل عبر واتساب"
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5" />
            </a>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center space-x-2 space-x-reverse text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-indigo-700">
                    {user?.firstName?.charAt(0)}
                    {user?.lastName?.charAt(0)}
                  </span>
                </div>
                <div className="hidden md:block text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.role}
                  </div>
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black dark:ring-gray-600 ring-opacity-5 z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-700">
                      <div className="font-medium">
                        {user?.firstName} {user?.lastName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {user?.email}
                      </div>
                      <div className="text-xs text-indigo-600 dark:text-indigo-400">
                        {user?.company?.name}
                      </div>
                    </div>

                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <UserCircleIcon className="h-4 w-4 ml-2" />
                      {t("header.profile")}
                    </Link>

                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <Cog6ToothIcon className="h-4 w-4 ml-2" />
                      {t("header.settings")}
                    </Link>

                    <div className="border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <ArrowRightOnRectangleIcon className="h-4 w-4 ml-2" />
                        {t("header.logout")}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isMobileMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200 dark:border-gray-700">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              {showSearchInHeader && (
                <form onSubmit={handleSearch} className="px-3 py-2">
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t("header.searchOrders", "بحث عن طلب...")}
                      className="block w-full rounded-full border-0 py-1.5 pr-9 pl-3 text-sm leading-6 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:bg-gray-700 dark:text-white dark:ring-gray-600 dark:placeholder:text-gray-400"
                    />
                  </div>
                </form>
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                <Link
                  to="/profile"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t("header.profile")}
                </Link>

                <Link
                  to="/settings"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t("header.settings")}
                </Link>

                <button
                  onClick={handleLogout}
                  className="block w-full text-right px-3 py-2 rounded-md text-base font-medium text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  {t("header.logout")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Overlay for mobile menu */}
      {(isProfileMenuOpen || isMobileMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsProfileMenuOpen(false);
            setIsMobileMenuOpen(false);
          }}
        />
      )}
    </header>
  );
};

export default Header;
