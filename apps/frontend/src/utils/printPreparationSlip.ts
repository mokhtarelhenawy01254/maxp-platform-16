import tokenManager from "./tokenManager";

export const printPreparationSlip = async (orderNumber: string) => {
  // فتح نافذة الطباعة فوراً ضمن تفاعل المستخدم لتجنب حجبها بواسطة مانع النوافذ المنبثقة
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    throw new Error("فشل في فتح نافذة جديدة للطباعة");
  }

  const response = await fetch(
    `/api/v1/policy/generate/${encodeURIComponent(orderNumber)}`,
    {
      method: "GET",
      headers: tokenManager.createAuthHeaders(),
    },
  );

  if (!response.ok) {
    printWindow.close();
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const errorData = await response.json();
      throw new Error(errorData.message || "فشل في توليد ورقة التجهيز");
    }

    const errorText = await response.text();
    throw new Error(errorText || "فشل في توليد ورقة التجهيز");
  }

  const htmlContent = await response.text();

  printWindow.document.write(htmlContent);
  printWindow.document.title = `Preparation Slip - ${orderNumber}`;
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 500);

  return true;
};
