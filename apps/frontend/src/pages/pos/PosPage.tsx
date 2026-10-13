import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  RotateCcw,
  Maximize,
  Minimize,
  Image as ImageIcon,
  Loader2,
  Printer,
  FileText,
  X,
  Clock,
  DollarSign,
  Package,
  TrendingUp,
  Banknote,
  Check,
  Sun,
  Moon,
  Coffee,
  Bookmark,
  Flame,
  Percent,
  Gift,
  Sliders,
} from "lucide-react";
import { config } from "../../config";
import { authService } from "../../services/authService";
import { companyAwareApi } from "../../services/companyAwareApi";
import { useTheme } from "../../hooks/useTheme";
import {
  buildOptimizedUploadImageUrl,
  buildResponsiveUploadImage,
  getImageCandidates,
} from "../../utils/imageUrl";
import ItemModifierModal, { ModifierGroupItem, ModifierOptionItem } from "./ItemModifierModal";

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  category: string;
  stock: number;
  sku: string;
  trackInventory?: boolean;
}
interface CartItem extends Product {
  cartItemId?: string;
  qty: number;
  selectedModifiers?: ModifierOptionItem[];
  itemNotes?: string;
}
interface Customer {
  id: string;
  name: string;
  phone: string;
}
interface ShiftData {
  startTime: Date;
  totalSales: number;
  totalOrders: number;
  totalItems: number;
  cashPayments: number;
  orders: Array<{ orderNumber: string; total: number; paymentMethod: string }>;
}
interface LastOrder {
  orderNumber: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  discount?: number;
  discountType?: string;
  customer: Customer | null;
  date: Date;
  paymentMethod: string;
  cashReceived?: number;
  change?: number;
  splitDetails?: { cash: number; card: number };
}

interface OpenTab {
  id: string;
  name: string;
  items: CartItem[];
  customer: Customer | null;
  createdAt: string;
  subtotal?: number;
  total?: number;
  kotPrintedAt?: string | null;
}

interface PosApiProduct {
  id: string;
  name: string;
  price: number | string;
  sku?: string | null;
  category?: { name?: string | null } | null;
  mainImage?: unknown;
  image?: unknown;
  images?: unknown;
  stock?: number | string | null;
  trackInventory?: boolean | null;
}

interface PosProductImageProps {
  candidates: string[];
  alt: string;
  className: string;
  fallback: ReactNode;
  requestedWidth: number;
  responsiveWidths?: number[];
  responsiveSizes?: string;
  imageQuality?: number;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
}

const safeJsonParse = <T,>(str: string | null, def: T): T => {
  try {
    return str ? (JSON.parse(str) as T) : def;
  } catch {
    return def;
  }
};

const PosProductImage = ({
  candidates,
  alt,
  className,
  fallback,
  requestedWidth,
  responsiveWidths,
  responsiveSizes,
  imageQuality = 72,
  loading = "lazy",
  fetchPriority = "low",
}: PosProductImageProps) => {
  const normalizedCandidates = useMemo(
    () =>
      candidates
        .map((candidate) => candidate.trim())
        .filter(Boolean),
    [candidates],
  );
  const candidatesKey = normalizedCandidates.join("|");
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [useOriginalCandidate, setUseOriginalCandidate] = useState(false);

  useEffect(() => {
    setCandidateIndex(0);
    setUseOriginalCandidate(false);
  }, [candidatesKey]);

  useEffect(() => {
    setUseOriginalCandidate(false);
  }, [candidateIndex]);

  const activeCandidate = normalizedCandidates[candidateIndex];
  const imageProps = useMemo(() => {
    if (!activeCandidate) {
      return { src: "", srcSet: undefined, sizes: undefined };
    }

    if (useOriginalCandidate) {
      return { src: activeCandidate, srcSet: undefined, sizes: undefined };
    }

    if (responsiveWidths?.length && responsiveSizes) {
      return buildResponsiveUploadImage(activeCandidate, {
        widths: responsiveWidths,
        fallbackWidth: requestedWidth,
        sizes: responsiveSizes,
        quality: imageQuality,
      });
    }

    return {
      src: buildOptimizedUploadImageUrl(activeCandidate, {
        width: requestedWidth,
        quality: imageQuality,
      }),
      srcSet: undefined,
      sizes: undefined,
    };
  }, [
    activeCandidate,
    imageQuality,
    requestedWidth,
    responsiveSizes,
    responsiveWidths,
    useOriginalCandidate,
  ]);

  if (!activeCandidate) {
    return <>{fallback}</>;
  }

  const priorityProps = fetchPriority ? { fetchpriority: fetchPriority } : {};

  return (
    <img
      {...priorityProps}
      src={imageProps.src}
      srcSet={imageProps.srcSet}
      sizes={imageProps.sizes}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
      onError={() => {
        if (!useOriginalCandidate && imageProps.src !== activeCandidate) {
          setUseOriginalCandidate(true);
          return;
        }

        setUseOriginalCandidate(false);
        setCandidateIndex((currentIndex) => currentIndex + 1);
      }}
    />
  );
};

const PosPage = () => {
  const { t, i18n } = useTranslation();
  const { actualTheme, toggleTheme } = useTheme();
  const isDark = actualTheme === "dark";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(t("posPage.all"));
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [categories, setCategories] = useState<string[]>([t("posPage.all")]);
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [showShiftReport, setShowShiftReport] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [shiftData, setShiftData] = useState<ShiftData>(() => {
    const saved = localStorage.getItem("pos_shift_data");
    if (saved) {
      const parsed = safeJsonParse<ShiftData | null>(saved, null);
      if (parsed) return { ...parsed, startTime: new Date(parsed.startTime) };
    }
    return {
      startTime: new Date(),
      totalSales: 0,
      totalOrders: 0,
      totalItems: 0,
      cashPayments: 0,
      orders: [],
    };
  });
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "SPLIT">("CASH");
  const [cashReceived, setCashReceived] = useState(0);
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const barcodeBuffer = useRef("");
  const barcodeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modifiers state
  const [modifierGroups, setModifierGroups] = useState<ModifierGroupItem[]>([]);
  const [selectedProductForModifier, setSelectedProductForModifier] = useState<Product | null>(null);
  const [showModifierModal, setShowModifierModal] = useState(false);

  // Open Tabs / Cafe Tables State (Cloud + Local fallback)
  const [openTabs, setOpenTabs] = useState<OpenTab[]>(() => {
    const saved = localStorage.getItem("pos_open_tabs");
    return saved ? safeJsonParse<OpenTab[]>(saved, []) : [];
  });
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [activeTabName, setActiveTabName] = useState<string | null>(null);
  const [showParkModal, setShowParkModal] = useState(false);
  const [parkTableName, setParkTableName] = useState("");

  // KOT state
  const [kotFiring, setKotFiring] = useState(false);
  const [kotSuccessNotice, setKotSuccessNotice] = useState<string | null>(null);

  // Discount state
  const [discountType, setDiscountType] = useState<"NONE" | "PERCENT" | "VIP_COMP">("NONE");
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  const fetchCloudTabs = useCallback(async () => {
    try {
      const res = await companyAwareApi.get<any>("/cafe/tables");
      if (res.data?.success && Array.isArray(res.data.data)) {
        const mapped: OpenTab[] = res.data.data.map((t: any) => ({
          id: t.id,
          name: t.tableName,
          items: Array.isArray(t.items) ? t.items : [],
          customer: t.customerName ? { id: "guest", name: t.customerName, phone: t.customerPhone || "" } : null,
          createdAt: t.createdAt,
          subtotal: t.subtotal,
          total: t.total,
          kotPrintedAt: t.kotPrintedAt
        }));
        setOpenTabs(mapped);
        localStorage.setItem("pos_open_tabs", JSON.stringify(mapped));
      }
    } catch {
      // offline fallback
    }
  }, []);

  const fetchModifiers = useCallback(async () => {
    try {
      const res = await companyAwareApi.get<any>("/cafe/modifiers");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setModifierGroups(res.data.data);
      }
    } catch {
      // non-cafe tenant or offline
    }
  }, []);

  const handleParkCart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart.length) return;
    const tabName = parkTableName.trim() || activeTabName || `طاولة ${openTabs.length + 1}`;

    try {
      await companyAwareApi.post("/cafe/tables", {
        tabId: activeTabId || undefined,
        tableName: tabName,
        items: cart,
        subtotal,
        tax,
        total,
        customerName: customer?.name,
        customerPhone: customer?.phone
      });
      await fetchCloudTabs();
    } catch {
      const newTab: OpenTab = {
        id: activeTabId || "tab_" + Date.now(),
        name: tabName,
        items: [...cart],
        customer: customer,
        createdAt: new Date().toISOString(),
        subtotal,
        total
      };
      const updated = activeTabId
        ? openTabs.map((t) => (t.id === activeTabId ? newTab : t))
        : [...openTabs, newTab];
      setOpenTabs(updated);
      localStorage.setItem("pos_open_tabs", JSON.stringify(updated));
    }

    setCart([]);
    setCustomer(null);
    setActiveTabId(null);
    setActiveTabName(null);
    setShowParkModal(false);
    setParkTableName("");
    setDiscountType("NONE");
    setDiscountPercent(0);
  };

  const handleRestoreTab = (tab: OpenTab) => {
    if (cart.length > 0 && !window.confirm("هناك طلب حالي في السلة. هل تريد استبداله بهذه الطاولة؟")) {
      return;
    }
    setCart(tab.items);
    setCustomer(tab.customer);
    setActiveTabId(tab.id);
    setActiveTabName(tab.name);
  };

  const handleDeleteTab = async (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("هل تريد إلغاء هذه الطاولة المعلقة وحذفها؟")) return;
    try {
      await companyAwareApi.delete(`/cafe/tables/${tabId}`);
    } catch {
      // offline
    }
    const updated = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(updated);
    localStorage.setItem("pos_open_tabs", JSON.stringify(updated));
    if (activeTabId === tabId) {
      setActiveTabId(null);
      setActiveTabName(null);
    }
  };

  const handleUnlinkTab = () => {
    setActiveTabId(null);
    setActiveTabName(null);
  };

  const fireKitchenTicket = async () => {
    if (!cart.length) return;
    setKotFiring(true);
    try {
      if (activeTabId) {
        await companyAwareApi.post(`/cafe/tables/${activeTabId}/fire-kot`, {});
      }

      const locale = i18n.language === "ar" ? "ar-EG" : "en-US";
      const w = window.open("", "", "width=400,height=550");
      if (w) {
        w.document.write(
          '<html dir="rtl"><head><title>تذكرة بار / مطبخ</title><style>body{font:13px monospace;max-width:280px;margin:auto;padding:15px;color:#000}.c{text-align:center}.r{display:flex;justify-content:space-between;margin:5px 0;font-weight:bold;font-size:14px}.mod{font-size:11px;color:#555;padding-right:8px}.note{font-size:11px;color:#c00;padding-right:8px;font-style:italic}.hr{border-top:2px dashed #000;margin:8px 0}</style></head><body>'
        );
        w.document.write(
          '<div class="c"><h2 style="margin:0;font-size:16px">تذكرة تجهيز بار / مطبخ</h2>' +
          (activeTabName ? '<h1 style="margin:4px 0;font-size:20px;border:1px solid #000;padding:4px">' + activeTabName + '</h1>' : '<h3 style="margin:4px 0">طلب صالة / سفري</h3>') +
          '<p style="margin:0;font-size:11px">' + new Date().toLocaleTimeString(locale) + '</p></div><div class="hr"></div>'
        );
        cart.forEach((i) => {
          w.document.write(
            '<div class="r"><span>' + i.name + '</span><span>x ' + i.qty + '</span></div>'
          );
          if (i.selectedModifiers && i.selectedModifiers.length > 0) {
            i.selectedModifiers.forEach((m) => {
              w.document.write('<div class="mod">+ ' + m.name + (m.additionalPrice > 0 ? ' (+' + m.additionalPrice + ')' : '') + '</div>');
            });
          }
          if (i.itemNotes) {
            w.document.write('<div class="note">ملاحظة: ' + i.itemNotes + '</div>');
          }
        });
        w.document.write(
          '<div class="hr"></div><p class="c" style="font-size:10px;margin:4px 0">يرجى سرعة التجهيز والتقديم</p></body></html>'
        );
        w.document.close();
        setTimeout(() => {
          w.print();
          w.close();
        }, 300);
      }

      setKotSuccessNotice("تم إرسال تذكرة التحضير للبار بنجاح");
      setTimeout(() => setKotSuccessNotice(null), 3500);
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء إرسال تذكرة البار");
    } finally {
      setKotFiring(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const token = authService.getAccessToken();
        const headers: HeadersInit = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = "Bearer " + token;
        const params = new URLSearchParams({
          page: "1",
          limit: "200",
        });
        const res = await fetch(
          `${config.apiUrl}/products?${params.toString()}`,
          { headers },
        );
        const data: { success?: boolean; data?: PosApiProduct[] } =
          await res.json();
        if (data.success && data.data) {
          const prods = data.data.map((p) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price),
            sku: p.sku || "",
            category: p.category?.name || t("posPage.notSpecified"),
            images: getImageCandidates(p.mainImage, p.image, p.images),
            stock: Number(p.stock || 0),
            trackInventory: p.trackInventory !== false,
          }));
          setProducts(prods);
          setCategories([
            t("posPage.all"),
            ...(Array.from(
              new Set(prods.map((product) => product.category)),
            ) as string[]),
          ]);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
    fetchCloudTabs();
    fetchModifiers();
  }, [fetchCloudTabs, fetchModifiers]);

  const rawSubtotal = cart.reduce((a, i) => a + i.price * i.qty, 0);
  const discountAmount = useMemo(() => {
    if (discountType === "VIP_COMP") return rawSubtotal;
    if (discountType === "PERCENT" && discountPercent > 0) {
      return Math.round((rawSubtotal * discountPercent) / 100);
    }
    return 0;
  }, [rawSubtotal, discountType, discountPercent]);

  const subtotal = Math.max(0, rawSubtotal - discountAmount);
  const tax = subtotal * 0.14;
  const total = subtotal + tax;
  const change = paymentMethod === "CASH" ? cashReceived - total : 0;

  const filtered = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      (p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)) &&
      (selectedCategory === t("posPage.all") || p.category === selectedCategory)
    );
  });

  const addToCart = (p: Product) => {
    if (p.trackInventory !== false && p.stock <= 0) return alert(t("posPage.notAvailable"));
    if (modifierGroups.length > 0) {
      setSelectedProductForModifier(p);
      setShowModifierModal(true);
    } else {
      addToCartDirect(p);
    }
  };

  const addToCartDirect = (p: Product) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.id === p.id && (!i.selectedModifiers || i.selectedModifiers.length === 0));
      if (ex) {
        if (p.trackInventory !== false && ex.qty >= p.stock) return prev;
        return prev.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...p, qty: 1 }];
    });
  };

  const handleModifierConfirm = (
    product: any,
    selectedModifiers: ModifierOptionItem[],
    notes: string,
    finalUnitPrice: number
  ) => {
    const uniqueCartId = `${product.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCartItem: CartItem = {
      ...product,
      id: uniqueCartId,
      cartItemId: uniqueCartId,
      price: finalUnitPrice,
      selectedModifiers,
      itemNotes: notes,
      qty: 1
    };
    setCart((prev) => [...prev, newCartItem]);
  };

  const updateQty = (id: string, d: number) =>
    setCart((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const maxQty = i.trackInventory === false ? 9999 : i.stock;
        return { ...i, qty: Math.max(1, Math.min(maxQty, i.qty + d)) };
      }),
    );
  const removeItem = (id: string) =>
    setCart((prev) => prev.filter((i) => i.id !== id));
  const clearCart = () => {
    if (cart.length > 0 && !window.confirm(t("posPage.clearCartConfirm"))) return;
    setCart([]);
    setCustomer(null);
    setActiveTabId(null);
    setActiveTabName(null);
    setDiscountType("NONE");
    setDiscountPercent(0);
  };

  const handleBarcode = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "Enter" && barcodeBuffer.current) {
        const sku = barcodeBuffer.current;
        const p = products.find((x) => x.sku === sku || x.id === sku);
        if (p) {
          if (p.trackInventory !== false && p.stock <= 0) {
            alert(t("posPage.notAvailable"));
          } else {
            addToCart(p);
          }
        } else {
          setSearchQuery(sku);
        }
        barcodeBuffer.current = "";
        if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
      } else if (e.key.length === 1 && !e.ctrlKey) {
        barcodeBuffer.current += e.key;
        if (barcodeTimeout.current) clearTimeout(barcodeTimeout.current);
        barcodeTimeout.current = setTimeout(() => {
          barcodeBuffer.current = "";
        }, 500);
      }
    },
    [products, modifierGroups],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleBarcode);
    return () => window.removeEventListener("keydown", handleBarcode);
  }, [handleBarcode]);

  useEffect(() => {
    const shortcuts = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "F4" && cart.length) {
        e.preventDefault();
        setShowPayment(true);
        setCashReceived(Math.ceil(total));
      }
      if (e.key === "Escape") {
        setShowPayment(false);
        setShowReceipt(false);
      }
    };
    window.addEventListener("keydown", shortcuts);
    return () => window.removeEventListener("keydown", shortcuts);
  }, [cart, total]);

  const checkout = async () => {
    if (!cart.length) return;
    if (paymentMethod === "CASH" && cashReceived < total) return;
    if (paymentMethod === "SPLIT" && (splitCash + splitCard < Math.floor(total))) return;

    setProcessing(true);
    try {
      const token = authService.getAccessToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = "Bearer " + token;

      const sanitizedCart = cart.map((i) => ({
        ...i,
        productId: i.id.includes("_") ? i.id.split("_")[0] : i.id
      }));

      const res = await fetch(config.apiUrl + "/pos/orders", {
        method: "POST",
        headers,
        body: JSON.stringify({
          cart: sanitizedCart,
          customer,
          paymentMethod,
          discount: discountAmount,
          discountType,
          splitDetails: paymentMethod === "SPLIT" ? { cash: splitCash, card: splitCard } : null,
          tableTabId: activeTabId || undefined,
          subtotal,
          tax,
          total,
          cashReceived: paymentMethod === "CASH" ? cashReceived : (paymentMethod === "SPLIT" ? splitCash : 0),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setLastOrder({
          orderNumber: data.data.orderNumber,
          items: [...cart],
          subtotal,
          tax,
          total,
          discount: discountAmount,
          discountType,
          customer,
          date: new Date(),
          paymentMethod,
          cashReceived: paymentMethod === "CASH" ? cashReceived : undefined,
          change: paymentMethod === "CASH" && change > 0 ? change : 0,
          splitDetails: paymentMethod === "SPLIT" ? { cash: splitCash, card: splitCard } : undefined,
        });

        const newShiftData = {
          ...shiftData,
          totalSales: shiftData.totalSales + total,
          totalOrders: shiftData.totalOrders + 1,
          totalItems: shiftData.totalItems + cart.reduce((a, i) => a + i.qty, 0),
          cashPayments:
            shiftData.cashPayments +
            (paymentMethod === "CASH" ? total : paymentMethod === "SPLIT" ? splitCash : 0),
          orders: [
            ...shiftData.orders,
            { orderNumber: data.data.orderNumber, total, paymentMethod },
          ],
        };
        setShiftData(newShiftData);
        localStorage.setItem("pos_shift_data", JSON.stringify(newShiftData));

        if (activeTabId) {
          const updatedTabs = openTabs.filter((t) => t.id !== activeTabId);
          setOpenTabs(updatedTabs);
          localStorage.setItem("pos_open_tabs", JSON.stringify(updatedTabs));
          setActiveTabId(null);
          setActiveTabName(null);
        }

        setShowPayment(false);
        setShowReceipt(true);
        setCart([]);
        setCustomer(null);
        setCashReceived(0);
        setDiscountType("NONE");
        setDiscountPercent(0);
      } else {
        alert(data.message);
      }
    } catch {
      alert(t("posPage.connectionError"));
    } finally {
      setProcessing(false);
    }
  };

  const printReceipt = () => {
    if (!lastOrder) return;
    const locale = i18n.language === "ar" ? "ar-EG" : "en-US";
    const w = window.open("", "", "width=400,height=600");
    if (w) {
      w.document.write(
        '<html dir="rtl"><head><style>body{font:12px Arial;max-width:280px;margin:auto;padding:20px}.c{text-align:center}.r{display:flex;justify-content:space-between;margin:4px 0}.b{font-weight:bold}.hr{border-top:1px dashed #000;margin:10px 0}</style></head><body>',
      );
      w.document.write(
        '<div class="c"><h2>' +
          t("posPage.posReceipt") +
          '</h2><p>' +
          lastOrder.orderNumber +
          "</p><p>" +
          lastOrder.date.toLocaleString(locale) +
          '</p></div><div class="hr"></div>',
      );
      lastOrder.items.forEach((i) => {
        w.document.write(
          '<div class="r"><span>' +
            i.name +
            " x" +
            i.qty +
            "</span><span>" +
            (i.price * i.qty).toLocaleString(locale) +
            "</span></div>",
        );
        if (i.selectedModifiers && i.selectedModifiers.length > 0) {
          i.selectedModifiers.forEach((m) => {
            w.document.write(
              '<div style="font-size:10px;color:#555;padding-right:8px">+ ' +
                m.name +
                (m.additionalPrice > 0 ? " (+" + m.additionalPrice + ")" : "") +
                "</div>",
            );
          });
        }
        if (i.itemNotes) {
          w.document.write(
            '<div style="font-size:10px;color:#888;padding-right:8px">ملاحظة: ' +
              i.itemNotes +
              "</div>",
          );
        }
      });
      w.document.write(
        '<div class="hr"></div><div class="r"><span>' +
          t("posPage.subtotal") +
          '</span><span>' +
          lastOrder.subtotal.toLocaleString(locale) +
          "</span></div>",
      );
      if (lastOrder.discount && lastOrder.discount > 0) {
        w.document.write(
          '<div class="r" style="color:#d97706"><span>' +
            (lastOrder.discountType === "VIP_COMP" ? "ضيافة إدارة (100%)" : "خصم") +
            '</span><span>-' +
            lastOrder.discount.toLocaleString(locale) +
            "</span></div>",
        );
      }
      w.document.write(
        '<div class="r"><span>' +
          t("posPage.vat") +
          '</span><span>' +
          lastOrder.tax.toLocaleString(locale) +
          "</span></div>",
      );
      w.document.write(
        '<div class="r b"><span>' +
          t("posPage.total") +
          '</span><span>' +
          lastOrder.total.toLocaleString(locale) +
          " " +
          t("posPage.egp") +
          "</span></div>",
      );
      if (lastOrder.paymentMethod === "CASH") {
        w.document.write(
          '<div class="hr"></div><div class="r"><span>' +
            t("posPage.paid") +
            '</span><span>' +
            (lastOrder.cashReceived || 0).toLocaleString(locale) +
            "</span></div>",
        );
        w.document.write(
          '<div class="r b"><span>' +
            t("posPage.change") +
            '</span><span>' +
            (lastOrder.change || 0).toLocaleString(locale) +
            "</span></div>",
        );
      } else if (lastOrder.paymentMethod === "SPLIT" && lastOrder.splitDetails) {
        w.document.write(
          '<div class="hr"></div><div class="r"><span>كاش: ' +
            lastOrder.splitDetails.cash.toLocaleString(locale) +
            '</span><span>فيزا: ' +
            lastOrder.splitDetails.card.toLocaleString(locale) +
            "</span></div>",
        );
      }
      w.document.write(
        '<div class="hr"></div><p class="c">' +
          t("posPage.thankYou") +
          '</p></body></html>',
      );
      w.document.close();
      setTimeout(() => {
        w.print();
        w.close();
      }, 300);
    }
  };

  const printKitchenTicket = () => {
    if (!lastOrder) return;
    const locale = i18n.language === "ar" ? "ar-EG" : "en-US";
    const w = window.open("", "", "width=400,height=500");
    if (w) {
      w.document.write(
        '<html dir="rtl"><head><style>body{font:13px monospace;max-width:280px;margin:auto;padding:15px}.c{text-align:center}.r{display:flex;justify-content:space-between;margin:5px 0;font-weight:bold;font-size:15px}.hr{border-top:2px dashed #000;margin:8px 0}</style></head><body>',
      );
      w.document.write(
        '<div class="c"><h2 style="margin:0">تذكرة تجهيز بار / مطبخ</h2><h1 style="margin:4px 0;font-size:22px">#' +
          lastOrder.orderNumber +
          '</h1><p style="margin:0">' +
          lastOrder.date.toLocaleTimeString(locale) +
          '</p></div><div class="hr"></div>',
      );
      lastOrder.items.forEach((i) => {
        w.document.write(
          '<div class="r"><span>' +
            i.name +
            '</span><span>x ' +
            i.qty +
            '</span></div>',
        );
        if (i.selectedModifiers && i.selectedModifiers.length > 0) {
          i.selectedModifiers.forEach((m) => {
            w.document.write(
              '<div style="font-size:11px;font-weight:normal;padding-right:8px">+ ' +
                m.name +
                '</div>',
            );
          });
        }
        if (i.itemNotes) {
          w.document.write(
            '<div style="font-size:11px;font-weight:normal;color:#c00;padding-right:8px">ملاحظة: ' +
              i.itemNotes +
              '</div>',
          );
        }
      });
      w.document.write(
        '<div class="hr"></div><p class="c" style="font-size:10px">تذكرة تشغيلية للأقسام</p></body></html>',
      );
      w.document.close();
      setTimeout(() => {
        w.print();
        w.close();
      }, 300);
    }
  };

  const resetShift = () => {
    const newShift = {
      startTime: new Date(),
      totalSales: 0,
      totalOrders: 0,
      totalItems: 0,
      cashPayments: 0,
      orders: [],
    };
    setShiftData(newShift);
    localStorage.setItem("pos_shift_data", JSON.stringify(newShift));
    setShowShiftReport(false);
  };

  return (
    <div className="bg-background flex min-h-screen" dir={i18n.language === "ar" ? "rtl" : "ltr"}>
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Control Bar */}
        <div className="border-b border-border/80 bg-card/40 backdrop-blur-xs px-4 py-2.5 flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
            <input
              ref={searchRef}
              type="text"
              placeholder={t("posPage.searchPlaceholder")}
              className="w-full pr-9 pl-12 py-1.5 text-xs bg-muted/40 border border-border/80 text-foreground placeholder-muted-foreground rounded-lg focus:outline-hidden focus:border-primary transition"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-muted-foreground border border-border/60 px-1 rounded bg-background/80">
              F2
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <a
              href="/cafe/recipes"
              className="px-2.5 py-1.5 border border-border/80 bg-background/80 hover:bg-muted text-foreground rounded-lg transition active:scale-[0.98] flex items-center gap-1.5 text-xs font-medium"
              title="معايير الرسيبي وتكلفة المشروبات"
            >
              <Coffee className="size-3.5 text-amber-600" />
              <span className="hidden sm:inline">الرسيبي</span>
            </a>

            <a
              href="/cafe/audits"
              className="px-2.5 py-1.5 border border-border/80 bg-background/80 hover:bg-muted text-foreground rounded-lg transition active:scale-[0.98] flex items-center gap-1.5 text-xs font-medium"
              title="جلسات الجرد الفعلي للمخزن"
            >
              <FileText className="size-3.5 text-blue-600" />
              <span className="hidden sm:inline">الجرد</span>
            </a>

            <button
              onClick={() =>
                setIsFullscreen((f) => {
                  if (f) {
                    void document.exitFullscreen();
                  } else {
                    void document.documentElement.requestFullscreen();
                  }
                  return !f;
                })
              }
              className="p-1.5 border border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition active:scale-[0.98]"
              title="ملء الشاشة"
            >
              {isFullscreen ? (
                <Minimize className="size-4" />
              ) : (
                <Maximize className="size-4" />
              )}
            </button>

            <button
              onClick={toggleTheme}
              className="p-1.5 border border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition active:scale-[0.98]"
              title={isDark ? t("posPage.toggleLightMode") : t("posPage.toggleDarkMode")}
            >
              {isDark ? (
                <Sun className="size-4 text-amber-500" />
              ) : (
                <Moon className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* Categories Ribbon */}
        <div className="border-b border-border/70 px-4 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-none bg-muted/20">
          {categories.map((c) => {
            const isSelected = selectedCategory === c;
            return (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition active:scale-[0.98] ${
                  isSelected
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "border border-border/80 bg-background/80 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
              <Loader2 className="size-6 text-primary animate-spin" />
              <p className="text-xs">جاري تحميل المنتجات...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map((p, index) => {
                const isOutOfStock = p.trackInventory !== false && p.stock <= 0;
                const isLowStock = p.trackInventory !== false && p.stock < 5 && p.stock > 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className={`rounded-xl border border-border/80 dark:border-border/60 bg-card/60 backdrop-blur-xs cursor-pointer hover:border-foreground/30 hover:shadow-2xs transition-all active:scale-[0.98] flex flex-col justify-between overflow-hidden ${
                      isOutOfStock ? "opacity-50" : ""
                    }`}
                  >
                    <div className="h-28 bg-muted/30 relative flex items-center justify-center overflow-hidden">
                      {p.images.length ? (
                        <PosProductImage
                          candidates={p.images}
                          alt={p.name}
                          className="h-full w-full object-cover"
                          requestedWidth={320}
                          responsiveWidths={[160, 240, 320]}
                          responsiveSizes="(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw"
                          imageQuality={70}
                          loading={index < 8 ? "eager" : "lazy"}
                          fetchPriority={index < 8 ? "high" : "low"}
                          fallback={<ImageIcon className="size-8 text-muted-foreground/30" />}
                        />
                      ) : (
                        <ImageIcon className="size-8 text-muted-foreground/30" />
                      )}

                      {/* Monospace Micro-Stock Pill */}
                      <span
                        className={`absolute top-2 right-2 font-mono text-[10px] px-1.5 py-0.5 rounded tabular-nums border shadow-2xs ${
                          isOutOfStock
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-bold"
                            : isLowStock
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold"
                            : "bg-background/90 text-foreground border-border/80 font-medium"
                        }`}
                      >
                        {isOutOfStock ? t("posPage.outOfStock") : p.stock}
                      </span>
                    </div>

                    <div className="p-2.5 space-y-1">
                      <h3 className="text-xs font-semibold truncate text-foreground">
                        {p.name}
                      </h3>
                      <p className="font-mono text-xs font-bold tabular-nums text-foreground">
                        {p.price.toLocaleString("en-US")} <span className="text-[10px] font-normal text-muted-foreground">EGP</span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Shortcut Ribbon */}
        <div className="border-t border-border/70 px-4 py-1.5 flex items-center gap-3 text-xs text-muted-foreground bg-muted/10">
          <span className="font-mono text-[11px] bg-background border border-border/80 text-foreground px-1.5 py-0.5 rounded">
            {t("posPage.f2Search")}
          </span>
          <span className="font-mono text-[11px] bg-background border border-border/80 text-foreground px-1.5 py-0.5 rounded">
            {t("posPage.f4Pay")}
          </span>
        </div>
      </div>

      <div className="w-88 md:w-96 bg-card/60 backdrop-blur-xs border-r border-border/80 flex flex-col shrink-0">
        <div className="p-3 border-b border-border/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg border border-border/80 bg-muted/40 flex items-center justify-center">
              <ShoppingCart className="size-4 text-foreground" />
            </div>
            <span className="font-bold text-sm text-foreground">
              {t('pos.k_46')}
            </span>
            <span className="font-mono text-xs tabular-nums px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground bg-muted/40">
              {cart.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowParkModal(true)}
              disabled={!cart.length}
              className="p-1.5 border border-border/80 rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors disabled:opacity-30 active:scale-[0.98]"
              title="تعليق الطلب على طاولة"
            >
              <Bookmark className="size-4" />
            </button>
            <button
              onClick={clearCart}
              className="p-1.5 border border-border/80 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors active:scale-[0.98]"
              title="تفريغ السلة"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>

        {activeTabName && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
            <div className="flex items-center gap-1.5 font-medium">
              <Coffee className="w-3.5 h-3.5 text-amber-600" />
              <span>طاولة مفتوحة: {activeTabName}</span>
            </div>
            <button
              onClick={handleUnlinkTab}
              className="text-[11px] underline hover:text-amber-800 dark:hover:text-amber-200"
            >
              تحويل لسفري
            </button>
          </div>
        )}

        {kotSuccessNotice && (
          <div className="bg-green-500/15 border-b border-green-500/30 px-3 py-1.5 text-xs text-green-700 dark:text-green-300 font-medium flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-green-600" />
            <span>{kotSuccessNotice}</span>
          </div>
        )}

        {openTabs.length > 0 && (
          <div className="bg-amber-50/70 dark:bg-amber-950/30 border-b dark:border-gray-700 px-3 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide text-xs">
            <span className="font-semibold text-amber-800 dark:text-amber-400 whitespace-nowrap text-[11px]">
              طاولات:
            </span>
            {openTabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => handleRestoreTab(tab)}
                className={
                  "inline-flex items-center gap-1 px-2 py-1 rounded border shadow-xs cursor-pointer whitespace-nowrap " +
                  (activeTabId === tab.id
                    ? "bg-amber-500 text-white border-amber-600 font-bold"
                    : "bg-white dark:bg-gray-800 border-amber-300 dark:border-amber-700/60 hover:border-amber-500 text-gray-900 dark:text-white")
                }
              >
                <span className="text-xs">{tab.name}</span>
                <span className={"text-[10px] " + (activeTabId === tab.id ? "text-white/80" : "text-gray-400")}>
                  ({tab.items.length})
                </span>
                <span
                  onClick={(e) => handleDeleteTab(tab.id, e)}
                  className="hover:text-red-500 ml-1 font-bold text-xs"
                >
                  ×
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 dark:bg-gray-800/50">
          {!cart.length ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
              <ShoppingCart className="h-16 w-16 mb-4 opacity-30" />
              <p>{t('pos.k_10')}</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-transparent dark:border-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
                    {item.images.length ? (
                      <PosProductImage
                        candidates={item.images}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        requestedWidth={96}
                        responsiveWidths={[64, 96, 128]}
                        responsiveSizes="48px"
                        imageQuality={68}
                        fallback={
                          <ImageIcon className="w-full h-full p-2 text-gray-400 dark:text-gray-500" />
                        }
                      />
                    ) : (
                      <ImageIcon className="w-full h-full p-2 text-gray-400 dark:text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate text-gray-900 dark:text-white">
                      {item.name}
                    </h4>
                    {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {item.selectedModifiers.map((mod) => (
                          <span
                            key={mod.id}
                            className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 px-1 py-0.2 rounded border border-amber-500/20 tabular-nums"
                          >
                            +{mod.name}
                            {mod.additionalPrice > 0 ? ` (${mod.additionalPrice})` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.itemNotes && (
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 italic mt-0.5 truncate">
                        ملاحظة: {item.itemNotes}
                      </p>
                    )}
                    <p className="text-blue-600 dark:text-blue-400 font-bold text-sm mt-0.5 tabular-nums">
                      {(item.price * item.qty).toLocaleString()} {t('pos.k_39')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      className="w-7 h-7 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium text-gray-900 dark:text-white">
                      {item.qty}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      className="w-7 h-7 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 space-y-3">
          {/* Quick Discounts Bar */}
          <div className="flex items-center justify-between gap-1 pb-2 border-b dark:border-gray-700">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Percent className="w-3 h-3" />
              <span className="text-[11px]">خصم:</span>
            </div>
            <div className="flex items-center gap-1">
              {[
                { label: "0%", type: "NONE", val: 0 },
                { label: "10%", type: "PERCENT", val: 10 },
                { label: "15%", type: "PERCENT", val: 15 },
                { label: "20%", type: "PERCENT", val: 20 },
                { label: "ضيافة VIP", type: "VIP_COMP", val: 100 },
              ].map((d) => {
                const active =
                  discountType === d.type &&
                  (d.type !== "PERCENT" || discountPercent === d.val);
                return (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => {
                      if (active) {
                        setDiscountType("NONE");
                        setDiscountPercent(0);
                      } else {
                        setDiscountType(d.type as any);
                        setDiscountPercent(d.val);
                      }
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      active
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-gray-200/70 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex justify-between">
              <span>{t('pos.k_4')}</span>
              <span className="text-gray-900 dark:text-white tabular-nums">
                {rawSubtotal.toLocaleString()} {t('pos.k_39')}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                <span>
                  {discountType === "VIP_COMP"
                    ? "ضيافة إدارة (100%)"
                    : `خصم (${discountPercent}%)`}
                </span>
                <span className="tabular-nums">
                  - {discountAmount.toLocaleString()} {t('pos.k_39')}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span>{t('pos.k_11')}</span>
              <span className="text-gray-900 dark:text-white tabular-nums">
                {tax.toLocaleString()} {t('pos.k_39')}
              </span>
            </div>
            <div className="flex justify-between text-xl font-bold pt-2 border-t dark:border-gray-700 text-gray-900 dark:text-white">
              <span>{t('pos.k_6')}</span>
              <span className="text-blue-600 dark:text-blue-400 tabular-nums">
                {total.toLocaleString()} {t('pos.k_39')}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => setShowShiftReport(true)}
              className="p-2.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg flex flex-col items-center justify-center hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              title={t('pos.k_12')}
            >
              <FileText className="h-4 w-4" />
              <span className="text-[10px] mt-0.5">{t('pos.k_12')}</span>
            </button>
            <button
              onClick={fireKitchenTicket}
              disabled={!cart.length || kotFiring}
              className="p-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-lg flex flex-col items-center justify-center transition-colors disabled:opacity-40"
              title="إرسال تذكرة التحضير للبار والمطبخ فوراً"
            >
              {kotFiring ? (
                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
              ) : (
                <Flame className="h-4 w-4 text-amber-600" />
              )}
              <span className="text-[10px] font-bold mt-0.5">للبـار</span>
            </button>
            <button
              onClick={() => {
                setShowPayment(true);
                setCashReceived(Math.ceil(total));
                if (paymentMethod === "SPLIT") {
                  const half = Math.round(total / 2);
                  setSplitCash(half);
                  setSplitCard(Math.max(0, total - half));
                }
              }}
              disabled={!cart.length}
              className="col-span-2 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50 font-bold transition-all shadow-md active:scale-95 text-sm"
            >
              <CreditCard className="h-4 w-4" />
              {t('pos.k_47')}
            </button>
          </div>
        </div>
      </div>

      {showPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('pos.k_48')}
              </h2>
              <button
                onClick={() => setShowPayment(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="text-center mb-6">
              <p className="text-gray-500 dark:text-gray-400">{t('pos.k_6')}</p>
              <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {total.toLocaleString()} {t('pos.k_39')}
              </p>
            </div>
            <div className="flex gap-2 mb-6">
              {(["CASH", "CARD", "SPLIT"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setPaymentMethod(m);
                    if (m === "SPLIT") {
                      const half = Math.round(total / 2);
                      setSplitCash(half);
                      setSplitCard(Math.max(0, total - half));
                    }
                  }}
                  className={
                    "flex-1 p-3 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-all text-xs sm:text-sm " +
                    (paymentMethod === m
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300")
                  }
                >
                  {m === "CASH" ? (
                    <>
                      <Banknote className="h-4 w-4" />
                      {t('pos.k_49')}
                    </>
                  ) : m === "CARD" ? (
                    <>
                      <CreditCard className="h-4 w-4" />
                      {t('pos.k_50')}
                    </>
                  ) : (
                    <>
                      <Sliders className="h-4 w-4" />
                      مقسم (كاش+فيزا)
                    </>
                  )}
                </button>
              ))}
            </div>
            {paymentMethod === "CASH" && (
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  {t('pos.k_51')}
                </label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(Number(e.target.value))}
                  className="w-full p-4 border-2 border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-xl text-2xl text-center font-bold text-gray-900 dark:text-white focus:border-blue-500 outline-none transition-all"
                />
                <div className="flex gap-2 mt-3">
                  {[50, 100, 200, 500].map((v) => (
                    <button
                      key={v}
                      onClick={() => setCashReceived(v)}
                      className="flex-1 p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
                {cashReceived >= total && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center border border-green-100 dark:border-green-900/30">
                    <p className="text-gray-600 dark:text-gray-400">{t('pos.k_8')}</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {change.toLocaleString()} {t('pos.k_39')}
                    </p>
                  </div>
                )}
              </div>
            )}
            {paymentMethod === "SPLIT" && (
              <div className="space-y-3 mb-6 bg-gray-50 dark:bg-gray-700/50 p-3.5 rounded-xl border border-gray-200 dark:border-gray-600">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      المبلغ نقداً (كاش)
                    </label>
                    <span className="text-[11px] text-gray-400">ج.م</span>
                  </div>
                  <input
                    type="number"
                    value={splitCash || ""}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setSplitCash(val);
                      setSplitCard(Math.max(0, Math.round(total - val)));
                    }}
                    placeholder="0"
                    className="w-full p-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-lg text-center font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 tabular-nums"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      المبلغ بالبطاقة (فيزا / مدى)
                    </label>
                    <span className="text-[11px] text-gray-400">ج.م</span>
                  </div>
                  <input
                    type="number"
                    value={splitCard || ""}
                    onChange={(e) => setSplitCard(Number(e.target.value))}
                    placeholder="0"
                    className="w-full p-2.5 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg text-lg text-center font-bold text-gray-900 dark:text-white outline-none focus:border-blue-500 tabular-nums"
                  />
                </div>
                <div className="flex justify-between text-xs pt-1 border-t dark:border-gray-600">
                  <span className="text-gray-500 dark:text-gray-400">إجمالي المدفوع:</span>
                  <span
                    className={
                      "font-bold tabular-nums " +
                      (splitCash + splitCard >= Math.floor(total)
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-500")
                    }
                  >
                    {(splitCash + splitCard).toLocaleString()} / {total.toLocaleString()} {t('pos.k_39')}
                  </span>
                </div>
              </div>
            )}
            <button
              onClick={checkout}
              disabled={
                processing ||
                (paymentMethod === "CASH" && cashReceived < total) ||
                (paymentMethod === "SPLIT" && splitCash + splitCard < Math.floor(total))
              }
              className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              {processing ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Check className="h-6 w-6" />
              )}
              {t('pos.k_52')}
            </button>
          </div>
        </div>
      )}

      {showReceipt && lastOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('pos.k_53')}
              </h2>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                {lastOrder.orderNumber}
              </p>
            </div>
            {lastOrder.paymentMethod === "CASH" &&
              lastOrder.change &&
              lastOrder.change > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mb-6 text-center border border-green-100 dark:border-green-900/30">
                  <p className="text-gray-600 dark:text-gray-400">{t('pos.k_8')}</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {lastOrder.change.toLocaleString()} {t('pos.k_39')}
                  </p>
                </div>
              )}
            <div className="flex gap-2">
              <button
                onClick={printReceipt}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 text-xs sm:text-sm"
              >
                <Printer className="h-4 w-4" />
                {t('pos.k_54')}
              </button>
              <button
                onClick={printKitchenTicket}
                className="flex-1 border border-amber-500/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 py-3 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-all active:scale-95 text-xs sm:text-sm"
              >
                <Coffee className="h-4 w-4" />
                تذكرة البار
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs sm:text-sm"
              >
                {t('pos.k_55')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showParkModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                تعليق الطلب (طاولة / شيك مفتوح)
              </h3>
              <button onClick={() => setShowParkModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleParkCart} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  رقم الطاولة أو اسم الزبون
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="مثال: طاولة 4، صالة 2"
                  value={parkTableName}
                  onChange={(e) => setParkTableName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-transparent focus:border-blue-500 outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowParkModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium shadow-xs"
                >
                  حفظ وتعليق
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showShiftReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('pos.k_56')}
              </h2>
              <button
                onClick={() => setShowShiftReport(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center border border-blue-100 dark:border-blue-900/30">
                <DollarSign className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("posPage.totalSales")}
                </p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {shiftData.totalSales.toLocaleString(i18n.language === "ar" ? "ar-EG" : "en-US")} {t("posPage.egp")}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center border border-green-100 dark:border-green-900/30">
                <Package className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("posPage.ordersCount")}
                </p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {shiftData.totalOrders}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center border border-purple-100 dark:border-purple-900/30">
                <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("posPage.totalProducts")}
                </p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {shiftData.totalItems}
                </p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 text-center border border-orange-100 dark:border-orange-900/30">
                <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t("posPage.shiftStart")}
                </p>
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {shiftData.startTime.toLocaleTimeString("ar-EG")}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetShift}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                <RotateCcw className="h-5 w-5" />
                {t("posPage.newShift")}
              </button>
              <button
                onClick={() => setShowShiftReport(false)}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {t("posPage.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModifierModal && selectedProductForModifier && (
        <ItemModifierModal
          product={selectedProductForModifier}
          modifierGroups={modifierGroups}
          onClose={() => {
            setShowModifierModal(false);
            setSelectedProductForModifier(null);
          }}
          onConfirm={handleModifierConfirm}
        />
      )}
    </div>
  );
};

export default PosPage;
