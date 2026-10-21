// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, renderHook, act } from "@testing-library/react";

import { StudioPagesPanel } from "../studio/StudioPagesPanel";
import { StudioElementsPanel } from "../studio/StudioElementsPanel";
import { useStorefrontStudioState } from "../studio/hooks/useStorefrontStudioState";
import { STUDIO_PAGES, type StudioPageDefinition, type SavedStudioSection } from "../studio/StudioTypes";

// Mock React Router
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useLocation: () => ({ pathname: "/", search: "", hash: "", state: null, key: "test" }),
    Link: ({ children, to, className }: any) => <a href={to} className={className}>{children}</a>,
  };
});

describe("Ticket QW-A: Page Management (Delete/Duplicate/Rename) + Saved Sections Library", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. حذف صفحة مخصصة يزيلها من الخريطتين (pages + pageOverrides)
  // ─────────────────────────────────────────────────────────────
  it("Criterion 1: handleDeletePage removes custom page from both pages and pageOverrides in the same update", () => {
    let currentTokens: Record<string, any> = {
      pages: {
        "custom-landing": {
          id: "custom-landing",
          title: "صفحة الهبوط",
          label: "صفحة الهبوط",
          sections: [{ type: "hero-banner", key: "hero-1" }],
        },
      },
      pageOverrides: {
        "custom-landing": {
          id: "custom-landing",
          title: "صفحة الهبوط",
          label: "صفحة الهبوط",
          sections: [{ type: "hero-banner", key: "hero-1" }],
        },
      },
    };

    const onChange = vi.fn((next: Record<string, any>) => {
      currentTokens = next;
    });
    const onSave = vi.fn();

    const { result } = renderHook(() =>
      useStorefrontStudioState({
        themeId: "modern-minimal",
        externalDesignTokens: currentTokens,
        onChange,
        onSave,
      })
    );

    act(() => {
      const success = result.current.handleDeletePage("custom-landing");
      expect(success).toBe(true);
    });

    expect(onChange).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalled();
    expect(currentTokens.pages["custom-landing"]).toBeUndefined();
    expect(currentTokens.pageOverrides["custom-landing"]).toBeUndefined();
  });

  // ─────────────────────────────────────────────────────────────
  // 2. حماية صفحات الثيم الـ12 من الحذف
  // ─────────────────────────────────────────────────────────────
  it("Criterion 2: handleDeletePage strictly protects the 12 standard theme pages from deletion", () => {
    let currentTokens: Record<string, any> = {
      pages: {
        home: { id: "home", sections: [{ type: "hero-banner", key: "hero-1" }] },
        shop: { id: "shop", sections: [{ type: "product-grid", key: "grid-1" }] },
      },
      pageOverrides: {
        home: { id: "home", sections: [{ type: "hero-banner", key: "hero-1" }] },
      },
    };

    const onChange = vi.fn((next: Record<string, any>) => {
      currentTokens = next;
    });
    const onSave = vi.fn();

    const { result } = renderHook(() =>
      useStorefrontStudioState({
        themeId: "modern-minimal",
        externalDesignTokens: currentTokens,
        onChange,
        onSave,
      })
    );

    STUDIO_PAGES.forEach((themePage) => {
      act(() => {
        const deleted = result.current.handleDeletePage(themePage.id);
        expect(deleted).toBe(false);
      });
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(currentTokens.pages.home).toBeDefined();
  });

  // ─────────────────────────────────────────────────────────────
  // 3. التبديل إلى "home" إذا كانت الصفحة المحذوفة هي النشطة
  // ─────────────────────────────────────────────────────────────
  it("Criterion 3: Deleting the activePageKey resets activePageKey safely to 'home'", () => {
    let currentTokens: Record<string, any> = {
      pages: {
        "about-store": {
          id: "about-store",
          title: "عن المتجر",
          label: "عن المتجر",
          sections: [{ type: "info-content", key: "info-1" }],
        },
      },
      pageOverrides: {
        "about-store": {
          id: "about-store",
          title: "عن المتجر",
          label: "عن المتجر",
          sections: [{ type: "info-content", key: "info-1" }],
        },
      },
    };

    const onChange = vi.fn((next: Record<string, any>) => {
      currentTokens = next;
    });

    const { result } = renderHook(() =>
      useStorefrontStudioState({
        themeId: "modern-minimal",
        externalDesignTokens: currentTokens,
        onChange,
        onSave: vi.fn(),
      })
    );

    act(() => {
      result.current.setActivePageKey("about-store");
    });
    expect(result.current.activePageKey).toBe("about-store");

    act(() => {
      result.current.handleDeletePage("about-store");
    });

    expect(result.current.activePageKey).toBe("home");
  });

  // ─────────────────────────────────────────────────────────────
  // 4. تكرار صفحة ينسخ الأقسام بدقة مع توليد مفاتيح فريدة وإعادة التوجيه
  // ─────────────────────────────────────────────────────────────
  it("Criterion 4: handleDuplicatePage clones sections, generates unique keys, sets label (نسخة), and redirects activePageKey", () => {
    let currentTokens: Record<string, any> = {
      pages: {
        "about-us": {
          id: "about-us",
          title: "من نحن",
          label: "من نحن",
          sections: [
            { type: "hero-banner", key: "hero-orig", settings: { title: "أهلاً بكم" } },
            {
              type: "container",
              key: "cont-orig",
              children: [{ type: "heading", key: "head-orig", settings: { text: "عنوان" } }],
            },
          ],
        },
      },
      pageOverrides: {
        "about-us": {
          id: "about-us",
          title: "من نحن",
          label: "من نحن",
          sections: [
            { type: "hero-banner", key: "hero-orig", settings: { title: "أهلاً بكم" } },
            {
              type: "container",
              key: "cont-orig",
              children: [{ type: "heading", key: "head-orig", settings: { text: "عنوان" } }],
            },
          ],
        },
      },
    };

    const onChange = vi.fn((next: Record<string, any>) => {
      currentTokens = next;
    });
    const onSave = vi.fn();

    const { result } = renderHook(() =>
      useStorefrontStudioState({
        themeId: "modern-minimal",
        externalDesignTokens: currentTokens,
        onChange,
        onSave,
      })
    );

    let duplicatedSlug: string | undefined;
    act(() => {
      duplicatedSlug = result.current.handleDuplicatePage("about-us");
    });

    expect(duplicatedSlug).toBe("about-us-copy");
    expect(result.current.activePageKey).toBe("about-us-copy");
    expect(onSave).toHaveBeenCalled();

    const copyInPages = currentTokens.pages["about-us-copy"];
    const copyInOverrides = currentTokens.pageOverrides["about-us-copy"];

    expect(copyInPages).toBeDefined();
    expect(copyInOverrides).toBeDefined();
    expect(copyInPages.label).toBe("من نحن (نسخة)");
    expect(copyInPages.title).toBe("من نحن (نسخة)");

    // Sections cloned
    expect(copyInPages.sections).toHaveLength(2);
    expect(copyInPages.sections[0].type).toBe("hero-banner");
    expect(copyInPages.sections[0].key).not.toBe("hero-orig");
    expect(copyInPages.sections[0].settings.title).toBe("أهلاً بكم");

    // Children keys regenerated
    expect(copyInPages.sections[1].key).not.toBe("cont-orig");
    expect(copyInPages.sections[1].children[0].key).not.toBe("head-orig");
  });

  // ─────────────────────────────────────────────────────────────
  // 5. إعادة تسمية صفحة وتحديثها في الخريطتين
  // ─────────────────────────────────────────────────────────────
  it("Criterion 5: handleRenamePage persists new title and label in both pages and pageOverrides", () => {
    let currentTokens: Record<string, any> = {
      pages: {
        faq: { id: "faq", title: "الأسئلة", label: "الأسئلة", sections: [] },
      },
      pageOverrides: {
        faq: { id: "faq", title: "الأسئلة", label: "الأسئلة", sections: [] },
      },
    };

    const onChange = vi.fn((next: Record<string, any>) => {
      currentTokens = next;
    });
    const onSave = vi.fn();

    const { result } = renderHook(() =>
      useStorefrontStudioState({
        themeId: "modern-minimal",
        externalDesignTokens: currentTokens,
        onChange,
        onSave,
      })
    );

    act(() => {
      result.current.handleRenamePage("faq", "الأسئلة الشائعة والأجوبة");
    });

    expect(onSave).toHaveBeenCalled();
    expect(currentTokens.pages.faq.title).toBe("الأسئلة الشائعة والأجوبة");
    expect(currentTokens.pages.faq.label).toBe("الأسئلة الشائعة والأجوبة");
    expect(currentTokens.pageOverrides.faq.title).toBe("الأسئلة الشائعة والأجوبة");
    expect(currentTokens.pageOverrides.faq.label).toBe("الأسئلة الشائعة والأجوبة");
  });

  // ─────────────────────────────────────────────────────────────
  // 6. حفظ قسم محدد وتجريد الـ key الأصلي وتخزينه في designTokens.savedSections
  // ─────────────────────────────────────────────────────────────
  it("Criterion 6: handleSaveSection stores deep clone without original key in designTokens.savedSections", () => {
    let currentTokens: Record<string, any> = {
      pages: {
        home: {
          sections: [
            {
              type: "hero-banner",
              key: "hero-original-key-123",
              label: "بنر الصيف",
              settings: { title: "تخفيضات كبرى", ctaText: "اغتنم العرض" },
            },
          ],
        },
      },
    };

    const onChange = vi.fn((next: Record<string, any>) => {
      currentTokens = next;
    });
    const onSave = vi.fn();

    const { result } = renderHook(() =>
      useStorefrontStudioState({
        themeId: "modern-minimal",
        externalDesignTokens: currentTokens,
        onChange,
        onSave,
      })
    );

    act(() => {
      result.current.setSelectedSectionKey("hero-original-key-123");
    });

    let savedItem: any;
    act(() => {
      savedItem = result.current.handleSaveSection("قسم البنر المفضل");
    });

    expect(onSave).toHaveBeenCalled();
    expect(savedItem).toBeDefined();
    expect(savedItem.label).toBe("قسم البنر المفضل");
    expect(savedItem.type).toBe("hero-banner");
    expect(savedItem.settings.title).toBe("تخفيضات كبرى");
    // Ensure original key was stripped
    expect(savedItem.key).toBeUndefined();

    // Verify stored in designTokens.savedSections
    expect(currentTokens.savedSections).toBeDefined();
    expect(currentTokens.savedSections).toHaveLength(1);
    expect(currentTokens.savedSections[0].id).toBe(savedItem.id);
  });

  // ─────────────────────────────────────────────────────────────
  // 7. زر "احفظ القسم" في لوحة العناصر معطل عند غياب التحديد
  // ─────────────────────────────────────────────────────────────
  it("Criterion 7: Save section button in StudioElementsPanel is disabled when no section is selected", () => {
    const onSaveSection = vi.fn();

    render(
      <StudioElementsPanel
        onAddSection={vi.fn()}
        onOpenFullCatalog={vi.fn()}
        onClose={vi.fn()}
        selectedSectionConfig={null}
        onSaveSection={onSaveSection}
      />
    );

    const saveButton = screen.getByTestId("save-section-button") as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    fireEvent.click(saveButton);
    expect(onSaveSection).not.toHaveBeenCalled();
    expect(screen.queryByTestId("save-section-modal")).toBeNull();
  });

  // ─────────────────────────────────────────────────────────────
  // 8. إدراج قسم محفوظ في صفحة يضيف نسخة جديدة بمفاتيح فريدة
  // ─────────────────────────────────────────────────────────────
  it("Criterion 8: handleAddSavedSection inserts saved section with newly generated keys into active sections", () => {
    let currentTokens: Record<string, any> = {
      pages: {
        home: {
          sections: [{ type: "newsletter", key: "news-1" }],
        },
      },
      pageOverrides: {
        home: {
          sections: [{ type: "newsletter", key: "news-1" }],
        },
      },
    };

    const onChange = vi.fn((next: Record<string, any>) => {
      currentTokens = next;
    });
    const onSave = vi.fn();

    const { result } = renderHook(() =>
      useStorefrontStudioState({
        themeId: "modern-minimal",
        externalDesignTokens: currentTokens,
        onChange,
        onSave,
      })
    );

    const savedSection: SavedStudioSection = {
      id: "saved-hero-999",
      label: "بانر محفوظ",
      type: "hero-banner",
      settings: { title: "بانر محفوظ خاص" },
    };

    let insertedKey: any;
    act(() => {
      insertedKey = result.current.handleAddSavedSection(savedSection);
    });

    expect(onSave).toHaveBeenCalled();
    expect(insertedKey).toBeDefined();
    expect(insertedKey).toMatch(/^hero-banner-/);
    expect(result.current.selectedSectionKey).toBe(insertedKey);

    const activeSections = result.current.activeSections;
    expect(activeSections).toHaveLength(2);
    expect(activeSections[1].type).toBe("hero-banner");
    expect(activeSections[1].settings.title).toBe("بانر محفوظ خاص");
    expect(activeSections[1].key).toBe(insertedKey);
  });

  // ─────────────────────────────────────────────────────────────
  // 9. حذف قسم من المكتبة يزيله من savedSections ويوثق الحفظ
  // ─────────────────────────────────────────────────────────────
  it("Criterion 9: handleDeleteSavedSection removes the section from designTokens.savedSections", () => {
    let currentTokens: Record<string, any> = {
      savedSections: [
        { id: "saved-1", label: "قسم 1", type: "features-bar" },
        { id: "saved-2", label: "قسم 2", type: "reviews" },
      ],
    };

    const onChange = vi.fn((next: Record<string, any>) => {
      currentTokens = next;
    });
    const onSave = vi.fn();

    const { result } = renderHook(() =>
      useStorefrontStudioState({
        themeId: "modern-minimal",
        externalDesignTokens: currentTokens,
        onChange,
        onSave,
      })
    );

    expect(result.current.savedSections).toHaveLength(2);

    act(() => {
      result.current.handleDeleteSavedSection("saved-1");
    });

    expect(onSave).toHaveBeenCalled();
    expect(currentTokens.savedSections).toHaveLength(1);
    expect(currentTokens.savedSections[0].id).toBe("saved-2");
  });

  // ─────────────────────────────────────────────────────────────
  // 10. سقف الحد الأقصى 50 قسماً مع إزالة الأقدم
  // ─────────────────────────────────────────────────────────────
  it("Criterion 10: savedSections caps at 50 items and purges the oldest section on overflow", () => {
    // Generate exactly 50 saved sections
    const existing50: SavedStudioSection[] = Array.from({ length: 50 }, (_, i) => ({
      id: `saved-old-${i + 1}`,
      label: `قسم قديم ${i + 1}`,
      type: "richtext",
      settings: { index: i + 1 },
      createdAt: new Date(Date.now() - (50 - i) * 1000).toISOString(),
    }));

    let currentTokens: Record<string, any> = {
      savedSections: existing50,
      pages: {
        home: {
          sections: [
            {
              type: "countdown-banner",
              key: "countdown-active",
              label: "المؤقت الجديد",
              settings: { title: "القسم رقم 51" },
            },
          ],
        },
      },
    };

    const onChange = vi.fn((next: Record<string, any>) => {
      currentTokens = next;
    });

    const { result } = renderHook(() =>
      useStorefrontStudioState({
        themeId: "modern-minimal",
        externalDesignTokens: currentTokens,
        onChange,
        onSave: vi.fn(),
      })
    );

    act(() => {
      result.current.setSelectedSectionKey("countdown-active");
    });

    act(() => {
      result.current.handleSaveSection("قسم 51 الجديد");
    });

    expect(currentTokens.savedSections).toHaveLength(50);
    // Newest is at index 0
    expect(currentTokens.savedSections[0].label).toBe("قسم 51 الجديد");
    // Oldest item (saved-old-49 / last element of old array) dropped from end
    const hasOldest = currentTokens.savedSections.some((s: any) => s.id === "saved-old-50");
    expect(hasOldest).toBe(false);
  });

  // ─────────────────────────────────────────────────────────────
  // 11. تفاعل StudioPagesPanel (تكرار / حذف / إعادة تسمية)
  // ─────────────────────────────────────────────────────────────
  it("Criterion 11: StudioPagesPanel renders duplicate, rename, and delete actions for custom pages with confirmations", () => {
    const customPages: StudioPageDefinition[] = [
      { id: "landing-v1", label: "صفحة الهبوط V1", icon: "📄", description: "/landing-v1" },
    ];

    const onDeletePage = vi.fn();
    const onDuplicatePage = vi.fn();
    const onRenamePage = vi.fn();
    const onSelectPage = vi.fn();

    render(
      <StudioPagesPanel
        activePageKey="home"
        onSelectPage={onSelectPage}
        onClose={vi.fn()}
        customPages={customPages}
        onDeletePage={onDeletePage}
        onDuplicatePage={onDuplicatePage}
        onRenamePage={onRenamePage}
      />
    );

    // Standard theme pages: duplicate button exists, but NO delete button
    expect(screen.getByTestId("duplicate-page-home")).toBeDefined();
    expect(screen.queryByTestId("delete-page-home")).toBeNull();

    // Custom page: duplicate, rename, delete all exist
    const dupBtn = screen.getByTestId("duplicate-page-landing-v1");
    const renBtn = screen.getByTestId("rename-page-landing-v1");
    const delBtn = screen.getByTestId("delete-page-landing-v1");

    expect(dupBtn).toBeDefined();
    expect(renBtn).toBeDefined();
    expect(delBtn).toBeDefined();

    // Click duplicate
    fireEvent.click(dupBtn);
    expect(onDuplicatePage).toHaveBeenCalledWith("landing-v1");

    // Click rename -> triggers rename input
    fireEvent.click(renBtn);
    const renameInput = screen.getByTestId("rename-input-landing-v1") as HTMLInputElement;
    expect(renameInput.value).toBe("صفحة الهبوط V1");

    fireEvent.change(renameInput, { target: { value: "صفحة الهبوط المحدثة" } });
    const saveRenameBtn = screen.getByTestId("rename-save-landing-v1");
    fireEvent.click(saveRenameBtn);
    expect(onRenamePage).toHaveBeenCalledWith("landing-v1", "صفحة الهبوط المحدثة");

    // Click delete -> triggers confirmation
    fireEvent.click(delBtn);
    expect(screen.getByText(/هل أنت متأكد من حذف صفحة «صفحة الهبوط V1»؟/)).toBeDefined();

    const confirmDeleteBtn = screen.getByTestId("confirm-delete-landing-v1");
    fireEvent.click(confirmDeleteBtn);
    expect(onDeletePage).toHaveBeenCalledWith("landing-v1");
  });

  // ─────────────────────────────────────────────────────────────
  // 12. تفاعل StudioElementsPanel (حفظ قسم من الرأس + مكتبة أقسامي)
  // ─────────────────────────────────────────────────────────────
  it("Criterion 12: StudioElementsPanel enables save button on selection, renders 'أقسامي' cards with delete and insert", () => {
    const savedSections: SavedStudioSection[] = [
      { id: "saved-hero", label: "بانر صيفي محفوظ", type: "hero-banner" },
    ];

    const onSaveSection = vi.fn();
    const onDeleteSavedSection = vi.fn();
    const onAddSavedSection = vi.fn();

    const selectedSection = {
      type: "features-bar",
      key: "features-active",
      label: "شريط المميزات النشط",
    };

    render(
      <StudioElementsPanel
        onAddSection={vi.fn()}
        onOpenFullCatalog={vi.fn()}
        onClose={vi.fn()}
        savedSections={savedSections}
        selectedSectionConfig={selectedSection}
        onSaveSection={onSaveSection}
        onDeleteSavedSection={onDeleteSavedSection}
        onAddSavedSection={onAddSavedSection}
      />
    );

    // Save section button is enabled
    const saveButton = screen.getByTestId("save-section-button") as HTMLButtonElement;
    expect(saveButton.disabled).toBe(false);

    // Click save button opens modal
    fireEvent.click(saveButton);
    expect(screen.getByTestId("save-section-modal")).toBeDefined();

    const input = screen.getByTestId("save-section-input") as HTMLInputElement;
    expect(input.value).toBe("شريط المميزات النشط");

    fireEvent.change(input, { target: { value: "شريط مميزات مخصص" } });
    fireEvent.click(screen.getByTestId("save-section-confirm"));

    expect(onSaveSection).toHaveBeenCalledWith("شريط مميزات مخصص");

    // Saved section card in «أقسامي»
    expect(screen.getByTestId("saved-sections-count").textContent).toBe("1/50");
    const savedCard = screen.getByTestId("saved-section-card-saved-hero");
    expect(savedCard).toBeDefined();
    expect(screen.getByText("بانر صيفي محفوظ")).toBeDefined();

    // Click to insert
    fireEvent.click(savedCard);
    expect(onAddSavedSection).toHaveBeenCalledWith(savedSections[0]);

    // Click delete icon
    const deleteBtn = screen.getByTestId("delete-saved-section-saved-hero");
    fireEvent.click(deleteBtn);
    expect(onDeleteSavedSection).toHaveBeenCalledWith("saved-hero");
  });
});
