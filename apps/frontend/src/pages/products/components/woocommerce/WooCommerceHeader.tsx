import React from "react";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const WooCommerceHeader: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/70 pb-4">
      <div>
        <button
          onClick={() => navigate("/products")}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
          <span>العودة لكتالوج المنتجات</span>
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            استيراد المنتجات من WooCommerce
          </h1>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          مزامنة واستيراد كتالوج المنتجات والصور والمخزون مباشرة من متجر ووكومرس
        </p>
      </div>
    </header>
  );
};
