// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { StudioInspectorContentTab } from "../studio/inspector/StudioInspectorContentTab";
import { StudioArrayRepeaterControl } from "../studio/inspector/StudioArrayRepeaterControl";

describe("Studio Manifest-Driven Content Inspector & Dynamic Array Repeater", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  describe("1. Before/After Section Manifest Fields & Image Picker Targets", () => {
    it("renders beforeImage, afterImage, beforeLabel, afterLabel and allows editing", () => {
      const onUpdateField = vi.fn();
      const onOpenImagePicker = vi.fn();

      render(
        <StudioInspectorContentTab
          sectionType="before-after"
          settings={{
            title: "مقارنة قبل وبعد",
            subtitle: "شاهد الفرق المباشر",
            beforeImage: "https://example.com/before.jpg",
            afterImage: "https://example.com/after.jpg",
            beforeLabel: "قبل",
            afterLabel: "بعد",
          }}
          onUpdateField={onUpdateField}
          onOpenImagePicker={onOpenImagePicker}
        />
      );

      // Verify beforeLabel input is rendered and editable
      const beforeLabelInput = screen.getByTestId("input-beforeLabel") as HTMLInputElement;
      expect(beforeLabelInput).toBeTruthy();
      expect(beforeLabelInput.value).toBe("قبل");
      fireEvent.change(beforeLabelInput, { target: { value: "قبل الترميم" } });
      expect(onUpdateField).toHaveBeenCalledWith("beforeLabel", "قبل الترميم");

      // Verify afterLabel input is rendered and editable
      const afterLabelInput = screen.getByTestId("input-afterLabel") as HTMLInputElement;
      expect(afterLabelInput).toBeTruthy();
      expect(afterLabelInput.value).toBe("بعد");
      fireEvent.change(afterLabelInput, { target: { value: "بعد الترميم" } });
      expect(onUpdateField).toHaveBeenCalledWith("afterLabel", "بعد الترميم");

      // Verify beforeImage direct input is rendered and editable
      const beforeImageInput = screen.getByTestId("input-beforeImage") as HTMLInputElement;
      expect(beforeImageInput.value).toBe("https://example.com/before.jpg");
      fireEvent.change(beforeImageInput, { target: { value: "https://example.com/new-before.jpg" } });
      expect(onUpdateField).toHaveBeenCalledWith("beforeImage", "https://example.com/new-before.jpg");

      // Verify image picker buttons target the exact field names
      const beforePickerBtn = screen.getByTestId("image-picker-btn-beforeImage");
      fireEvent.click(beforePickerBtn);
      expect(onOpenImagePicker).toHaveBeenCalledWith("beforeImage");

      const afterPickerBtn = screen.getByTestId("image-picker-btn-afterImage");
      fireEvent.click(afterPickerBtn);
      expect(onOpenImagePicker).toHaveBeenCalledWith("afterImage");
    });
  });

  describe("2. Story Parallax Manifest Fields", () => {
    it("renders content textarea and overlayOpacity number input and allows editing", () => {
      const onUpdateField = vi.fn();
      const onOpenImagePicker = vi.fn();

      render(
        <StudioInspectorContentTab
          sectionType="story-parallax"
          settings={{
            badge: "حكاية علامتنا",
            title: "قصة الشغف والتميز",
            content: "نص القصة الأصلي يشرح الحرفة.",
            image: "https://example.com/story.jpg",
            overlayOpacity: 0.45,
            ctaText: "اقرئي المزيد",
            ctaLink: "/about",
          }}
          onUpdateField={onUpdateField}
          onOpenImagePicker={onOpenImagePicker}
        />
      );

      // Verify content textarea
      const contentTextarea = screen.getByTestId("input-content") as HTMLTextAreaElement;
      expect(contentTextarea).toBeTruthy();
      expect(contentTextarea.value).toBe("نص القصة الأصلي يشرح الحرفة.");
      fireEvent.change(contentTextarea, {
        target: { value: "نص القصة المحدث بعد التحرير." },
      });
      expect(onUpdateField).toHaveBeenCalledWith("content", "نص القصة المحدث بعد التحرير.");

      // Verify overlayOpacity number input
      const opacityInput = screen.getByTestId("input-overlayOpacity") as HTMLInputElement;
      expect(opacityInput).toBeTruthy();
      expect(Number(opacityInput.value)).toBe(0.45);
      fireEvent.change(opacityInput, { target: { value: "0.85" } });
      expect(onUpdateField).toHaveBeenCalledWith("overlayOpacity", 0.85);

      // Verify image picker targets "image"
      const imagePickerBtn = screen.getByTestId("image-picker-btn-image");
      fireEvent.click(imagePickerBtn);
      expect(onOpenImagePicker).toHaveBeenCalledWith("image");
    });
  });

  describe("3. Dynamic Array Repeater Control (Empty State & Item Editing)", () => {
    it("allows adding items from empty state (length === 0) in features-bar", () => {
      const onUpdateField = vi.fn();

      const { rerender } = render(
        <StudioInspectorContentTab
          sectionType="features-bar"
          settings={{
            title: "لماذا تختارنا",
            items: [],
          }}
          onUpdateField={onUpdateField}
        />
      );

      // Verify repeater header and empty state message
      expect(screen.getByText(/العناصر الفرعية \(0\)/)).toBeTruthy();
      expect(screen.getByText(/لا توجد عناصر حالياً/)).toBeTruthy();

      // Click "إضافة عنصر" button
      const addBtn = screen.getByTestId("btn-add-items");
      fireEvent.click(addBtn);

      // Verify onUpdateField called with array containing 1 item
      expect(onUpdateField).toHaveBeenCalledWith(
        "items",
        expect.arrayContaining([
          expect.objectContaining({
            title: expect.any(String),
          }),
        ])
      );

      // Rerender with 1 item present
      rerender(
        <StudioInspectorContentTab
          sectionType="features-bar"
          settings={{
            title: "لماذا تختارنا",
            items: [
              {
                title: "شحن سريع ومجاني",
                description: "توصيل خلال 24-48 ساعة لجميع المحافظات",
                icon: "🚚",
              },
            ],
          }}
          onUpdateField={onUpdateField}
        />
      );

      expect(screen.getByText(/العناصر الفرعية \(1\)/)).toBeTruthy();
      expect(screen.getByText("شحن سريع ومجاني")).toBeTruthy();

      // If card is not already expanded, expand it
      let itemTitleInput = screen.queryByTestId("input-items-0-title") as HTMLInputElement;
      if (!itemTitleInput) {
        fireEvent.click(screen.getByTestId("btn-toggle-expand-items-0"));
        itemTitleInput = screen.getByTestId("input-items-0-title") as HTMLInputElement;
      }

      expect(itemTitleInput.value).toBe("شحن سريع ومجاني");
      fireEvent.change(itemTitleInput, { target: { value: "شحن فائق السرعة" } });

      expect(onUpdateField).toHaveBeenCalledWith("items", [
        expect.objectContaining({
          title: "شحن فائق السرعة",
        }),
      ]);
    });

    it("allows adding questions from empty state in faq-accordion", () => {
      const onUpdateField = vi.fn();

      const { rerender } = render(
        <StudioInspectorContentTab
          sectionType="faq-accordion"
          settings={{}}
          onUpdateField={onUpdateField}
        />
      );

      // Verify repeater header for questions
      expect(screen.getByText(/الأسئلة الشائعة \(0\)/)).toBeTruthy();

      // Click "إضافة عنصر"
      const addBtn = screen.getByTestId("btn-add-questions");
      fireEvent.click(addBtn);

      expect(onUpdateField).toHaveBeenCalledWith(
        "questions",
        expect.arrayContaining([
          expect.objectContaining({
            question: "سؤال جديد؟",
            answer: "الإجابة التوضيحية...",
          }),
        ])
      );

      // Rerender with added question
      rerender(
        <StudioInspectorContentTab
          sectionType="faq-accordion"
          settings={{
            questions: [
              {
                question: "هل يتوفر الدفع عند الاستلام؟",
                answer: "نعم متاح في كافة مدن مصر.",
              },
            ],
          }}
          onUpdateField={onUpdateField}
        />
      );

      expect(screen.getByText("هل يتوفر الدفع عند الاستلام؟")).toBeTruthy();

      // If card is not already expanded, expand it
      let answerInput = screen.queryByTestId("input-questions-0-answer") as HTMLTextAreaElement;
      if (!answerInput) {
        fireEvent.click(screen.getByTestId("btn-toggle-expand-questions-0"));
        answerInput = screen.getByTestId("input-questions-0-answer") as HTMLTextAreaElement;
      }

      expect(answerInput.value).toBe("نعم متاح في كافة مدن مصر.");

      fireEvent.change(answerInput, {
        target: { value: "متاح الدفع عند الاستلام مع معاينة المنتج مجاناً." },
      });

      expect(onUpdateField).toHaveBeenCalledWith("questions", [
        expect.objectContaining({
          answer: "متاح الدفع عند الاستلام مع معاينة المنتج مجاناً.",
        }),
      ]);
    });

    it("supports reordering and deleting items in StudioArrayRepeaterControl", () => {
      const onUpdateField = vi.fn();

      render(
        <StudioArrayRepeaterControl
          arrayKey="items"
          items={[
            { title: "عنصر 1" },
            { title: "عنصر 2" },
            { title: "عنصر 3" },
          ]}
          onUpdateField={onUpdateField}
        />
      );

      // Move element 0 down
      const moveDownBtn = screen.getByTestId("btn-move-down-items-0");
      fireEvent.click(moveDownBtn);
      expect(onUpdateField).toHaveBeenCalledWith("items", [
        { title: "عنصر 2" },
        { title: "عنصر 1" },
        { title: "عنصر 3" },
      ]);

      // Delete element 1
      const deleteBtn = screen.getByTestId("btn-delete-items-1");
      fireEvent.click(deleteBtn);
      expect(onUpdateField).toHaveBeenCalledWith("items", [
        { title: "عنصر 1" },
        { title: "عنصر 3" },
      ]);
    });
  });

  describe("4. Preserves Extra / Unregistered Settings Without Data Loss", () => {
    it("renders unregistered settings in collapsible extra drawer", () => {
      const onUpdateField = vi.fn();

      render(
        <StudioInspectorContentTab
          sectionType="before-after"
          settings={{
            title: "مقارنة",
            customHandleColor: "#ff0055",
            customDividerWidth: 3,
          }}
          onUpdateField={onUpdateField}
        />
      );

      expect(screen.getByTestId("extra-settings-drawer")).toBeTruthy();
      expect(screen.getByText("إعدادات إضافية (2)")).toBeTruthy();

      const colorInput = screen.getByTestId("input-extra-customHandleColor") as HTMLInputElement;
      expect(colorInput.value).toBe("#ff0055");
      fireEvent.change(colorInput, { target: { value: "#00ffaa" } });
      expect(onUpdateField).toHaveBeenCalledWith("customHandleColor", "#00ffaa");
    });
  });

  describe("5. Package C: String Array & Advanced Item Keys in Repeater Control", () => {
    it("detects string[] and renders text inputs without object corruption", () => {
      const onUpdateField = vi.fn();

      render(
        <StudioArrayRepeaterControl
          arrayKey="tags"
          items={["عرض خاص", "توصيل مجاني"]}
          onUpdateField={onUpdateField}
        />
      );

      // Verify clean input without object stringification
      const input0 = screen.getByTestId("input-tags-0") as HTMLInputElement;
      expect(input0.value).toBe("عرض خاص");

      fireEvent.change(input0, { target: { value: "عرض الصيف" } });
      expect(onUpdateField).toHaveBeenCalledWith("tags", ["عرض الصيف", "توصيل مجاني"]);

      // Verify adding item appends empty string
      const addBtn = screen.getByTestId("btn-add-tags");
      fireEvent.click(addBtn);
      expect(onUpdateField).toHaveBeenCalledWith("tags", ["عرض خاص", "توصيل مجاني", ""]);
    });

    it("supports hotspot keys (x, y, productId) in repeater control", () => {
      const onUpdateField = vi.fn();

      render(
        <StudioArrayRepeaterControl
          arrayKey="hotspots"
          items={[{ title: "نقطة 1", x: 20, y: 40, productId: "prod-99" }]}
          onUpdateField={onUpdateField}
        />
      );

      // Expand first hotspot
      const expandBtn = screen.getByTestId("btn-toggle-expand-hotspots-0");
      fireEvent.click(expandBtn);

      const xInput = screen.getByTestId("input-hotspots-0-x") as HTMLInputElement;
      expect(Number(xInput.value)).toBe(20);
      fireEvent.change(xInput, { target: { value: "35" } });
      expect(onUpdateField).toHaveBeenCalledWith("hotspots", [
        { title: "نقطة 1", x: 35, y: 40, productId: "prod-99" },
      ]);

      const prodInput = screen.getByTestId("input-hotspots-0-productId") as HTMLInputElement;
      expect(prodInput.value).toBe("prod-99");
      fireEvent.change(prodInput, { target: { value: "prod-100" } });
      expect(onUpdateField).toHaveBeenCalledWith("hotspots", [
        { title: "نقطة 1", x: 20, y: 40, productId: "prod-100" },
      ]);
    });

    it("supports tier keys (quantity, discount) in repeater control", () => {
      const onUpdateField = vi.fn();

      render(
        <StudioArrayRepeaterControl
          arrayKey="tiers"
          items={[{ title: "حزمة", quantity: 2, discount: "15%" }]}
          onUpdateField={onUpdateField}
        />
      );

      const expandBtn = screen.getByTestId("btn-toggle-expand-tiers-0");
      fireEvent.click(expandBtn);

      const qtyInput = screen.getByTestId("input-tiers-0-quantity") as HTMLInputElement;
      expect(Number(qtyInput.value)).toBe(2);
      fireEvent.change(qtyInput, { target: { value: "3" } });
      expect(onUpdateField).toHaveBeenCalledWith("tiers", [
        { title: "حزمة", quantity: 3, discount: "15%" },
      ]);
    });

    it("supports review keys (author, quote) in repeater control", () => {
      const onUpdateField = vi.fn();

      render(
        <StudioArrayRepeaterControl
          arrayKey="reviews"
          items={[{ name: "سارة", author: "سارة", quote: "منتج رائع جداً!" }]}
          onUpdateField={onUpdateField}
        />
      );

      const expandBtn = screen.getByTestId("btn-toggle-expand-reviews-0");
      fireEvent.click(expandBtn);

      const authorInput = screen.getByTestId("input-reviews-0-author") as HTMLInputElement;
      expect(authorInput.value).toBe("سارة");
      fireEvent.change(authorInput, { target: { value: "سارة أحمد" } });
      expect(onUpdateField).toHaveBeenCalled();

      const quoteInput = screen.getByTestId("input-reviews-0-quote") as HTMLTextAreaElement;
      expect(quoteInput.value).toBe("منتج رائع جداً!");
      fireEvent.change(quoteInput, { target: { value: "منتج استثنائي!" } });
      expect(onUpdateField).toHaveBeenCalled();
    });
  });
});
