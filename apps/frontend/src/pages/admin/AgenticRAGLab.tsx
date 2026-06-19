import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import tokenManager from "../../utils/tokenManager";
import { buildApiUrl } from "../../utils/urlHelper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  CheckCircle2,
  Database,
  XCircle,
  AlertTriangle,
  FileText,
  HelpCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type ProductEmbeddingItem = {
  id: string;
  name: string;
  sku: string;
  mainImage: string | null;
  isActive: boolean;
  hasTextEmbedding: boolean;
  hasImageEmbedding: boolean;
  textEmbeddingGeneratedAt: string | null;
  imageEmbeddingGeneratedAt: string | null;
};

type RagFaqItem = {
  id: string;
  question: string;
  category: string;
  isActive: boolean;
  hasEmbedding: boolean;
};

type RagPolicyItem = {
  id: string;
  title: string;
  category: string;
  isActive: boolean;
  effectiveAt: string | null;
  expiresAt: string | null;
  hasEmbedding: boolean;
};

const AgenticRAGLab: React.FC = () => {
  const { t, i18n } = useTranslation();
  const tr = (key: string, options?: any) => String(t(key, options));

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tabIndex, setTabIndex] = useState(1);
  const [products, setProducts] = useState<ProductEmbeddingItem[]>([]);
  const [productsStats, setProductsStats] = useState<{ total: number; withTextEmbedding: number; withImageEmbedding: number; missingTextEmbedding: number; missingImageEmbedding: number } | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsOffset, setProductsOffset] = useState(0);
  const [productsTotal, setProductsTotal] = useState(0);
  const [productsBackfillBusy, setProductsBackfillBusy] = useState(false);
  const [faqItems, setFaqItems] = useState<RagFaqItem[]>([]);
  const [policyItems, setPolicyItems] = useState<RagPolicyItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [faqBackfillBusy, setFaqBackfillBusy] = useState(false);
  const [policyBackfillBusy, setPolicyBackfillBusy] = useState(false);

  const getHeaders = (extra: Record<string, string> = {}) =>
    tokenManager.createAuthHeaders(extra);

  useEffect(() => {
    if (tabIndex === 1) loadProducts(0);
    else if (tabIndex === 2) loadFaqItems();
    else if (tabIndex === 3) loadPolicyItems();
  }, [tabIndex]);

  const handleTabChange = (newValue: number) => {
    setTabIndex(newValue);
    setError("");
    setNotice("");
  };

  const loadProducts = async (offset = 0) => {
    setProductsLoading(true);
    try {
      const response = await fetch(buildApiUrl(`/ai/chat/rag-knowledge-products?limit=50&offset=${offset}`), {
        headers: getHeaders(),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setProducts(data.items || []);
        setProductsStats(data.stats || null);
        setProductsOffset(data.offset || 0);
        setProductsTotal(data.total || 0);
      }
    } finally {
      setProductsLoading(false);
    }
  };

  const loadFaqItems = async () => {
    setFaqLoading(true);
    try {
      const response = await fetch(buildApiUrl("/ai/chat/rag-knowledge-faqs?limit=200"), {
        headers: getHeaders(),
      });
      const data = await response.json();
      if (response.ok && data.success) setFaqItems(data.data?.items || []);
    } finally {
      setFaqLoading(false);
    }
  };

  const loadPolicyItems = async () => {
    setPolicyLoading(true);
    try {
      const response = await fetch(buildApiUrl("/ai/chat/rag-knowledge-policies?limit=200"), {
        headers: getHeaders(),
      });
      const data = await response.json();
      if (response.ok && data.success) setPolicyItems(data.data?.items || []);
    } finally {
      setPolicyLoading(false);
    }
  };

  const runProductBackfill = async (productId?: string) => {
    if (productsBackfillBusy) return;
    setProductsBackfillBusy(true);
    setError("");
    setNotice("");
    try {
      const body = productId ? { productId } : {};
      const response = await fetch(buildApiUrl("/ai/chat/rag-knowledge-products-backfill"), {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Backfill failed");
      setNotice("Product embeddings backfill completed");
      await loadProducts(productsOffset);
    } catch (err: any) {
      setError(err.message || "Backfill error");
    } finally {
      setProductsBackfillBusy(false);
    }
  };

  const runFaqBackfill = async () => {
    if (faqBackfillBusy) return;
    setFaqBackfillBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(buildApiUrl("/ai/chat/rag-knowledge-backfill"), {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ target: "faq", limit: 200 }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "FAQ backfill failed");
      setNotice("FAQ embeddings backfill completed");
      await loadFaqItems();
    } catch (err: any) {
      setError(err.message || "FAQ backfill error");
    } finally {
      setFaqBackfillBusy(false);
    }
  };

  const runPolicyBackfill = async () => {
    if (policyBackfillBusy) return;
    setPolicyBackfillBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(buildApiUrl("/ai/chat/rag-knowledge-backfill"), {
        method: "POST",
        headers: getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ target: "policy", limit: 200 }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Policy backfill failed");
      setNotice("Policy embeddings backfill completed");
      await loadPolicyItems();
    } catch (err: any) {
      setError(err.message || "Policy backfill error");
    } finally {
      setPolicyBackfillBusy(false);
    }
  };

  const handleProductsPrevPage = () => {
    const next = Math.max(0, productsOffset - 50);
    loadProducts(next);
  };

  const handleProductsNextPage = () => {
    const next = productsOffset + 50;
    if (next < productsTotal) loadProducts(next);
  };

  const isRtl = i18n.dir() === "rtl";

  return (
    <div className={`p-4 md:p-6 w-full text-slate-900 dark:text-slate-100 bg-background ${isRtl ? "rtl" : "ltr"}`}>


      {/* Notifications */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl p-4 mb-6 flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="hover:opacity-75">
            <XCircle className="size-4" />
          </button>
        </div>
      )}
      {notice && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-xl p-4 mb-6 flex justify-between items-center text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 flex-shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice("")} className="hover:opacity-75">
            <XCircle className="size-4" />
          </button>
        </div>
      )}

      {/* Modern Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto gap-2">
        {(t("agenticRagLab.embeddings.tabs", { returnObjects: true }) as string[]).map((label, idx) => (
          <button
            key={label}
            onClick={() => handleTabChange(idx + 1)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
              tabIndex === idx + 1
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 1: Products */}
      {tabIndex === 1 && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: tr("agenticRagLab.embeddings.products.total"), value: productsStats?.total || 0 },
              { label: tr("agenticRagLab.embeddings.products.withText"), value: productsStats?.withTextEmbedding || 0 },
              { label: tr("agenticRagLab.embeddings.products.withImage"), value: productsStats?.withImageEmbedding || 0 },
              { label: tr("agenticRagLab.embeddings.products.missingText"), value: productsStats?.missingTextEmbedding || 0 },
              { label: tr("agenticRagLab.embeddings.products.missingImage"), value: productsStats?.missingImageEmbedding || 0 },
            ].map((stat, idx) => (
              <div key={idx} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-4 flex flex-col justify-between min-h-[80px]">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</span>
                <span className="text-xl font-bold mt-1 text-slate-850 dark:text-slate-100">
                  {productsLoading ? "..." : stat.value}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center gap-4 flex-wrap">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Database className="size-5 text-indigo-650" />
                <span>{tr("agenticRagLab.embeddings.products.heading")}</span>
              </h3>
              <Button
                variant="default"
                size="sm"
                onClick={() => runProductBackfill()}
                disabled={productsBackfillBusy}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-1.5"
              >
                {productsBackfillBusy ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                <span>{tr("agenticRagLab.embeddings.products.backfillAll")}</span>
              </Button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                    <th className="px-4 py-3">{tr("agenticRagLab.embeddings.products.product")}</th>
                    <th className="px-4 py-3">{tr("agenticRagLab.embeddings.products.sku")}</th>
                    <th className="px-4 py-3">{tr("agenticRagLab.embeddings.products.status")}</th>
                    <th className="px-4 py-3">{tr("agenticRagLab.embeddings.products.textEmbedding")}</th>
                    <th className="px-4 py-3">{tr("agenticRagLab.embeddings.products.imageEmbedding")}</th>
                    <th className="px-4 py-3 text-right">{tr("agenticRagLab.embeddings.products.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        {productsLoading ? tr("agenticRagLab.embeddings.products.loading") : tr("agenticRagLab.embeddings.products.empty")}
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            {product.mainImage ? (
                              <img src={product.mainImage} alt={product.name} className="size-9 rounded-lg object-cover border border-slate-100 dark:border-slate-850" />
                            ) : (
                              <div className="size-9 bg-slate-100 dark:bg-slate-850 rounded-lg flex items-center justify-center text-[10px] text-slate-400">{tr("agenticRagLab.embeddings.products.noImage")}</div>
                            )}
                            <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate max-w-[200px]">
                              {product.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-500 font-mono">{product.sku}</td>
                        <td className="px-4 py-3.5">
                          <Badge variant={product.isActive ? "success" : "secondary"} className="text-[10px]">
                            {product.isActive ? tr("agenticRagLab.embeddings.products.active") : tr("agenticRagLab.embeddings.products.inactive")}
                          </Badge>
                        </td>
                        <td className="px-4 py-3.5">
                          {product.hasTextEmbedding ? (
                            <Badge variant="success" className="text-[10px]">
                              {product.textEmbeddingGeneratedAt ? new Date(product.textEmbeddingGeneratedAt).toLocaleDateString() : tr("agenticRagLab.embeddings.products.done")}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">{tr("agenticRagLab.embeddings.products.missing")}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {product.hasImageEmbedding ? (
                            <Badge variant="success" className="text-[10px]">
                              {product.imageEmbeddingGeneratedAt ? new Date(product.imageEmbeddingGeneratedAt).toLocaleDateString() : tr("agenticRagLab.embeddings.products.done")}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">{tr("agenticRagLab.embeddings.products.missing")}</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={productsBackfillBusy || (product.hasTextEmbedding && product.hasImageEmbedding)}
                            onClick={() => runProductBackfill(product.id)}
                            className="text-xs h-7 px-2.5 rounded-lg border-slate-200 dark:border-slate-800"
                          >
                            {tr("agenticRagLab.embeddings.products.generateEmbedding")}
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center pt-2 text-xs">
              <span className="text-slate-500">
                {tr("agenticRagLab.embeddings.products.showing", { from: productsOffset + 1, to: Math.min(productsOffset + 50, productsTotal), total: productsTotal })}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={productsOffset === 0 || productsLoading}
                  onClick={handleProductsPrevPage}
                  className="flex items-center gap-1 h-8 px-2.5"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>{tr("agenticRagLab.embeddings.products.previous")}</span>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={productsOffset + 50 >= productsTotal || productsLoading}
                  onClick={handleProductsNextPage}
                  className="flex items-center gap-1 h-8 px-2.5"
                >
                  <span>{tr("agenticRagLab.embeddings.products.next")}</span>
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FAQs */}
      {tabIndex === 2 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <HelpCircle className="size-5 text-indigo-650" />
              <span>{tr("agenticRagLab.embeddings.faqs.heading")}</span>
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={runFaqBackfill}
              disabled={faqBackfillBusy}
              className="flex items-center gap-1.5"
            >
              {faqBackfillBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>{tr("agenticRagLab.embeddings.faqs.backfill")}</span>
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <th className="px-4 py-3">{tr("agenticRagLab.embeddings.faqs.id")}</th>
                  <th className="px-4 py-3">{tr("agenticRagLab.embeddings.faqs.question")}</th>
                  <th className="px-4 py-3">{tr("agenticRagLab.embeddings.faqs.category")}</th>
                  <th className="px-4 py-3">{tr("agenticRagLab.embeddings.faqs.status")}</th>
                  <th className="px-4 py-3 text-right">{tr("agenticRagLab.embeddings.faqs.embedding")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {faqItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400">
                      {faqLoading ? tr("agenticRagLab.embeddings.faqs.loading") : tr("agenticRagLab.embeddings.faqs.empty")}
                    </td>
                  </tr>
                ) : (
                  faqItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                      <td className="px-4 py-3 text-xs text-slate-500 font-mono">{item.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200">{item.question}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.isActive ? "success" : "secondary"} className="text-[10px]">
                          {item.isActive ? tr("agenticRagLab.embeddings.faqs.active") : tr("agenticRagLab.embeddings.faqs.inactive")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={item.hasEmbedding ? "success" : "warning"} className="text-[10px]">
                          {item.hasEmbedding ? tr("agenticRagLab.embeddings.faqs.done") : tr("agenticRagLab.embeddings.faqs.missing")}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Policies */}
      {tabIndex === 3 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center gap-4 flex-wrap">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <FileText className="size-5 text-indigo-650" />
              <span>{tr("agenticRagLab.embeddings.policies.heading")}</span>
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={runPolicyBackfill}
              disabled={policyBackfillBusy}
              className="flex items-center gap-1.5"
            >
              {policyBackfillBusy ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5 text-indigo-600 dark:text-indigo-400" />
              )}
              <span>{tr("agenticRagLab.embeddings.policies.backfill")}</span>
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase">
                  <th className="px-4 py-3">{tr("agenticRagLab.embeddings.policies.title")}</th>
                  <th className="px-4 py-3">{tr("agenticRagLab.embeddings.policies.category")}</th>
                  <th className="px-4 py-3">{tr("agenticRagLab.embeddings.policies.status")}</th>
                  <th className="px-4 py-3">{tr("agenticRagLab.embeddings.policies.effective")}</th>
                  <th className="px-4 py-3">{tr("agenticRagLab.embeddings.policies.expiry")}</th>
                  <th className="px-4 py-3 text-right">{tr("agenticRagLab.embeddings.policies.embedding")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {policyItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">
                      {policyLoading ? tr("agenticRagLab.embeddings.policies.loading") : tr("agenticRagLab.embeddings.policies.empty")}
                    </td>
                  </tr>
                ) : (
                  policyItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                      <td className="px-4 py-3 text-xs font-semibold text-slate-800 dark:text-slate-200">{item.title}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={item.isActive ? "success" : "secondary"} className="text-[10px]">
                          {item.isActive ? tr("agenticRagLab.embeddings.policies.active") : tr("agenticRagLab.embeddings.policies.inactive")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {item.effectiveAt ? new Date(item.effectiveAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        {item.expiresAt ? new Date(item.expiresAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Badge variant={item.hasEmbedding ? "success" : "warning"} className="text-[10px]">
                          {item.hasEmbedding ? tr("agenticRagLab.embeddings.policies.done") : tr("agenticRagLab.embeddings.policies.missing")}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AgenticRAGLab;
