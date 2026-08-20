import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiUrl } from "../../config/environment";
import { getCompanyId } from "../../utils/storefrontApi";
import { useStorefrontTheme } from "../engine/ThemeProvider";

interface ReturnReason {
  id: string;
  reason: string;
  description?: string;
  category?: {
    id: string;
    name: string;
  };
}

const ReturnsPage: React.FC = () => {
  const { theme } = useStorefrontTheme();
  const companyId = getCompanyId();

  const [orderNumber, setOrderNumber] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [reasonId, setReasonId] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [reasons, setReasons] = useState<ReturnReason[]>([]);
  const [loadingReasons, setLoadingReasons] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const isRTL = theme.direction === "rtl";
  const dir = isRTL ? "rtl" : "ltr";

  useEffect(() => {
    if (!companyId) return;
    const fetchReasons = async () => {
      try {
        const res = await fetch(
          `${getApiUrl()}/returns/public/reasons?companyId=${companyId}`,
        );
        const data = await res.json();
        if (data.reasons) {
          setReasons(data.reasons);
        }
      } catch {
        toast.error(isRTL ? "┘ü╪┤┘ä ╪¬╪¡┘à┘è┘ä ╪ú╪│╪¿╪º╪¿ ╪º┘ä╪Ñ╪▒╪¼╪º╪╣" : "Failed to load return reasons");
      } finally {
        setLoadingReasons(false);
      }
    };
    fetchReasons();
  }, [companyId, isRTL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) {
      toast.error(isRTL ? "┘è╪▒╪¼┘ë ╪Ñ╪»╪«╪º┘ä ╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿" : "Please enter order number");
      return;
    }
    if (!emailOrPhone.trim()) {
      toast.error(isRTL ? "┘è╪▒╪¼┘ë ╪Ñ╪»╪«╪º┘ä ╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ╪ú┘ê ╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü" : "Please enter email or phone");
      return;
    }
    if (!reasonId) {
      toast.error(isRTL ? "┘è╪▒╪¼┘ë ╪º╪«╪¬┘è╪º╪▒ ╪│╪¿╪¿ ╪º┘ä╪Ñ╪▒╪¼╪º╪╣" : "Please select a return reason");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${getApiUrl()}/returns/public/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: orderNumber.trim(), emailOrPhone: emailOrPhone.trim(), reasonId, customerNotes }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isRTL ? "┘ü╪┤┘ä ╪¬┘é╪»┘è┘à ╪º┘ä╪╖┘ä╪¿" : "Request failed"));
      }
      setSuccess(true);
      toast.success(isRTL ? "╪¬┘à ╪¬┘é╪»┘è┘à ╪╖┘ä╪¿ ╪º┘ä╪Ñ╪▒╪¼╪º╪╣ ╪¿┘å╪¼╪º╪¡" : "Return request submitted successfully");
    } catch (err: any) {
      toast.error(err.message || (isRTL ? "╪¡╪»╪½ ╪«╪╖╪ú" : "An error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const containerClasses = "max-w-2xl mx-auto px-4 py-12 md:py-16";

  if (success) {
    return (
      <div className={containerClasses} dir={dir}>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">&#10003;</div>
          <h2 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
            {isRTL ? "╪¬┘à ╪¬┘é╪»┘è┘à ╪╖┘ä╪¿ ╪º┘ä╪Ñ╪▒╪¼╪º╪╣ ╪¿┘å╪¼╪º╪¡" : "Return Request Submitted"}
          </h2>
          <p className="text-green-600 dark:text-green-400">
            {isRTL
              ? "╪│┘å┘é┘ê┘à ╪¿┘à╪▒╪º╪¼╪╣╪⌐ ╪╖┘ä╪¿┘â ┘ê╪º┘ä╪¬┘ê╪º╪╡┘ä ┘à╪╣┘â ┘é╪▒┘è╪¿╪º┘ï"
              : "We will review your request and contact you soon"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses} dir={dir}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {isRTL ? "╪╖┘ä╪¿ ╪Ñ╪▒╪¼╪º╪╣" : "Return Request"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          {isRTL
            ? "┘è╪▒╪¼┘ë ╪Ñ╪»╪«╪º┘ä ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪╖┘ä╪¿ ╪º┘ä╪░┘è ╪¬╪▒╪║╪¿ ┘ü┘è ╪Ñ╪▒╪¼╪º╪╣┘ç"
            : "Please enter the details of the order you wish to return"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isRTL ? "╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿" : "Order Number"}
          </label>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder={isRTL ? "╪ú╪»╪«┘ä ╪▒┘é┘à ╪º┘ä╪╖┘ä╪¿" : "Enter order number"}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isRTL ? "╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ╪ú┘ê ╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü" : "Email or Phone Number"}
          </label>
          <input
            type="text"
            value={emailOrPhone}
            onChange={(e) => setEmailOrPhone(e.target.value)}
            placeholder={isRTL ? "╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ╪ú┘ê ╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü ╪º┘ä┘à╪│╪¼┘ä ┘ü┘è ╪º┘ä╪╖┘ä╪¿" : "Email or phone used in the order"}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isRTL ? "╪│╪¿╪¿ ╪º┘ä╪Ñ╪▒╪¼╪º╪╣" : "Return Reason"}
          </label>
          {loadingReasons ? (
            <div className="px-4 py-3 text-gray-400">{isRTL ? "╪¼╪º╪▒┘è ╪º┘ä╪¬╪¡┘à┘è┘ä..." : "Loading..."}</div>
          ) : reasons.length === 0 ? (
            <div className="px-4 py-3 text-gray-400">{isRTL ? "┘ä╪º ╪¬┘ê╪¼╪» ╪ú╪│╪¿╪º╪¿ ┘à╪¬╪º╪¡╪⌐" : "No reasons available"}</div>
          ) : (
            <select
              value={reasonId}
              onChange={(e) => setReasonId(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              required
            >
              <option value="">{isRTL ? "╪º╪«╪¬╪▒ ╪º┘ä╪│╪¿╪¿" : "Select reason"}</option>
              {reasons.map((reason) => (
                <option key={reason.id} value={reason.id}>
                  {reason.reason}
                  {reason.category ? ` (${reason.category.name})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isRTL ? "┘à┘ä╪º╪¡╪╕╪º╪¬ ╪Ñ╪╢╪º┘ü┘è╪⌐" : "Additional Notes"}
          </label>
          <textarea
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            rows={4}
            placeholder={isRTL ? "╪ú┘è ╪¬┘ü╪º╪╡┘è┘ä ╪Ñ╪╢╪º┘ü┘è╪⌐ ╪╣┘å ╪│╪¿╪¿ ╪º┘ä╪Ñ╪▒╪¼╪º╪╣" : "Any additional details about the return"}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 px-6 bg-primary text-primary-foreground disabled:opacity-50 font-medium rounded-[var(--radius)] transition-colors hover:opacity-90"
        >
          {submitting
            ? (isRTL ? "╪¼╪º╪▒┘è ╪º┘ä╪Ñ╪▒╪│╪º┘ä..." : "Submitting...")
            : (isRTL ? "╪¬┘é╪»┘è┘à ╪╖┘ä╪¿ ╪º┘ä╪Ñ╪▒╪¼╪º╪╣" : "Submit Return Request")}
        </button>
      </form>
    </div>
  );
};

export default ReturnsPage;
