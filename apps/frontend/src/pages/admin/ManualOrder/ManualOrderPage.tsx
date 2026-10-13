import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import ProductSearchColumn from "./components/ProductSearchColumn";
import CartColumn from "./components/CartColumn";
import CheckoutColumn from "./components/CheckoutColumn";
import { toast } from "sonner";
import { CartItem } from "./types";
import { apiClient } from "../../../services/apiClient";
import {
  InformationCircleIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { extractVariantDisplayDetails } from "./utils/variantAttributes";
import { useAuth } from "../../../hooks/useAuthSimple";

type MobilePanel = "products" | "cart" | "checkout";

interface ProductInput {
  id: string;
  name: string;
  price: number | string;
  image?: string;
  stock?: number;
  sku?: string;
  baseMarkup?: number;
}

interface VariantInput {
  id: string;
  sku?: string;
  price?: number | string;
  stock?: number;
  name?: string;
  image?: string;
  type?: string;
  color?: string;
  size?: string;
  metadata?: string;
  attributeValues?: Record<string, string>;
}

type ManualAccessState = {
  subscription: "ACTIVE" | "EXPIRED" | "NONE";
  installed: boolean;
};

const ManualOrderPage = () => {
  const { t, i18n } = useTranslation();
  const isEn = Boolean(i18n.language && i18n.language.startsWith("en"));
  const { user } = useAuth();
  const isAffiliate = user?.role === "AFFILIATE";
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activeMobilePanel, setActiveMobilePanel] =
    useState<MobilePanel>("products");
  const [access, setAccess] = useState<ManualAccessState | null>(null);
  const [accessLoading, setAccessLoading] = useState(true);

  // فحص وصول اشتراك الطلبات اليدوية (NONE مقفول / EXPIRED يكتب وأوردراته تتعلق)
  useEffect(() => {
    if (isAffiliate) {
      setAccess({ subscription: "ACTIVE", installed: true });
      setAccessLoading(false);
      return;
    }

    let cancelled = false;
    apiClient
      .get("/orders-enhanced/manual-access")
      .then((res) => {
        const data = (res as { data?: { data?: ManualAccessState } })?.data?.data;
        if (!cancelled) setAccess(data || { subscription: "NONE", installed: false });
      })
      .catch(() => {
        if (!cancelled) setAccess({ subscription: "NONE", installed: false });
      })
      .finally(() => {
        if (!cancelled) setAccessLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAffiliate]);

  // منع scroll من main
  useEffect(() => {
    const mainElement = document.querySelector("main");
    if (mainElement) {
      mainElement.style.overflow = "hidden";
      mainElement.style.padding = "0";
    }

    return () => {
      if (mainElement) {
        mainElement.style.overflow = "";
        mainElement.style.padding = "";
      }
    };
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT";

      // F1 - Show shortcuts
      if (e.key === "F1") {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
      }

      // F2 - Focus product search
      if (e.key === "F2") {
        e.preventDefault();
        const input = document.getElementById(
          "manual-order-product-search",
        ) as HTMLInputElement;
        if (input) input.focus();
      }

      // Escape
      if (e.key === "Escape") {
        (document.activeElement as HTMLElement)?.blur();
        setShowShortcuts(false);
      }

      // Ctrl + Delete (when not typing)
      if (!isTyping && e.ctrlKey && e.key === "Delete") {
        e.preventDefault();
        if (cartItems.length > 0) {
          setCartItems([]);
          toast.success(t("manualOrder.cartCleared"));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cartItems, t]);

  const handleAddToCart = (product: ProductInput, variant?: VariantInput) => {
    const itemId = variant
      ? `${product.id}-${variant.id}`
      : product.id;

    const existing = cartItems.find((item) => {
      if (variant) {
        return (
          item.productId === product.id &&
          item.variantId === variant.id
        );
      }
      return item.productId === product.id && !item.variantId;
    });

    if (existing) {
      toast.success(t("manualOrder.quantityIncreased"));
      setCartItems((prev) =>
        prev.map((item) => {
          const currentItemId = item.variantId
            ? `${item.productId}-${item.variantId}`
            : item.productId;

          return currentItemId === itemId
            ? { ...item, quantity: item.quantity + 1 }
            : item;
        }),
      );
    } else {
      toast.success(t("manualOrder.addedToCart"));

      const productPrice =
        typeof product.price === "string"
          ? parseFloat(product.price)
          : product.price || 0;

      const price = variant
        ? parseFloat(variant.price)
        : productPrice;

      const image =
        variant && variant.image ? variant.image : product.image;

      const stock = variant ? variant.stock : product.stock;
      const sku = variant ? variant.sku : product.sku;

      const variantDetails = extractVariantDisplayDetails(variant);

      const baseMarkup = product.baseMarkup || 0;

      setCartItems((prev) => [
        ...prev,
        {
          productId: product.id,
          variantId: variant?.id,
          name: product.name,
          price: price + baseMarkup,
          originalPrice: price,
          markup: baseMarkup,
          quantity: 1,
          image,
          stock,
          variantName: variantDetails.summary,
          color: variantDetails.color,
          size: variantDetails.size,
          sku,
        },
      ]);
    }

    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setActiveMobilePanel("cart");
    }
  };

  const handleUpdateItem = (
    productId: string,
    updates: Partial<CartItem>,
    variantId?: string,
  ) => {
    setCartItems((prev) =>
      prev.map((item) => {
        const isMatch = variantId
          ? item.productId === productId &&
            item.variantId === variantId
          : item.productId === productId && !item.variantId;

        return isMatch ? { ...item, ...updates } : item;
      }),
    );
  };

  const handleRemoveItem = (
    productId: string,
    variantId?: string,
  ) => {
    setCartItems((prev) =>
      prev.filter((item) => {
        const isMatch = variantId
          ? item.productId === productId &&
            item.variantId === variantId
          : item.productId === productId && !item.variantId;

        return !isMatch;
      }),
    );

    toast.success(t("manualOrder.productRemoved"));
  };

  const pageTitle = isAffiliate
    ? t("manualOrder.affiliateTitle", isEn ? "Create Manual Order as Affiliate" : "إنشاء طلب يدوي كمسوّق")
    : t("manualOrder.title", isEn ? "Manual Orders" : "الطلبات اليدوية");
  const pageSubtitle = isAffiliate
    ? t("manualOrder.affiliateSubtitle", isEn ? "Create direct orders for your customers and track your commissions per order" : "إنشاء طلبات مباشرة لعملائك ومتابعة عمولاتك الخاصة بكل طلب")
    : t("manualOrder.adminSubtitle", isEn ? "Create and confirm direct customer orders and quickly allocate them to inventory and shipping" : "إنشاء وتأكيد طلبات العملاء المباشرة وإسنادها بسرعة للمخزون والشحن");

  const mobilePanels = [
    {
      id: "products" as const,
      label: t("manualOrder.productsStep", isEn ? "Products" : "المنتجات"),
      icon: ShoppingBagIcon,
    },
    {
      id: "cart" as const,
      label: t("manualOrder.cartStep", isEn ? "Cart" : "السلة"),
      icon: ShoppingCartIcon,
      count: cartItems.length,
    },
    {
      id: "checkout" as const,
      label: t("manualOrder.checkoutStep", isEn ? "Order Details" : "بيانات الطلب"),
      icon: UserCircleIcon,
    },
  ];

  if (accessLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        {isEn ? "Checking subscription..." : "جاري التحقق من الاشتراك..."}
      </div>
    );
  }

  if (access?.subscription === "NONE") {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t("manualOrder.title", isEn ? "Manual Orders" : "الطلبات اليدوية")}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isEn
              ? "This feature requires activating a dedicated app. Activate the 'Manual Orders' app from the app store to proceed."
              : "هذه الميزة تتطلب تفعيل تطبيق مخصص. فعّل تطبيق \"الطلبات اليدوية\" من متجر التطبيقات للمتابعة."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative flex h-[calc(100dvh-64px)] min-h-[560px] flex-col overflow-y-auto bg-slate-50/70 p-2.5 dark:bg-gray-950 sm:p-3 lg:h-[calc(100dvh-64px)]"
      dir={isEn ? "ltr" : "rtl"}
    >
      {access?.subscription === "EXPIRED" ? (
        <div className="mb-2.5 shrink-0 rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200 shadow-2xs">
          {isEn ? (
            <>
              Your Manual Orders subscription has expired. You can still create new orders, but if your wallet balance is zero, they will be <b className="font-semibold">held (hidden)</b> on the orders page until you renew.
            </>
          ) : (
            <>
              اشتراك الطلبات اليدوية منتهي. يمكنك إنشاء أوردرات جديدة، لكن لو رصيد المحفظة صفر ستكون <b className="font-semibold">معلّقة (مخفية)</b> في صفحة الطلبات حتى تجدّد اشتراكك.
            </>
          )}
        </div>
      ) : null}

      <header className="mb-2.5 flex shrink-0 items-center justify-between gap-3 px-1">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-slate-950 dark:text-white sm:text-lg">
              {pageTitle}
            </h1>
            <span className="hidden sm:inline-flex items-center rounded-md border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-0.5 text-[10px] font-mono text-slate-500">
              POS v2
            </span>
          </div>
          <p className="mt-0.5 max-w-2xl text-xs text-slate-500 dark:text-slate-400 truncate">
            {pageSubtitle}
          </p>
        </div>

        <button
          onClick={() => setShowShortcuts((prev) => !prev)}
          className="shrink-0 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 text-slate-500 transition-all hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 shadow-2xs active:scale-[0.98]"
          title={`${t("manualOrder.keyboardShortcuts", isEn ? "Keyboard Shortcuts" : "اختصارات لوحة المفاتيح")} (F1)`}
        >
          <InformationCircleIcon className="h-4 w-4" />
        </button>
      </header>

      <div className="mb-2.5 grid shrink-0 grid-cols-3 gap-1.5 rounded-xl border border-slate-200/80 bg-white p-1 shadow-2xs dark:border-gray-800 dark:bg-gray-900 lg:hidden">
        {mobilePanels.map((panel) => {
          const Icon = panel.icon;
          const isActive = activeMobilePanel === panel.id;

          return (
            <button
              key={panel.id}
              type="button"
              onClick={() => setActiveMobilePanel(panel.id)}
              className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-gray-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{panel.label}</span>
              {typeof panel.count === "number" && panel.count > 0 && (
                <span
                  className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-mono ${
                    isActive
                      ? "bg-white/20 text-white dark:bg-black/10 dark:text-slate-900"
                      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  {panel.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <div
          className="fixed inset-0 z-50 bg-black/50 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            dir={isEn ? "ltr" : "rtl"}
          >
            <div className="p-4 border-b bg-gray-50 dark:bg-gray-900">
              <h3 className="font-bold">
                {t("manualOrder.keyboardShortcuts", isEn ? "Keyboard Shortcuts" : "اختصارات لوحة المفاتيح")}
              </h3>
            </div>

            <div className="p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span>{t("manualOrder.showShortcuts", isEn ? "Show Shortcuts" : "عرض الاختصارات")}</span>
                <kbd>F1</kbd>
              </div>
              <div className="flex justify-between">
                <span>{t("manualOrder.searchProduct", isEn ? "Search Product" : "البحث عن منتج")}</span>
                <kbd>F2</kbd>
              </div>
              <div className="flex justify-between">
                <span>{t("manualOrder.clearCart", isEn ? "Clear Cart" : "إفراغ السلة")}</span>
                <span>Ctrl + Delete</span>
              </div>
              <div className="flex justify-between">
                <span>{t("manualOrder.closeCancel", isEn ? "Close / Cancel" : "إغلاق / إلغاء")}</span>
                <kbd>Esc</kbd>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
              <button
                onClick={() => setShowShortcuts(false)}
                className="w-full py-2 bg-blue-600 text-white rounded-lg"
              >
                {t("manualOrder.ok", isEn ? "OK" : "حسناً")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-3 overflow-y-auto lg:gap-4">
        <div
          className={`col-span-12 min-h-0 overflow-y-auto lg:col-span-5 ${
            activeMobilePanel === "products" ? "block" : "hidden lg:block"
          }`}
        >
          <ProductSearchColumn
            mode={isAffiliate ? "affiliate" : "admin"}
            onAddToCart={handleAddToCart}
          />
        </div>

        <div
          className={`col-span-12 min-h-0 overflow-y-auto lg:col-span-3 ${
            activeMobilePanel === "cart" ? "block" : "hidden lg:block"
          }`}
        >
          <CartColumn
            items={cartItems}
            onUpdateItem={handleUpdateItem}
            onRemoveItem={handleRemoveItem}
          />
        </div>

        <div
          className={`col-span-12 min-h-0 overflow-y-auto lg:col-span-4 ${
            activeMobilePanel === "checkout" ? "block" : "hidden lg:block"
          }`}
        >
          <CheckoutColumn
            cartItems={cartItems}
            onClearCart={() => setCartItems([])}
          />
        </div>
      </div>
    </div>
  );
};

export default ManualOrderPage;
