import React, { useState } from "react";
import { Check } from "lucide-react";
import { submitPublicLead } from "../../../services/publicLeadService";
import { LANDING_SLUG, WHATSAPP_CONSULT_URL } from "./csbData";

interface Props {
  utm: Record<string, string>;
}

/** التقاط الـleads للتجار اللي مش مستعجلين يشترك — نفس endpoint اللاندنجات الموجودة. */
export const CsbLead: React.FC<Props> = ({ utm }) => {
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    if (!firstName.trim() || !phone.trim()) return;
    setState("sending");
    try {
      const res = await submitPublicLead({
        firstName: firstName.trim(),
        phone: phone.trim(),
        companyName: companyName.trim() || undefined,
        source: LANDING_SLUG,
        pageSlug: LANDING_SLUG,
        landingPath: window.location.pathname,
        referrer: document.referrer || undefined,
        utm,
        notes: "Lead من لاندنج باقة المتجر الكاملة — مهتم بتجربة/اشتراك الباقة",
      });
      setState(res?.success ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  return (
    <section className="csb-section" id="lead">
      <div className="csb-calc csb-lead-grid csb-reveal">
        <div className="csb-calc-out" style={{ justifyContent: "center" }}>
          <h2
            style={{
              fontSize: "clamp(20px, 2.6vw, 27px)",
              fontWeight: 800,
              margin: 0,
              lineHeight: 1.5,
              color: "#f5f1e8",
            }}
          >
            مش مستعجل تشترك؟ عادي.
          </h2>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.9, color: "rgba(245,241,232,0.72)" }}>
            سيب رقمك واسم متجرك — بنكلمك على واتساب، نشوف وضعك الحالي، ونقولك بصراحة
            هل الباقة هتفيدك ولا لأ. من غير ضغط ولا مكالمات بيع متعرقة.
          </p>
          <a
            href={WHATSAPP_CONSULT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="csb-btn csb-btn-sm"
            style={{ background: "transparent", color: "#9fd8bd", border: "1px solid rgba(127,208,174,0.4)", alignSelf: "flex-start" }}
          >
            أو كلمنا انت على واتساب
          </a>
        </div>

        <div className="csb-calc-input">
          {state === "done" ? (
            <div style={{ display: "grid", gap: 10, textAlign: "center", padding: "12px 0" }}>
              <Check size={26} strokeWidth={2.5} style={{ color: "var(--csb-green)", margin: "0 auto" }} />
              <strong style={{ fontSize: 16 }}>استلمنا رقمك</strong>
              <span style={{ fontSize: 12.5, color: "var(--csb-ink-soft)", lineHeight: 1.8 }}>
                هنكلمك على واتساب في أقرب وقت — لو الموضوع مستعجل كلمنا انت على الزر الأخضر.
              </span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
              <label htmlFor="csb-lead-name" style={{ fontSize: 14, fontWeight: 700 }}>
                اسمك
              </label>
              <input
                id="csb-lead-name"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="csb-lead-input"
                placeholder="مثال: محمود"
              />
              <label htmlFor="csb-lead-phone" style={{ fontSize: 14, fontWeight: 700 }}>
                رقم الواتساب
              </label>
              <input
                id="csb-lead-phone"
                type="tel"
                required
                inputMode="tel"
                dir="ltr"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="csb-lead-input"
                placeholder="01xxxxxxxxx"
                style={{ textAlign: "right" }}
              />
              <label htmlFor="csb-lead-store" style={{ fontSize: 14, fontWeight: 700 }}>
                اسم المتجر <span style={{ fontWeight: 500, color: "var(--csb-ink-soft)" }}>(اختياري)</span>
              </label>
              <input
                id="csb-lead-store"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="csb-lead-input"
                placeholder="مثال: م store للإلكترونيات"
              />
              <button
                type="submit"
                className="csb-btn csb-btn-primary"
                disabled={state === "sending"}
                style={{ width: "100%", marginTop: 4 }}
              >
                {state === "sending" ? "بنبعت…" : "ابعت — ونكلمك على واتساب"}
              </button>
              {state === "error" && (
                <span style={{ fontSize: 12, color: "var(--csb-red)" }}>
                  حصلت مشكلة في الإرسال — جرب تاني أو كلمنا مباشرة على واتساب.
                </span>
              )}
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
