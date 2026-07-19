import React, { useState, useEffect } from "react";
import {
  Search,
  ShoppingCart,
  User,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  PauseCircle,
  RotateCcw,
  Maximize,
  Minimize,
  Grid,
  List as ListIcon,
  Barcode,
} from "lucide-react";

// Types
interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  category: string;
  stock: number;
  sku: string;
}

interface CartItem extends Product {
  qty: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

// Mock Data
const MOCK_PRODUCTS: Product[] = [
  {
    id: "1",
    name: "تي شيرت قطن أساسي",
    price: 150,
    category: "ملابس رجالي",
    stock: 50,
    sku: "TSH-001",
  },
  {
    id: "2",
    name: "بنطلون جينز سليم",
    price: 350,
    category: "ملابس رجالي",
    stock: 30,
    sku: "JNS-002",
  },
  {
    id: "3",
    name: "فستان صيفي مشجر",
    price: 450,
    category: "ملابس حريمي",
    stock: 15,
    sku: "DRS-003",
  },
  {
    id: "4",
    name: "حذاء رياضي أبيض",
    price: 600,
    category: "أحذية",
    stock: 10,
    sku: "SHS-004",
  },
  {
    id: "5",
    name: "حقيبة جلد طبيعي",
    price: 800,
    category: "إكسسوارات",
    stock: 5,
    sku: "BAG-005",
  },
  {
    id: "6",
    name: "جاكيت شتوي مبطن",
    price: 1200,
    category: "ملابس رجالي",
    stock: 8,
    sku: "JKT-006",
  },
];

const CATEGORIES = ["الكل", "ملابس رجالي", "ملابس حريمي", "أحذية", "إكسسوارات"];

const POS = () => {
  // State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Computed
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const tax = subtotal * 0.14; // 14% VAT example
  const total = subtotal + tax;

  const filteredProducts = MOCK_PRODUCTS.filter((p) => {
    const matchesSearch =
      p.name.includes(searchQuery) || p.sku.includes(searchQuery);
    const matchesCategory =
      selectedCategory === "الكل" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handlers
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === productId) {
          const newQty = Math.max(1, item.qty + delta);
          return { ...item, qty: newQty };
        }
        return item;
      }),
    );
  };

  const clearCart = () => {
    if (window.confirm("هل أنت متأكد من مسح السلة؟")) {
      setCart([]);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  return (
    <div
      className="h-[calc(100vh-64px)] bg-gray-50 flex flex-col md:flex-row overflow-hidden"
      dir="rtl"
    >
      {/* LEFT SIDE: PRODUCTS */}
      <div className="w-full md:w-2/3 flex flex-col border-l border-gray-200 h-full">
        {/* Top Bar */}
        <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="بحث باسم المنتج أو الباركود..."
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 cursor-pointer hover:text-blue-600" />
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            title="ملء الشاشة"
          >
            {isFullscreen ? (
              <Minimize className="h-6 w-6" />
            ) : (
              <Maximize className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Categories */}
        <div className="px-4 py-2 bg-white border-b border-gray-200 overflow-x-auto flex gap-2 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors
                ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-all hover:border-blue-300 flex flex-col overflow-hidden group"
              >
                <div className="h-32 bg-gray-100 flex items-center justify-center relative">
                  {/* Placeholder Image */}
                  <div className="text-4xl">📦</div>
                  <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm">
                    {product.stock} قطعة
                  </div>
                </div>
                <div className="p-3 flex flex-col flex-1">
                  <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 mb-1">
                    {product.name}
                  </h3>
                  <div className="mt-auto flex justify-between items-center">
                    <span className="font-bold text-blue-600">
                      {product.price} ج.م
                    </span>
                    <div className="h-8 w-8 rounded-full bg-gray-50 text-blue-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {filteredProducts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Search className="h-16 w-16 mb-4 opacity-20" />
              <p>لا توجد منتجات مطابقة</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: CART */}
      <div className="w-full md:w-1/3 bg-white flex flex-col h-full shadow-xl z-10">
        {/* Customer Info */}
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              السلة الحالية
            </h2>
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-mono">
              #{Math.floor(Math.random() * 10000)}
            </span>
          </div>

          <div
            className="flex items-center gap-2 bg-white p-2 rounded-lg border border-dashed border-gray-300 cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() =>
              setCustomer({ id: "new", name: "عميل جديد", phone: "" })
            }
          >
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <User className="h-4 w-4" />
            </div>
            {customer ? (
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">
                  {customer.name}
                </p>
                <p className="text-xs text-gray-500">اضغط للتغيير</p>
              </div>
            ) : (
              <div className="flex-1 text-gray-500 text-sm">
                اضافة عميل (اختياري)
              </div>
            )}
            <Plus className="h-4 w-4 text-gray-400" />
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
              <ShoppingCart className="h-16 w-16 mb-4" />
              <p>السلة فارغة</p>
              <p className="text-xs mt-2">اضغط على المنتجات لإضافتها</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-blue-100 shadow-sm transition-all"
              >
                <div className="h-12 w-12 bg-gray-100 rounded-md flex items-center justify-center flex-shrink-0">
                  📦
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-800 text-sm truncate">
                    {item.name}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {item.price} ج.م / قطعة
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                  <button
                    onClick={() => updateQty(item.id, -1)}
                    className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600 disabled:opacity-50"
                    disabled={item.qty <= 1}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-bold w-6 text-center">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateQty(item.id, 1)}
                    className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-blue-600"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
                <div className="text-right min-w-[60px]">
                  <p className="font-bold text-gray-800 text-sm">
                    {(item.price * item.qty).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Totals & Actions */}
        <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-gray-600">
              <span>المجموع الفرعي</span>
              <span>{subtotal.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>الضريبة (14%)</span>
              <span>{tax.toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-100">
              <span>الإجمالي</span>
              <span>{total.toLocaleString()} ج.م</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="col-span-1 flex flex-col items-center justify-center p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">إلغاء</span>
            </button>

            <button
              disabled={cart.length === 0}
              className="col-span-1 flex flex-col items-center justify-center p-2 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PauseCircle className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">تعليق</span>
            </button>

            <button
              disabled={cart.length === 0}
              className="col-span-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <CreditCard className="h-6 w-6" />
              <div className="text-right">
                <div className="text-xs opacity-80 font-normal">دفع وإتمام</div>
                <div className="font-bold leading-none">
                  {total.toLocaleString()} ج.م
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;
