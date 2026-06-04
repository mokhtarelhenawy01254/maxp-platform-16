import React, { useState, useEffect } from "react";
import { buildApiUrl } from "../utils/urlHelper";

const TestMinimal: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🧪 [TestMinimal] Component mounted");

    // Get company identifier from URL or auth cache
    const params = new URLSearchParams(window.location.search);
    const companyIdFromQuery = params.get("companyId")?.trim();

    let companyId =
      companyIdFromQuery || localStorage.getItem("storefront_companyId") || "";

    if (!companyId) {
      try {
        const rawUser = localStorage.getItem("user");
        if (rawUser) {
          const parsed = JSON.parse(rawUser) as {
            companyId?: string;
            company?: { id?: string; slug?: string } | null;
          };

          companyId =
            parsed.company?.slug?.trim() ||
            parsed.companyId?.trim() ||
            parsed.company?.id?.trim() ||
            "";
        }
      } catch {
        companyId = "";
      }
    }

    console.log("🧪 [TestMinimal] Company ID:", companyId);

    if (!companyId) {
      setData({
        success: false,
        message: "No company identifier available",
      });
      setLoading(false);
      return;
    }

    // Fetch storefront public settings using the current company identifier.
    const url = buildApiUrl(
      `public/storefront/settings?companyId=${encodeURIComponent(companyId)}`,
    );

    console.log("🧪 [TestMinimal] Fetching:", url);

    fetch(url)
      .then(async (response) => {
        console.log("🧪 [TestMinimal] Response status:", response.status);
        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
          const fallbackText = await response.text().catch(() => "");
          throw new Error(
            `HTTP ${response.status}: ${fallbackText.slice(0, 120) || "Request failed"}`,
          );
        }

        if (!contentType.includes("application/json")) {
          const fallbackText = await response.text().catch(() => "");
          throw new Error(
            `Expected JSON but received ${contentType || "unknown"}: ${fallbackText.slice(0, 120)}`,
          );
        }

        return response.json();
      })
      .then((result) => {
        console.log("🧪 [TestMinimal] Data received:", result);
        setData(result);
        setLoading(false);
      })
      .catch((error) => {
        setData({
          success: false,
          message: error instanceof Error ? error.message : String(error),
        });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f3f4f6",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "24px", marginBottom: "16px" }}>
            ⏳ جاري التحميل...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f3f4f6",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "40px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
      >
        <div
          style={{
            backgroundColor: "#10b981",
            color: "white",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "30px",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "32px", margin: "0 0 10px 0" }}>✅ نجح!</h1>
          <p style={{ margin: 0, fontSize: "18px" }}>
            الصفحة تعمل بدون تحويل لتسجيل الدخول
          </p>
        </div>

        <div
          style={{
            backgroundColor: "#eff6ff",
            padding: "20px",
            borderRadius: "8px",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{ fontSize: "20px", marginBottom: "10px", color: "#1e40af" }}
          >
            📊 البيانات المستلمة:
          </h2>
          <pre
            style={{
              backgroundColor: "#1e293b",
              color: "#e2e8f0",
              padding: "16px",
              borderRadius: "6px",
              overflow: "auto",
              fontSize: "14px",
            }}
          >
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>

        <div
          style={{
            backgroundColor: "#fef3c7",
            padding: "20px",
            borderRadius: "8px",
            border: "2px solid #fbbf24",
          }}
        >
          <h3
            style={{ fontSize: "18px", marginBottom: "10px", color: "#92400e" }}
          >
            💡 ملاحظة مهمة:
          </h3>
          <p style={{ margin: 0, color: "#78350f", lineHeight: "1.6" }}>
            هذه الصفحة لا تستخدم أي imports من services أو hooks معقدة. فقط
            React + fetch API البسيط.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TestMinimal;
