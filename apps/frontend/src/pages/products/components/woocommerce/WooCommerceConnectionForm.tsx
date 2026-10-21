import React from "react";
import { Globe, Key, Loader2, Search } from "lucide-react";

interface WooCommerceConnectionFormProps {
  storeUrl: string;
  setStoreUrl: (url: string) => void;
  consumerKey: string;
  setConsumerKey: (key: string) => void;
  consumerSecret: string;
  setConsumerSecret: (secret: string) => void;
  loading: boolean;
  fetchProducts: () => void;
}

export const WooCommerceConnectionForm: React.FC<WooCommerceConnectionFormProps> = ({
  storeUrl,
  setStoreUrl,
  consumerKey,
  setConsumerKey,
  consumerSecret,
  setConsumerSecret,
  loading,
  fetchProducts,
}) => {
  const isFormIncomplete =
    !storeUrl.trim() || !consumerKey.trim() || !consumerSecret.trim();

  return (
    <div className="max-w-2xl mx-auto rounded-xl border border-border/70 bg-card p-5 space-y-4 shadow-xs text-xs">
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <Globe className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-foreground text-sm">
          بيانات الربط مع WooCommerce REST API
        </h2>
      </div>

      <div className="space-y-3.5">
        <div>
          <label className="block font-medium text-foreground mb-1">
            رابط متجر ووكومرس <span className="text-red-500">*</span>
          </label>
          <input
            type="url"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="https://yourstore.com"
            dir="ltr"
            className="w-full px-3 py-2 rounded-md border border-border/70 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary font-mono text-left"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block font-medium text-foreground mb-1 flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5 text-muted-foreground" />
            Consumer Key <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={consumerKey}
            onChange={(e) => setConsumerKey(e.target.value)}
            placeholder="ck_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            dir="ltr"
            className="w-full px-3 py-2 rounded-md border border-border/70 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary font-mono text-left"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block font-medium text-foreground mb-1 flex items-center gap-1.5">
            <Key className="h-3.5 w-3.5 text-muted-foreground" />
            Consumer Secret <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={consumerSecret}
            onChange={(e) => setConsumerSecret(e.target.value)}
            placeholder="cs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            dir="ltr"
            className="w-full px-3 py-2 rounded-md border border-border/70 bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary font-mono text-left"
            disabled={loading}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            يمكن توليد المفاتيح من: WooCommerce → Settings → Advanced → REST API
          </p>
        </div>

        <button
          onClick={fetchProducts}
          disabled={loading || isFormIncomplete}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>جاري الاتصال وجلب المنتجات...</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              <span>الاتصال وجلب المنتجات</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
