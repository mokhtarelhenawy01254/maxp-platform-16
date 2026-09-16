// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import ProductImageLandingPage from "../pages/ProductImageLandingPage";

const storefrontApiMocks = vi.hoisted(() => ({
  getProductLanding: vi.fn(),
  getProductLandingPreview: vi.fn(),
  createOrder: vi.fn(),
  trackProductLandingOrder: vi.fn(),
}));

vi.mock("sonner", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../../utils/storefrontApi", () => ({
  getCompanyId: () => "company-1",
  getStorefrontScope: () => null,
  storefrontApi: storefrontApiMocks,
}));

vi.mock("../hooks/useStorefrontSettings", () => ({
  useStorefrontSettings: () => ({ settings: null, isLoading: false, error: null }),
}));

const baseProduct = {
  id: "prod-1",
  companyId: "company-1",
  name: "Swan Sneaker",
  slug: "swan-sneaker",
  description: "<p>سنيكر يومي خفيف بنعل مريح ومناسب للمشاوير اليومية.</p>",
  price: 620,
  comparePrice: 750,
  mainImage: "https://cdn.example.com/product.jpg",
  images: ["https://cdn.example.com/product.jpg"],
  productVariants: [
    {
      id: "variant-37-black",
      productId: "prod-1",
      name: "Black - 37",
      price: 620,
      isActive: true,
      attributes: { Color: "Black", Size: "37" },
      attributeValues: { Color: "Black", Size: "37" },
    },
    {
      id: "variant-38-white",
      productId: "prod-1",
      name: "White - 38",
      price: 620,
      isActive: true,
      attributes: { Color: "White", Size: "38" },
      attributeValues: { Color: "White", Size: "38" },
    },
  ],
};

const renderLanding = (path = "/store/lp/swan-sneaker-flux?companyId=company-1&preview=1") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/store/lp/:id" element={<ProductImageLandingPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("ProductImageLandingPage", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("composes a product-first landing page from product data and generated campaign assets", async () => {
    storefrontApiMocks.getProductLandingPreview.mockResolvedValueOnce({
      data: {
        landing: {
          id: "landing-1",
          companyId: "company-1",
          productId: "prod-1",
          slug: "swan-sneaker-flux",
          title: "Swan Sneaker Flux",
          status: "DRAFT",
          generationMode: "IMAGE_STACK",
          generationStatus: "READY_TO_REVIEW",
          slices: [
            {
              id: "slice-1",
              src: "/uploads/studio_images/swan-ai.jpg",
              alt: "Generated clean sneaker asset",
              width: 1024,
              height: 1024,
            },
          ],
          formConfig: {
            orderKicker: "نموذج الطلب",
            orderTitle: "اطلب Swan Sneaker",
            orderCopy: "اختار المقاس واللون وسيتم التواصل معك للتأكيد.",
            buttonLabel: "تأكيد الطلب",
          },
        },
        product: baseProduct,
        company: {
          id: "company-1",
          name: "Swan",
          currency: "EGP",
        },
      },
    });

    renderLanding();

    expect(await screen.findByAltText("Swan Sneaker")).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { name: "اطلب Swan Sneaker" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /تأكيد الطلب/ })).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("<p>");
    expect(screen.getByLabelText("الاسم")).toBeInTheDocument();
    expect(screen.getByLabelText("المقاس")).toBeInTheDocument();
    expect(screen.getByLabelText("اللون")).toBeInTheDocument();
  });

  it("still renders a usable landing page when only the product image is available", async () => {
    storefrontApiMocks.getProductLandingPreview.mockResolvedValueOnce({
      data: {
        landing: {
          id: "landing-2",
          companyId: "company-1",
          productId: "prod-1",
          slug: "swan-sneaker-product-only",
          title: "Swan Sneaker Product Only",
          status: "DRAFT",
          generationMode: "IMAGE_STACK",
          generationStatus: "NEEDS_IMAGES",
          slices: [],
          formConfig: {
            orderTitle: "اطلب Swan Sneaker",
            buttonLabel: "تأكيد الطلب",
          },
        },
        product: baseProduct,
        company: {
          id: "company-1",
          name: "Swan",
          currency: "EGP",
        },
      },
    });

    renderLanding("/store/lp/swan-sneaker-product-only?companyId=company-1&preview=1");

    expect(
      await screen.findByRole("heading", { name: "اطلب Swan Sneaker" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("صفحة الهبوط المصورة غير جاهزة لهذا المنتج بعد."),
    ).not.toBeInTheDocument();
  });

  it("hides visually blank campaign slices instead of showing a broken black block", async () => {
    const originalImage = window.Image;
    const originalGetContext = HTMLCanvasElement.prototype.getContext;

    class MockImage {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      naturalWidth = 48;
      naturalHeight = 48;
      crossOrigin = "";
      decoding = "async";

      set src(_value: string) {
        queueMicrotask(() => {
          this.onload?.();
        });
      }
    }

    Object.defineProperty(window, "Image", {
      configurable: true,
      writable: true,
      value: MockImage,
    });

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
      getImageData: () => ({
        data: new Uint8ClampedArray(Array.from({ length: 48 * 48 * 4 }, (_, index) =>
          (index + 1) % 4 === 0 ? 255 : 0,
        )),
      }),
    })) as typeof HTMLCanvasElement.prototype.getContext;

    storefrontApiMocks.getProductLandingPreview.mockResolvedValueOnce({
      data: {
        landing: {
          id: "landing-3",
          companyId: "company-1",
          productId: "prod-1",
          slug: "swan-sneaker-black-slice",
          title: "Swan Sneaker Black Slice",
          status: "DRAFT",
          generationMode: "IMAGE_STACK",
          generationStatus: "READY_TO_REVIEW",
          slices: [
            {
              id: "slice-black",
              src: "/uploads/studio_images/black-slice.jpg",
              alt: "Blank generated slice",
              width: 1024,
              height: 1024,
            },
          ],
          formConfig: {
            orderTitle: "اطلب Swan Sneaker",
            buttonLabel: "تأكيد الطلب",
          },
        },
        product: baseProduct,
        company: {
          id: "company-1",
          name: "Swan",
          currency: "EGP",
        },
      },
    });

    renderLanding("/store/lp/swan-sneaker-black-slice?companyId=company-1&preview=1");

    await screen.findByRole("heading", { name: "اطلب Swan Sneaker" });
    await waitFor(() => {
      expect(screen.queryByAltText("Blank generated slice")).not.toBeInTheDocument();
    });

    Object.defineProperty(window, "Image", {
      configurable: true,
      writable: true,
      value: originalImage,
    });
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  });

  it("renders rich sections: BREAKDOWN, COMPARISON, LIVE_PROOF, and single order heading", async () => {
    storefrontApiMocks.getProductLandingPreview.mockResolvedValueOnce({
      data: {
        landing: {
          id: "landing-rich",
          companyId: "company-1",
          productId: "prod-1",
          slug: "swan-sneaker-rich",
          title: "Swan Sneaker Rich",
          status: "DRAFT",
          generationMode: "IMAGE_STACK",
          generationStatus: "READY_TO_REVIEW",
          slices: [],
          sections: [
            {
              id: "sec-bd",
              type: "BREAKDOWN",
              title: "تشريح المنتج",
              enabled: true,
              content: {
                breakdownTitle: "تشريح ومواصفات تصنيع Swan Sneaker",
                breakdownItems: [
                  { title: "نعل طبي ماص للصدمات", desc: "راحة الكعب", icon: "👟", tag: "طبي 100%" },
                ],
              },
            },
            {
              id: "sec-comp",
              type: "COMPARISON",
              title: "جدول المقارنة",
              enabled: true,
              content: {
                comparisonTitle: "لماذا تختار Swan Sneaker الأصلي؟",
                comparisonUsLabel: "Swan Sneaker الأصلي",
                comparisonThemLabel: "المنتجات المقلدة",
                comparisonItems: [
                  { feature: "الخامات", us: "جلد صناعي نخب أول", them: "بلاستيك رديء" },
                ],
              },
            },
            {
              id: "sec-proof",
              type: "LIVE_PROOF",
              title: "إثبات حي",
              enabled: true,
              content: {
                satisfactionRate: "4.9 / 5",
                recentOrders: [
                  { buyer: "أحمد م.", city: "الإسكندرية", timeAgo: "منذ دقيقتين", item: "Swan Sneaker" },
                ],
              },
            },
            {
              id: "sec-form",
              type: "FORM",
              title: "نموذج الشراء",
              enabled: true,
              content: {
                orderKicker: "نموذج الطلب",
                orderTitle: "اطلب Swan Sneaker الآن",
                orderCopy: "املأ بياناتك للشحن السريع.",
                buttonLabel: "تأكيد الطلب",
              },
            },
          ],
          formConfig: {
            orderTitle: "اطلب Swan Sneaker الآن",
            buttonLabel: "تأكيد الطلب",
          },
        },
        product: baseProduct,
        company: {
          id: "company-1",
          name: "Swan",
          currency: "EGP",
        },
      },
    });

    renderLanding("/store/lp/swan-sneaker-rich?companyId=company-1&preview=1");

    expect(await screen.findByText("تشريح ومواصفات تصنيع Swan Sneaker")).toBeInTheDocument();
    expect(screen.getByText("لماذا تختار Swan Sneaker الأصلي؟")).toBeInTheDocument();
    expect(screen.getByText("طلب مباشر نشط الآن")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "اطلب Swan Sneaker الآن" })).toBeInTheDocument();
    expect(screen.getByText("جلد صناعي نخب أول")).toBeInTheDocument();
  });

  it("renders alternative section variants (WHATSAPP, DUAL_CARDS, CHECKLIST, OFFICIAL_SEAL)", async () => {
    storefrontApiMocks.getProductLandingPreview.mockResolvedValueOnce({
      data: {
        landing: {
          id: "landing-variants",
          companyId: "company-1",
          productId: "prod-1",
          slug: "swan-variants",
          title: "Swan Variants",
          status: "DRAFT",
          generationMode: "IMAGE_STACK",
          generationStatus: "READY_TO_REVIEW",
          slices: [],
          sections: [
            {
              id: "sec-breakdown-chk",
              type: "BREAKDOWN",
              variant: "CHECKLIST",
              title: "فحص الجودة والمواصفات",
              enabled: true,
              content: {
                breakdownTitle: "معايير الجودة والمطابقة",
                breakdownItems: [
                  { title: "نعل طبي ماص للصدمات", desc: "مرونة كاملة لراحة القدم", tag: "طبي" },
                ],
              },
            },
            {
              id: "sec-comp-dual",
              type: "COMPARISON",
              variant: "DUAL_CARDS",
              title: "المقارنة الثنائية",
              enabled: true,
              content: {
                comparisonTitle: "مقارنة ثنائية واضحة",
                comparisonUsLabel: "منتجنا الأصلي",
                comparisonThemLabel: "المنتج المقلد",
                comparisonItems: [
                  { feature: "الخامة", us: "جلد نخب أول", them: "بلاستيك رديء" },
                ],
              },
            },
            {
              id: "sec-feat-seal",
              type: "FEATURES",
              variant: "OFFICIAL_SEAL",
              title: "الضمان المعتمد",
              enabled: true,
              content: {},
            },
            {
              id: "sec-rev-wa",
              type: "REVIEWS",
              variant: "WHATSAPP",
              title: "آراء واتساب",
              enabled: true,
              content: {
                reviews: [
                  { name: "أميرة من القاهرة", text: "الكوتشي خرافة ومريح جداً في المشي", rating: 5 },
                ],
              },
            },
            {
              id: "sec-form",
              type: "FORM",
              title: "طلب سريع",
              enabled: true,
              content: {
                orderTitle: "اطلب الآن",
                buttonLabel: "تأكيد الطلب",
              },
            },
          ],
          formConfig: {
            orderTitle: "اطلب الآن",
            buttonLabel: "تأكيد الطلب",
          },
        },
        product: baseProduct,
        company: {
          id: "company-1",
          name: "Swan",
          currency: "EGP",
        },
      },
    });

    renderLanding("/store/lp/swan-variants?companyId=company-1&preview=1");

    expect((await screen.findAllByText("معايير الجودة والمطابقة"))[0]).toBeInTheDocument();
    expect(screen.getByText("مقارنة ثنائية واضحة")).toBeInTheDocument();
    expect(screen.getByText("منتجنا الأصلي ✓")).toBeInTheDocument();
    expect(screen.getByText("احذر من التقليد ✕")).toBeInTheDocument();
    expect(screen.getByText("وثيقة الضمان الذهبية المعتمدة")).toBeInTheDocument();
    expect(screen.getByText("محادثات ورسائل العملاء على واتساب")).toBeInTheDocument();
    expect(screen.getByText("الكوتشي خرافة ومريح جداً في المشي")).toBeInTheDocument();
    expect(screen.getByText("مشتري مؤكد ✓")).toBeInTheDocument();
  });

  it("renders CRO upgrades: BEFORE_AFTER slider, VIDEO_REEL player, live Price Breakdown, Sticky CTA, and Floating WhatsApp", async () => {
    storefrontApiMocks.getProductLandingPreview.mockResolvedValueOnce({
      data: {
        landing: {
          id: "landing-cro-upgrade",
          companyId: "company-1",
          productId: "prod-1",
          slug: "swan-cro-upgrade",
          title: "Swan CRO Upgrade",
          status: "DRAFT",
          generationMode: "IMAGE_STACK",
          generationStatus: "READY_TO_REVIEW",
          slices: [],
          sections: [
            {
              id: "sec-ba-1",
              type: "BEFORE_AFTER",
              title: "شاهد الفرق بالعين المجردة",
              enabled: true,
              content: {
                beforeLabel: "أحذية مقلدة",
                afterLabel: "كوتشي سوان الطبي",
                beforeImage: "https://example.com/before.jpg",
                afterImage: "https://example.com/after.jpg",
              },
            },
            {
              id: "sec-vr-1",
              type: "VIDEO_REEL",
              title: "فيديو أنبوكسينغ وتجربة حية",
              enabled: true,
              content: {
                videoUrl: "https://example.com/video.mp4",
                videoCaption: "شاهد تجربة الكوتشي على الطبيعة",
              },
            },
            {
              id: "sec-form-cro",
              type: "FORM",
              title: "نموذج الطلب",
              enabled: true,
              content: {
                orderTitle: "اطلب الآن",
                buttonLabel: "تأكيد الطلب",
                whatsappSupportPhone: "01012345678",
                bundles: [
                  { qty: 1, label: "قطعة واحدة", discountPercent: 0, badge: "", freeGift: "" },
                  { qty: 2, label: "قطعتين (وفر 20%)", discountPercent: 20, badge: "الأكثر مبيعاً", freeGift: "شراب قطني" },
                ],
              },
            },
          ],
          formConfig: {
            orderTitle: "اطلب الآن",
            buttonLabel: "تأكيد الطلب",
          },
        },
        product: baseProduct,
        company: {
          id: "company-1",
          name: "Swan",
          currency: "EGP",
          phone: "01012345678",
        },
      },
    });

    renderLanding("/store/lp/swan-cro-upgrade?companyId=company-1&preview=1");

    // Before/After section
    expect((await screen.findAllByText("شاهد الفرق بالعين المجردة"))[0]).toBeInTheDocument();
    expect(screen.getByText("أحذية مقلدة")).toBeInTheDocument();
    expect(screen.getByText("كوتشي سوان الطبي")).toBeInTheDocument();

    // Video Reel section
    expect(screen.getByText("فيديو أنبوكسينغ وتجربة حية")).toBeInTheDocument();
    expect(screen.getByText("شاهد تجربة الكوتشي على الطبيعة")).toBeInTheDocument();

    // Price Breakdown & Custom Bundles
    expect(screen.getByText("قطعتين (وفر 20%)")).toBeInTheDocument();
    expect(screen.getByText("الأكثر مبيعاً")).toBeInTheDocument();
    expect(screen.getByLabelText("تفاصيل الحساب النهائي")).toBeInTheDocument();
    expect(screen.getByText(/الشحن والتوصيل:/i)).toBeInTheDocument();

    // Sticky CTA & Floating WhatsApp
    expect(screen.getByRole("region", { name: "شريط الشراء السريع" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "تواصل عبر واتساب للمساعدة السريعة" })).toBeInTheDocument();
  });

  it("renders 2026 CRO additions: COUNTDOWN clock, multi-item bundle customizer, notes field, and 1-click WhatsApp order", async () => {
    storefrontApiMocks.getProductLandingPreview.mockResolvedValueOnce({
      data: {
        landing: {
          id: "landing-cro-2026",
          companyId: "company-1",
          productId: "prod-1",
          slug: "swan-cro-2026",
          title: "Swan CRO 2026",
          status: "DRAFT",
          generationMode: "IMAGE_STACK",
          generationStatus: "READY_TO_REVIEW",
          slices: [],
          sections: [
            {
              id: "sec-cd-1",
              type: "COUNTDOWN",
              title: "العد التنازلي",
              enabled: true,
              content: {
                text: "عرض خاص لفترة محدودة — اطلب قبل انتهاء الكمية",
                lowStockCount: 5,
              },
            },
            {
              id: "sec-form-cro-2026",
              type: "FORM",
              title: "نموذج الطلب",
              enabled: true,
              content: {
                orderTitle: "اطلب Swan Sneaker 2026",
                buttonLabel: "تأكيد الطلب الآن",
                whatsappSupportPhone: "01096781290",
                bundles: [
                  { qty: 1, label: "قطعة واحدة", discountPercent: 0, badge: "", freeGift: "" },
                  { qty: 2, label: "قطعتين (وفر 20%)", discountPercent: 20, badge: "الأكثر مبيعاً", freeGift: "شراب قطني" },
                ],
              },
            },
          ],
          formConfig: {
            orderTitle: "اطلب Swan Sneaker 2026",
            buttonLabel: "تأكيد الطلب الآن",
          },
        },
        product: baseProduct,
        company: {
          id: "company-1",
          name: "Swan",
          currency: "EGP",
          phone: "01096781290",
        },
      },
    });

    renderLanding("/store/lp/swan-cro-2026?companyId=company-1&preview=1");

    // 1. Countdown Section
    expect((await screen.findAllByText("عرض خاص لفترة محدودة — اطلب قبل انتهاء الكمية"))[0]).toBeInTheDocument();
    expect(screen.getByText("متبقي 5 قطع فقط بهذا السعر")).toBeInTheDocument();
    expect(screen.getByLabelText("الوقت المتبقي لانتهاء العرض")).toBeInTheDocument();

    // 2. Delivery notes field
    expect(screen.getByLabelText("ملاحظات إضافية للتوصيل (اختياري)")).toBeInTheDocument();

    // 3. 1-Click WhatsApp Quick Order button
    const waQuickBtn = screen.getByLabelText("الطلب السريع عبر واتساب");
    expect(waQuickBtn).toBeInTheDocument();
    expect(waQuickBtn.getAttribute("href")).toContain("https://wa.me/201096781290");

    // 4. Multi-item bundle selection
    const bundle2Btn = screen.getByText("قطعتين (وفر 20%)");
    bundle2Btn.click();

    await waitFor(() => {
      expect(screen.getByLabelText("تحديد تفاصيل كل قطعة في الباقة")).toBeInTheDocument();
      expect(screen.getByText("القطعة 1")).toBeInTheDocument();
      expect(screen.getByText("القطعة 2")).toBeInTheDocument();
    });
  });

  it("extracts variants from PostgreSQL metadata (Arabic keys with trailing _:), respects product nature, and orders selectors before customer details", async () => {
    const dashProduct = {
      id: "cmtr9fcsg05lbjufbt95y4rw0",
      companyId: "company-1",
      name: "Dash Sneaker",
      slug: "dash-sneaker",
      description: "حذاء رياضي مريح وعصري",
      price: 620,
      comparePrice: 750,
      mainImage: "https://cdn.example.com/dash.jpg",
      images: ["https://cdn.example.com/dash.jpg"],
      productVariants: [
        {
          id: "variant-dash-37-white-burgundy",
          productId: "cmtr9fcsg05lbjufbt95y4rw0",
          name: "37 - ابيض في نبيتي",
          price: 620,
          isActive: true,
          metadata: JSON.stringify({
            attributeValues: {
              "المقاس_:": "37",
              "اللون_:": "ابيض في نبيتي",
            },
          }),
        },
        {
          id: "variant-dash-38-white-grey",
          productId: "cmtr9fcsg05lbjufbt95y4rw0",
          name: "38 - ابيض في رمادي",
          price: 620,
          isActive: true,
          metadata: JSON.stringify({
            attributeValues: {
              "المقاس_:": "38",
              "اللون_:": "ابيض في رمادي",
            },
          }),
        },
      ],
    };

    storefrontApiMocks.getProductLandingPreview.mockResolvedValueOnce({
      data: {
        landing: {
          id: "landing-dash",
          companyId: "company-1",
          productId: "cmtr9fcsg05lbjufbt95y4rw0",
          slug: "dash-sneaker",
          title: "كوتشي داش فلوكس",
          status: "DRAFT",
          generationMode: "IMAGE_STACK",
          generationStatus: "READY_TO_REVIEW",
          slices: [
            {
              id: "slice-1",
              src: "https://cdn.example.com/dash-hero.jpg",
              alt: "Dash Hero",
            },
          ],
          formConfig: {
            orderKicker: "عرض حصري",
            orderTitle: "اطلب كوتشي داش الآن",
            orderCopy: "التوصيل مجاني والمعاينة قبل الاستلام",
            buttonLabel: "تأكيد الطلب الآن",
          },
        },
        product: dashProduct,
        company: {
          id: "company-1",
          name: "Swan",
          currency: "EGP",
        },
      },
    });

    renderLanding("/store/lp/dash-sneaker?companyId=company-1&preview=1");

    await screen.findByRole("heading", { name: "اطلب كوتشي داش الآن" });

    // Verify Arabic variant options extracted from Prisma metadata are rendered as selectable chip buttons
    expect(screen.getByRole("button", { name: /ابيض في نبيتي/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ابيض في رمادي/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "37" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "38" })).toBeInTheDocument();

    // Verify field order matches canonical store layout: Name -> Phone -> Color -> Size -> Governorate
    const colorBlock = screen.getByLabelText("اختيار اللون");
    const nameInput = screen.getByLabelText("الاسم");
    const govSelect = screen.getByLabelText("المحافظة");
    expect(nameInput.compareDocumentPosition(colorBlock) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(colorBlock.compareDocumentPosition(govSelect) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("verifies 1:1 canonical store checkout form layout, symmetrical SVG trust badges, and WhatsApp dialogue with store reply", async () => {
    storefrontApiMocks.getProductLandingPreview.mockResolvedValueOnce({
      data: {
        landing: {
          id: "landing-canonical",
          companyId: "company-1",
          productId: "prod-1",
          slug: "swan-canonical-store-checkout",
          title: "سوان سنيكرز كلاسيك",
          status: "DRAFT",
          generationMode: "IMAGE_STACK",
          generationStatus: "READY_TO_REVIEW",
          slices: [
            {
              id: "slice-hero",
              src: "https://cdn.example.com/clean-hero.jpg",
              alt: "Clean Product Hero Asset",
            },
          ],
          sections: [
            {
              id: "sec-wa",
              type: "REVIEWS",
              variant: "WHATSAPP",
              enabled: true,
              content: {
                reviews: [
                  { name: "أحمد فهمي", comment: "المنتج ممتاز جدا ومريح في المشي", rating: 5 },
                ],
              },
            },
          ],
          formConfig: {
            orderTitle: "اطلب الحذاء الآن",
            buttonLabel: "تأكيد الطلب الآن",
          },
        },
        product: {
          ...baseProduct,
          productVariants: [
            {
              id: "var-1",
              productId: "prod-1",
              name: "ابيض - 37",
              price: 620,
              isActive: true,
              attributes: { "اللون_:": "ابيض", "المقاس_:": "37" },
            },
            {
              id: "var-2",
              productId: "prod-1",
              name: "ابيض بتطعيم احمر - 38",
              price: 620,
              isActive: true,
              attributes: { "اللون_:": "ابيض بتطعيم احمر", "المقاس_:": "38" },
            },
          ],
        },
        company: {
          id: "company-1",
          name: "Swan",
          currency: "EGP",
        },
      },
    });

    renderLanding("/store/lp/swan-canonical-store-checkout?companyId=company-1&preview=1");

    await screen.findByRole("heading", { name: "اطلب الحذاء الآن" });

    // 1. Check strict DOM order of form fields matching media_1789555611902.png
    const nameField = screen.getByLabelText("الاسم");
    const phoneField = screen.getByLabelText("رقم الموبايل");
    const colorRadioGroup = screen.getByLabelText("اختيار اللون");
    const sizeRadioGroup = screen.getByLabelText("اختيار المقاس");
    const govField = screen.getByLabelText("المحافظة");
    const areaField = screen.getByLabelText("المنطقة");
    const addressField = screen.getByLabelText("العنوان بالتفصيل");
    const notesField = screen.getByLabelText("ملاحظات إضافية للتوصيل (اختياري)");

    expect(nameField.compareDocumentPosition(phoneField) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(phoneField.compareDocumentPosition(colorRadioGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(colorRadioGroup.compareDocumentPosition(sizeRadioGroup) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(sizeRadioGroup.compareDocumentPosition(govField) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(govField.compareDocumentPosition(areaField) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(areaField.compareDocumentPosition(addressField) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(addressField.compareDocumentPosition(notesField) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // 2. Check Placeholders match store 1:1
    expect(nameField).toHaveAttribute("placeholder", "اكتب اسمك بالكامل");
    expect(phoneField).toHaveAttribute("placeholder", "01xxxxxxxxx");
    expect(areaField).toHaveAttribute("placeholder", "مثال: مدينة نصر");
    expect(addressField).toHaveAttribute("placeholder", "الشارع، العمارة، الدور، علامة مميزة");
    expect(notesField).toHaveAttribute("placeholder", "مثال: موعد مفضل للتسليم، أو الاتصال قبل الوصول");

    // 3. Color chips show radio indicators (● for selected, ○ for unselected)
    const whiteColorBtn = screen.getByRole("button", { name: "ابيض" });
    const redAccentBtn = screen.getByRole("button", { name: "ابيض بتطعيم احمر" });
    expect(whiteColorBtn).toHaveTextContent("●");
    expect(redAccentBtn).toHaveTextContent("○");

    // 4. Trust Badges: Symmetrical 3-items with stroke icons, no emoji litter
    expect(screen.getByText("معاينة قبل الدفع")).toBeInTheDocument();
    expect(screen.getByText("الدفع نقدياً عند الاستلام")).toBeInTheDocument();
    expect(screen.getByText("استبدال واسترجاع سهل")).toBeInTheDocument();

    // 5. WhatsApp Reviews: Authentic Header, incoming review, and store response bubble
    expect(screen.getByText("فريق خدمة عملاء المتجر")).toBeInTheDocument();
    expect(screen.getByText("أحمد فهمي")).toBeInTheDocument();
    expect(screen.getByText("فريق الدعم")).toBeInTheDocument();
    expect(screen.getByText(/أهلاً بحضرتك يا فندم!/)).toBeInTheDocument();

    // 6. Anti-bot verification: Ensure no conversational chatbot or AI prompt fluff is present
    expect(document.querySelector(".bot-chat-container")).toBeNull();
    expect(document.querySelector(".ai-chat-thread")).toBeNull();
  });
});

