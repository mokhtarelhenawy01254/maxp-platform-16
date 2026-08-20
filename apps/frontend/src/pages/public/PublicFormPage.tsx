import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle } from "lucide-react";

interface FormField {
  id: string;
  type: "text" | "email" | "phone" | "textarea" | "select";
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

interface PublicForm {
  id: string;
  title: string;
  description?: string;
  fields: FormField[];
  pixelId?: string;
  submitLabel?: string;
  thankYouTitle?: string;
  thankYouBody?: string;
}

const PublicFormPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const companyId = searchParams.get("companyId");
  const [form, setForm] = useState<PublicForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const params = companyId ? `?companyId=${companyId}` : "";
        const res = await fetch(`/api/v1/public/forms/${slug}${params}`);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || "Form not found");
        setForm(json.data);

        if (json.data.pixelId && typeof window.fbq !== "undefined") {
          window.fbq("init", json.data.pixelId);
          window.fbq("track", "PageView");
        }
      } catch (err: any) {
        setError(err.message);
      }
      setLoading(false);
    })();
  }, [slug]);

  // Inject Facebook Pixel script
  useEffect(() => {
    if (form?.pixelId && !document.getElementById("fb-pixel-script")) {
      const script = document.createElement("script");
      script.id = "fb-pixel-script";
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${form.pixelId}');
      `;
      document.head.appendChild(script);
    }
  }, [form?.pixelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;

    setValidationError("");
    for (const field of form.fields) {
      if (field.required && !values[field.id]?.trim()) {
        setValidationError(`الحقل "${field.label}" مطلوب`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const params = companyId ? `?companyId=${companyId}` : "";
      const res = await fetch(`/api/v1/public/forms/${slug}/submit${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: values }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "حدث خطأ");

      if (form.pixelId && typeof window.fbq !== "undefined") {
        window.fbq("track", "Lead");
      }

      setSubmitted(true);
    } catch (err: any) {
      setValidationError(err.message);
    }
    setSubmitting(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 size={32} className="animate-spin text-blue-500" /></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500"><p>{error}</p></div>;
  if (!form) return null;

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle size={64} className="mx-auto mb-4 text-green-500" />
          <h1 className="text-2xl font-bold mb-2">{form.thankYouTitle || "شكراً لك!"}</h1>
          <p className="text-gray-500">{form.thankYouBody || "سيتم التواصل معك قريباً"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8 max-w-lg w-full">
        <h1 className="text-xl md:text-2xl font-bold mb-2">{form.title}</h1>
        {form.description && <p className="text-gray-500 text-sm mb-6">{form.description}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {form.fields.map((field) => (
            <div key={field.id}>
              <label className="block text-sm font-medium mb-1">
                {field.label}
                {field.required && <span className="text-red-500 mr-1">*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  value={values[field.id] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              ) : field.type === "select" ? (
                <select
                  value={values[field.id] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                >
                  <option value="">{field.placeholder || "اختر..."}</option>
                  {(field.options || []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : (
                <input
                  type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                  value={values[field.id] || ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full border rounded-lg px-3 py-2 dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              )}
            </div>
          ))}

          {validationError && <p className="text-red-500 text-sm">{validationError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
          >
            {submitting ? <Loader2 size={18} className="animate-spin inline ml-1" /> : null}
            {form.submitLabel || "إرسال"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PublicFormPage;
