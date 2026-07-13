import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { buildApiUrl } from "../utils/urlHelper";

type PublicLink = {
  id: string;
  name: string;
  url: string;
  username?: string;
  openMode?: "new_tab" | "in_app";
  hasPassword?: boolean;
};

type PublicResponse = {
  success: boolean;
  data?: {
    company: { id: string; name: string };
    links: PublicLink[];
  };
  message?: string;
};

const ActionIcon = ({ type }: { type: "copy" | "open" }): React.ReactElement => {
  if (type === "copy") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
        <path
          fill="currentColor"
          d="M9 9a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V9Zm-5 4V6a2 2 0 0 1 2-2h7v2H6v7H4Z"
        />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
      <path
        fill="currentColor"
        d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3Zm5 16v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h6v2H5v14h14Z"
      />
    </svg>
  );
};

const PublicCompanyLinks = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [links, setLinks] = useState<PublicLink[]>([]);

  const copyText = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text || "");
      toast.success(successMessage);
    } catch (e) {
      toast.error("فشل النسخ");
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const t = String(token || "").trim();
        if (!t) {
          setError("لينك غير صالح");
          return;
        }

        const res = await fetch(
          buildApiUrl(`public/company-links/${encodeURIComponent(t)}`),
        );
        const data = (await res.json()) as PublicResponse;

        if (!res.ok || !data?.success) {
          setError(data?.message || "لينك غير صالح");
          return;
        }

        setCompanyName(data.data?.company?.name || "");
        setLinks(data.data?.links || []);
      } catch (e: any) {
        setError(e?.message || "فشل في جلب الروابط");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
          <p className="text-sm font-medium">جاري تحميل الروابط...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-slate-900">روابط الشركة</h1>

      {companyName ? (
        <p className="mt-2 text-sm text-slate-500">{companyName}</p>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : links.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
          لا توجد روابط
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6 text-slate-600">
            هذه صفحة عامة لفتح الروابط ونسخ اليوزر. كلمة المرور لا تظهر هنا حفاظًا على الأمان.
          </div>
          <div className="divide-y divide-slate-200">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="text-base font-medium text-slate-900">{link.name}</div>
                  <div className="mt-1 truncate text-sm text-slate-500">{link.url}</div>
                  {link.username ? (
                    <div className="mt-2 text-xs text-slate-400">Username: {link.username}</div>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    onClick={() => {
                      if (!link.url) return;
                      window.open(link.url, "_blank", "noopener,noreferrer");
                    }}
                  >
                    <ActionIcon type="open" />
                    فتح
                  </button>

                  {link.username ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                      onClick={() => copyText(link.username || "", "تم نسخ Username")}
                    >
                      <ActionIcon type="copy" />
                      نسخ Username
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicCompanyLinks;
