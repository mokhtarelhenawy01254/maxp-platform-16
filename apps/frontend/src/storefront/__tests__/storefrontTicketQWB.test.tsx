// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

import {
  StudioContextMenu,
  StorefrontStudioShell,
} from "../studio/StorefrontStudioShell";
import { StudioSortableSection } from "../studio/StudioSortableSection";
import { StudioSortableLayerRow } from "../studio/StudioSortableLayerRow";
import { StudioLayersDrawer } from "../studio/StudioLayersDrawer";

// Mock minimal dependencies for StorefrontStudioShell
vi.mock("../store/useCartStore", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../store/useCartStore")>();
  return {
    ...actual,
    useCartStore: Object.assign(
      vi.fn((selector) => (selector ? selector({ items: [] }) : { items: [] })),
      {
        getState: () => ({ items: [] }),
        setState: vi.fn(),
      }
    ),
  };
});

vi.mock("../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    user: { companyId: "test-comp-1" },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Storefront Ticket QW-B — Right-click Context Menu + Copy/Paste Sections", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const defaultMenuState = {
    x: 150,
    y: 200,
    sectionKey: "hero-1",
    index: 1,
    totalSections: 4,
    isHidden: false,
    isLocked: false,
    label: "بانر رئيسي",
  };

  // ─────────────────────────────────────────────────────────────
  // 1. StudioContextMenu Component Unit Tests
  // ─────────────────────────────────────────────────────────────
  describe("1. StudioContextMenu Unit Tests", () => {
    it("renders context menu with all 8 commands, header, and shortcuts", () => {
      render(
        <StudioContextMenu
          state={defaultMenuState}
          hasClipboard={true}
          onClose={vi.fn()}
          onDuplicate={vi.fn()}
          onCopy={vi.fn()}
          onPasteAfter={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onToggleVisibility={vi.fn()}
          onToggleLock={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // Context menu container
      const menu = screen.getByTestId("studio-context-menu") || document.querySelector("[data-studio-context-menu='true']");
      expect(menu).toBeTruthy();

      // Header shows section name and index #2
      expect(screen.getByText("بانر رئيسي")).toBeTruthy();
      expect(screen.getByText("#2")).toBeTruthy();

      // All 8 commands are present
      expect(document.querySelector("[data-studio-context-menu-item='duplicate']")).toBeTruthy();
      expect(document.querySelector("[data-studio-context-menu-item='copy']")).toBeTruthy();
      expect(document.querySelector("[data-studio-context-menu-item='paste']")).toBeTruthy();
      expect(document.querySelector("[data-studio-context-menu-item='move-up']")).toBeTruthy();
      expect(document.querySelector("[data-studio-context-menu-item='move-down']")).toBeTruthy();
      expect(document.querySelector("[data-studio-context-menu-item='toggle-visibility']")).toBeTruthy();
      expect(document.querySelector("[data-studio-context-menu-item='toggle-lock']")).toBeTruthy();
      expect(document.querySelector("[data-studio-context-menu-item='delete']")).toBeTruthy();

      // Shortcut badges
      expect(screen.getByText("Ctrl+C")).toBeTruthy();
      expect(screen.getByText("Ctrl+V")).toBeTruthy();
    });

    it("triggers callbacks on command click and closes menu", () => {
      const onClose = vi.fn();
      const onDuplicate = vi.fn();
      const onCopy = vi.fn();
      const onPasteAfter = vi.fn();
      const onMoveUp = vi.fn();
      const onMoveDown = vi.fn();
      const onToggleVisibility = vi.fn();
      const onToggleLock = vi.fn();
      const onDelete = vi.fn();

      const { rerender } = render(
        <StudioContextMenu
          state={defaultMenuState}
          hasClipboard={true}
          onClose={onClose}
          onDuplicate={onDuplicate}
          onCopy={onCopy}
          onPasteAfter={onPasteAfter}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onToggleVisibility={onToggleVisibility}
          onToggleLock={onToggleLock}
          onDelete={onDelete}
        />
      );

      // 1. Duplicate
      fireEvent.click(document.querySelector("[data-studio-context-menu-item='duplicate']")!);
      expect(onDuplicate).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalled();

      // 2. Copy
      fireEvent.click(document.querySelector("[data-studio-context-menu-item='copy']")!);
      expect(onCopy).toHaveBeenCalledTimes(1);

      // 3. Paste After
      fireEvent.click(document.querySelector("[data-studio-context-menu-item='paste']")!);
      expect(onPasteAfter).toHaveBeenCalledTimes(1);

      // 4. Move Up
      fireEvent.click(document.querySelector("[data-studio-context-menu-item='move-up']")!);
      expect(onMoveUp).toHaveBeenCalledTimes(1);

      // 5. Move Down
      fireEvent.click(document.querySelector("[data-studio-context-menu-item='move-down']")!);
      expect(onMoveDown).toHaveBeenCalledTimes(1);

      // 6. Toggle Visibility
      fireEvent.click(document.querySelector("[data-studio-context-menu-item='toggle-visibility']")!);
      expect(onToggleVisibility).toHaveBeenCalledTimes(1);

      // 7. Toggle Lock
      fireEvent.click(document.querySelector("[data-studio-context-menu-item='toggle-lock']")!);
      expect(onToggleLock).toHaveBeenCalledTimes(1);

      // 8. Delete
      fireEvent.click(document.querySelector("[data-studio-context-menu-item='delete']")!);
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it("disables Move Up at index 0 and Move Down at last index", () => {
      const { rerender } = render(
        <StudioContextMenu
          state={{ ...defaultMenuState, index: 0 }}
          hasClipboard={true}
          onClose={vi.fn()}
          onDuplicate={vi.fn()}
          onCopy={vi.fn()}
          onPasteAfter={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onToggleVisibility={vi.fn()}
          onToggleLock={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const moveUpBtn = document.querySelector("[data-studio-context-menu-item='move-up']") as HTMLButtonElement;
      const moveDownBtn = document.querySelector("[data-studio-context-menu-item='move-down']") as HTMLButtonElement;
      expect(moveUpBtn.disabled).toBe(true);
      expect(moveDownBtn.disabled).toBe(false);

      // Re-render at last index (index 3 of 4)
      rerender(
        <StudioContextMenu
          state={{ ...defaultMenuState, index: 3 }}
          hasClipboard={true}
          onClose={vi.fn()}
          onDuplicate={vi.fn()}
          onCopy={vi.fn()}
          onPasteAfter={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onToggleVisibility={vi.fn()}
          onToggleLock={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      expect((document.querySelector("[data-studio-context-menu-item='move-up']") as HTMLButtonElement).disabled).toBe(false);
      expect((document.querySelector("[data-studio-context-menu-item='move-down']") as HTMLButtonElement).disabled).toBe(true);
    });

    it("disables Paste After when clipboard is empty", () => {
      const onPasteAfter = vi.fn();
      render(
        <StudioContextMenu
          state={defaultMenuState}
          hasClipboard={false}
          onClose={vi.fn()}
          onDuplicate={vi.fn()}
          onCopy={vi.fn()}
          onPasteAfter={onPasteAfter}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onToggleVisibility={vi.fn()}
          onToggleLock={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const pasteBtn = document.querySelector("[data-studio-context-menu-item='paste']") as HTMLButtonElement;
      expect(pasteBtn.disabled).toBe(true);
      fireEvent.click(pasteBtn);
      expect(onPasteAfter).not.toHaveBeenCalled();
    });

    it("disables Move Up and Move Down when section is locked", () => {
      render(
        <StudioContextMenu
          state={{ ...defaultMenuState, isLocked: true }}
          hasClipboard={true}
          onClose={vi.fn()}
          onDuplicate={vi.fn()}
          onCopy={vi.fn()}
          onPasteAfter={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onToggleVisibility={vi.fn()}
          onToggleLock={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const moveUpBtn = document.querySelector("[data-studio-context-menu-item='move-up']") as HTMLButtonElement;
      const moveDownBtn = document.querySelector("[data-studio-context-menu-item='move-down']") as HTMLButtonElement;
      expect(moveUpBtn.disabled).toBe(true);
      expect(moveDownBtn.disabled).toBe(true);
    });

    it("closes menu when clicking the backdrop", () => {
      const onClose = vi.fn();
      render(
        <StudioContextMenu
          state={defaultMenuState}
          hasClipboard={true}
          onClose={onClose}
          onDuplicate={vi.fn()}
          onCopy={vi.fn()}
          onPasteAfter={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onToggleVisibility={vi.fn()}
          onToggleLock={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      const backdrop = document.querySelector("[data-studio-context-backdrop='true']");
      expect(backdrop).toBeTruthy();
      fireEvent.click(backdrop!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. StudioSortableSection Right-Click & Input Prevention
  // ─────────────────────────────────────────────────────────────
  describe("2. StudioSortableSection Right-Click Context Menu & Input Prevention", () => {
    it("opens context menu on right click and selects section", () => {
      const onSelect = vi.fn();
      const onContextMenu = vi.fn();

      render(
        <StudioSortableSection
          id="sec-1"
          index={0}
          sectionKey="sec-1"
          sectionLabel="العنوان الرئيسي"
          sectionType="hero-banner"
          selected={false}
          totalSections={3}
          onSelect={onSelect}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
          onContextMenu={onContextMenu}
        >
          <div data-testid="section-content">محتوى القسم</div>
        </StudioSortableSection>
      );

      const sectionEl = document.querySelector("[data-studio-sortable-section='true']")!;
      fireEvent.contextMenu(sectionEl);

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onContextMenu).toHaveBeenCalledTimes(1);
    });

    it("prevents context menu when right clicking inside inputs or textareas", () => {
      const onContextMenu = vi.fn();

      render(
        <StudioSortableSection
          id="sec-1"
          index={0}
          sectionKey="sec-1"
          sectionLabel="نموذج اتصال"
          sectionType="contact-form"
          selected={true}
          totalSections={3}
          onSelect={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
          onContextMenu={onContextMenu}
        >
          <div>
            <input data-testid="test-input" defaultValue="اسم العميل" />
            <textarea data-testid="test-textarea" defaultValue="رسالة..." />
          </div>
        </StudioSortableSection>
      );

      const input = screen.getByTestId("test-input");
      fireEvent.contextMenu(input);
      expect(onContextMenu).not.toHaveBeenCalled();

      const textarea = screen.getByTestId("test-textarea");
      fireEvent.contextMenu(textarea);
      expect(onContextMenu).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. StudioSortableLayerRow & StudioLayersDrawer Context Menu
  // ─────────────────────────────────────────────────────────────
  describe("3. StudioLayersDrawer & StudioSortableLayerRow Context Menu", () => {
    it("triggers onContextMenu when right clicking a layer row", () => {
      const onSelect = vi.fn();
      const onContextMenu = vi.fn();

      render(
        <StudioSortableLayerRow
          index={1}
          sectionKey="features-1"
          sectionType="features"
          label="المميزات"
          isHidden={false}
          isLocked={false}
          isSelected={false}
          totalSections={5}
          onSelect={onSelect}
          onRename={vi.fn()}
          onToggleVisibility={vi.fn()}
          onToggleLock={vi.fn()}
          onMoveUp={vi.fn()}
          onMoveDown={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={vi.fn()}
          onContextMenu={onContextMenu}
        />
      );

      const row = document.querySelector("[data-studio-layer-row='features-1']")!;
      fireEvent.contextMenu(row);

      expect(onSelect).toHaveBeenCalledTimes(1);
      expect(onContextMenu).toHaveBeenCalledTimes(1);
    });

    it("StudioLayersDrawer forwards right-click metadata to onSectionContextMenu", () => {
      const onSectionContextMenu = vi.fn();
      const mockSections = [
        { type: "hero-banner", key: "hero-1", label: "البانر الرئيسي" },
        { type: "featured-products", key: "products-1", label: "منتجات مميزة" },
      ];

      render(
        <StudioLayersDrawer
          sections={mockSections}
          selectedSectionKey="hero-1"
          leftPanelTab="layers"
          onSelectSection={vi.fn()}
          onMoveSection={vi.fn()}
          onDuplicateSection={vi.fn()}
          onDeleteSection={vi.fn()}
          onOpenSectionCatalog={vi.fn()}
          onTabChange={vi.fn()}
          onSectionContextMenu={onSectionContextMenu}
        />
      );

      const secondRow = document.querySelector("[data-studio-layer-row='products-1']")!;
      fireEvent.contextMenu(secondRow);

      expect(onSectionContextMenu).toHaveBeenCalledTimes(1);
      const [, info] = onSectionContextMenu.mock.calls[0];
      expect(info.sectionKey).toBe("products-1");
      expect(info.index).toBe(1);
      expect(info.label).toBe("منتجات مميزة");
      expect(info.totalSections).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. StorefrontStudioShell Full Integration (QW-B Requirements)
  // ─────────────────────────────────────────────────────────────
  describe("4. StorefrontStudioShell Full Integration", () => {
    const sampleDesignTokens = {
      pages: {
        home: {
          id: "home",
          title: "الرئيسية",
          sections: [
            { type: "hero-banner", key: "hero-1", settings: { title: "أهلاً بك" } },
            { type: "featured-products", key: "products-1", settings: { columns: 4 } },
            { type: "newsletter", key: "news-1", settings: { title: "النشرة البريدية" } },
          ],
        },
      },
    };

    it("Criterion 1: Right-click on section in canvas opens context menu with 8 active commands", () => {
      render(
        <StorefrontStudioShell
          themeId="modern-minimal"
          designTokens={sampleDesignTokens}
          storeName="متجر الاختبار"
          hasPendingChanges={false}
          saving={false}
          onSave={vi.fn()}
          onBack={vi.fn()}
          onOpenPreview={vi.fn()}
          onChange={vi.fn()}
        />
      );

      // Find first section in canvas
      const section = document.querySelector("[data-studio-sortable-section='true'][data-section-key='hero-1']")!;
      expect(section).toBeTruthy();

      // Right-click on section
      fireEvent.contextMenu(section, { clientX: 250, clientY: 180 });

      // Context menu should appear
      const contextMenu = document.querySelector("[data-studio-context-menu='true']");
      expect(contextMenu).toBeTruthy();

      // Verify all 8 items exist
      expect(document.querySelector("[data-studio-context-menu-item='duplicate']")).toBeTruthy();
      expect(document.querySelector("[data-studio-context-menu-item='copy']")).toBeTruthy();
      expect(document.querySelector("[data-studio-context-menu-item='paste']")).toBeTruthy();
      expect(document.querySelector("[data-studio-context-menu-item='move-up']")).toBeTruthy();
      expect(document.querySelector("[data-studio-context-menu-item='move-down']")).toBeTruthy();
      expect(document.querySelector("[data-studio-context-menu-item='toggle-visibility']")).toBeTruthy();
      expect(document.querySelector("[data-studio-context-menu-item='toggle-lock']")).toBeTruthy();
      expect(document.querySelector("[data-studio-context-menu-item='delete']")).toBeTruthy();
    });

    it("Criterion 2: Pressing Escape closes the context menu without changing state", () => {
      render(
        <StorefrontStudioShell
          themeId="modern-minimal"
          designTokens={sampleDesignTokens}
          storeName="متجر الاختبار"
          hasPendingChanges={false}
          saving={false}
          onSave={vi.fn()}
          onBack={vi.fn()}
          onOpenPreview={vi.fn()}
          onChange={vi.fn()}
        />
      );

      const section = document.querySelector("[data-studio-sortable-section='true'][data-section-key='hero-1']")!;
      fireEvent.contextMenu(section, { clientX: 200, clientY: 200 });
      expect(document.querySelector("[data-studio-context-menu='true']")).toBeTruthy();

      // Press Escape
      fireEvent.keyDown(window, { key: "Escape" });

      // Context menu must be closed
      expect(document.querySelector("[data-studio-context-menu='true']")).toBeNull();
    });

    it("Criterion 3: Copy then Paste adds a duplicate section (+1 section count)", () => {
      const onChange = vi.fn();

      render(
        <StorefrontStudioShell
          themeId="modern-minimal"
          designTokens={sampleDesignTokens}
          storeName="متجر الاختبار"
          hasPendingChanges={false}
          saving={false}
          onSave={vi.fn()}
          onBack={vi.fn()}
          onOpenPreview={vi.fn()}
          onChange={onChange}
        />
      );

      // 1. Right click on first section and click Copy
      const heroSection = document.querySelector("[data-studio-sortable-section='true'][data-section-key='hero-1']")!;
      fireEvent.contextMenu(heroSection, { clientX: 200, clientY: 200 });

      const copyBtn = document.querySelector("[data-studio-context-menu-item='copy']")!;
      fireEvent.click(copyBtn);

      // 2. Right click again and click Paste After
      fireEvent.contextMenu(heroSection, { clientX: 200, clientY: 200 });

      const pasteBtn = document.querySelector("[data-studio-context-menu-item='paste']")!;
      fireEvent.click(pasteBtn);

      // onChange should be called with next designTokens containing 4 sections instead of 3
      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      const sections = lastCall.pages.home.sections;
      expect(sections.length).toBe(4);
      // The second section should be the pasted copy of hero-1
      expect(sections[1].type).toBe("hero-banner");
      expect(sections[1].key).not.toBe("hero-1");
      expect(sections[1].key).toContain("hero-banner-");
    });

    it("Criterion 4: Paste after last section appends at the end of the sections list", () => {
      const onChange = vi.fn();

      render(
        <StorefrontStudioShell
          themeId="modern-minimal"
          designTokens={sampleDesignTokens}
          storeName="متجر الاختبار"
          hasPendingChanges={false}
          saving={false}
          onSave={vi.fn()}
          onBack={vi.fn()}
          onOpenPreview={vi.fn()}
          onChange={onChange}
        />
      );

      // 1. Copy first section
      const heroSection = document.querySelector("[data-studio-sortable-section='true'][data-section-key='hero-1']")!;
      fireEvent.contextMenu(heroSection, { clientX: 200, clientY: 200 });
      fireEvent.click(document.querySelector("[data-studio-context-menu-item='copy']")!);

      // 2. Right click on the LAST section (news-1, index 2) and Paste After
      const lastSection = document.querySelector("[data-studio-sortable-section='true'][data-section-key='news-1']")!;
      fireEvent.contextMenu(lastSection, { clientX: 200, clientY: 400 });

      const pasteBtn = document.querySelector("[data-studio-context-menu-item='paste']")!;
      fireEvent.click(pasteBtn);

      // Section should be appended at index 3 (the end)
      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      const sections = lastCall.pages.home.sections;
      expect(sections.length).toBe(4);
      expect(sections[3].type).toBe("hero-banner");
      expect(sections[2].key).toBe("news-1");
    });

    it("Criterion 5: Keyboard shortcuts Ctrl+C and Ctrl+V copy and paste active section", () => {
      const onChange = vi.fn();

      render(
        <StorefrontStudioShell
          themeId="modern-minimal"
          designTokens={sampleDesignTokens}
          storeName="متجر الاختبار"
          hasPendingChanges={false}
          saving={false}
          onSave={vi.fn()}
          onBack={vi.fn()}
          onOpenPreview={vi.fn()}
          onChange={onChange}
        />
      );

      // Select products-1 by clicking it
      const productsSection = document.querySelector("[data-studio-sortable-section='true'][data-section-key='products-1']")!;
      fireEvent.click(productsSection);

      // Press Ctrl+C on window
      fireEvent.keyDown(window, { key: "c", ctrlKey: true });

      // Press Ctrl+V on window
      fireEvent.keyDown(window, { key: "v", ctrlKey: true });

      // Verify section is duplicated and added
      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      const sections = lastCall.pages.home.sections;
      expect(sections.length).toBe(4);
      // Inserted right after products-1 (at index 2)
      expect(sections[2].type).toBe("featured-products");
    });

    it("Criterion 6: Context menu Hide and Lock commands toggle section visibility and lock", () => {
      const onChange = vi.fn();

      render(
        <StorefrontStudioShell
          themeId="modern-minimal"
          designTokens={sampleDesignTokens}
          storeName="متجر الاختبار"
          hasPendingChanges={false}
          saving={false}
          onSave={vi.fn()}
          onBack={vi.fn()}
          onOpenPreview={vi.fn()}
          onChange={onChange}
        />
      );

      const heroSection = document.querySelector("[data-studio-sortable-section='true'][data-section-key='hero-1']")!;

      // 1. Hide section
      fireEvent.contextMenu(heroSection, { clientX: 200, clientY: 200 });
      const toggleVisBtn = document.querySelector("[data-studio-context-menu-item='toggle-visibility']")!;
      fireEvent.click(toggleVisBtn);

      expect(onChange).toHaveBeenCalled();
      let lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.pages.home.sections[0].hidden).toBe(true);

      // 2. Lock section
      fireEvent.contextMenu(heroSection, { clientX: 200, clientY: 200 });
      const toggleLockBtn = document.querySelector("[data-studio-context-menu-item='toggle-lock']")!;
      fireEvent.click(toggleLockBtn);

      expect(onChange).toHaveBeenCalled();
      lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall.pages.home.sections[0].locked).toBe(true);
    });
  });
});
