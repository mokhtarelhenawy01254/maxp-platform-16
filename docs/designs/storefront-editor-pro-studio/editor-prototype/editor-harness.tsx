/**
 * Harness اختبار محلي لمحرر الواجهة — بدون تسجيل دخول أو خادم.
 * يُقدَّم على:  http://localhost:3000/editor-harness.html
 * (ملف مؤقت للاختبار فقط — يُحذف بعد انتهاء التحقق)
 */
import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import StorefrontEditor from "../pages/settings/StorefrontEditor";
import "../styles/index.css";

ReactDOM.createRoot(document.getElementById("harness-root")!).render(
  <React.StrictMode>
    <MemoryRouter initialEntries={["/settings/storefront/editor"]}>
      <StorefrontEditor />
      <Toaster position="top-right" />
    </MemoryRouter>
  </React.StrictMode>,
);
