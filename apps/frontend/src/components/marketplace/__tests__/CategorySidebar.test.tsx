import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategorySidebar } from "../CategorySidebar";
import { groupCategories, categoryGroups, OTHER_CATEGORY_GROUP_ID } from "@/utils/marketplace";
import type { Category } from "@/types/marketplace";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const sampleCategories: Category[] = [
  { category: "ECOMMERCE", name: "╪º┘ä╪¬╪¼╪º╪▒╪⌐ ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è╪⌐", nameEn: "E-Commerce", icon: "≡ƒ¢Æ", count: 13 },
  { category: "CRM", name: "╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä╪╣┘à┘ä╪º╪í", nameEn: "CRM", icon: "≡ƒôè", count: 4 },
  { category: "MARKETING", name: "╪º┘ä╪¬╪│┘ê┘è┘é", nameEn: "Marketing", icon: "≡ƒôú", count: 11 },
  { category: "ANALYTICS", name: "╪º┘ä╪¬╪¡┘ä┘è┘ä╪º╪¬", nameEn: "Analytics", icon: "≡ƒôê", count: 5 },
  { category: "AI", name: "╪º┘ä╪ú╪¬┘à╪¬╪⌐", nameEn: "Automation", icon: "ΓÜÖ∩╕Å", count: 4 },
  { category: "MEDICAL", name: "╪º┘ä┘å╪╕╪º┘à ╪º┘ä╪╖╪¿┘è", nameEn: "Medical", icon: "≡ƒÅÑ", count: 1 },
  { category: "UNKNOWN", name: "╪¬╪╡┘å┘è┘ü ╪¼╪»┘è╪»", nameEn: "Unknown", icon: "≡ƒôª", count: 2 },
];

describe("groupCategories", () => {
  it("groups categories into defined sections plus an other bucket", () => {
    const groups = groupCategories(sampleCategories);
    const ids = groups.map((g) => g.id);
    expect(ids).toEqual(["commerce", "data", "specialized", OTHER_CATEGORY_GROUP_ID]);

    const commerce = groups.find((g) => g.id === "commerce");
    expect(commerce?.items.map((c) => c.category)).toEqual(["ECOMMERCE", "CRM", "MARKETING"]);

    const data = groups.find((g) => g.id === "data");
    expect(data?.items.map((c) => c.category)).toEqual(["ANALYTICS", "AI"]);

    const other = groups.find((g) => g.id === OTHER_CATEGORY_GROUP_ID);
    expect(other?.items.map((c) => c.category)).toEqual(["UNKNOWN"]);
  });

  it("skips empty groups", () => {
    const groups = groupCategories([{ category: "ECOMMERCE", name: "E", nameEn: "E", icon: "≡ƒ¢Æ", count: 1 }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].id).toBe("commerce");
  });

  it("keeps group definitions stable for known catalog categories", () => {
    const known = categoryGroups.flatMap((g) => g.categories);
    expect(known).toContain("ECOMMERCE");
    expect(known).toContain("MEDICAL");
    expect(known).toContain("PRODUCTIVITY");
  });
});

describe("CategorySidebar", () => {
  it("renders grouped category sections with counts", () => {
    render(
      <CategorySidebar
        categories={sampleCategories}
        selectedCategory=""
        onSelect={jest.fn()}
      />,
    );

    expect(screen.getByText("marketplace.categories.all")).toBeInTheDocument();
    expect(screen.getByText("marketplace.categories.groups.commerce")).toBeInTheDocument();
    expect(screen.getByText("marketplace.categories.groups.data")).toBeInTheDocument();
    expect(screen.getByText("╪º┘ä╪¬╪¼╪º╪▒╪⌐ ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è╪⌐")).toBeInTheDocument();
    expect(screen.getByText("╪º┘ä╪¬╪¡┘ä┘è┘ä╪º╪¬")).toBeInTheDocument();
    expect(screen.getByText("╪º┘ä┘å╪╕╪º┘à ╪º┘ä╪╖╪¿┘è")).toBeInTheDocument();
    expect(screen.getByText("╪¬╪╡┘å┘è┘ü ╪¼╪»┘è╪»")).toBeInTheDocument();
  });

  it("shows the total count on the All row", () => {
    render(
      <CategorySidebar
        categories={sampleCategories}
        selectedCategory=""
        onSelect={jest.fn()}
      />,
    );
    expect(screen.getByText("40")).toBeInTheDocument();
  });

  it("calls onSelect('') when clicking All", () => {
    const onSelect = jest.fn();
    render(
      <CategorySidebar
        categories={sampleCategories}
        selectedCategory=""
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByText("marketplace.categories.all"));
    expect(onSelect).toHaveBeenCalledWith("");
  });

  it("calls onSelect with the category id when clicking a category", () => {
    const onSelect = jest.fn();
    render(
      <CategorySidebar
        categories={sampleCategories}
        selectedCategory=""
        onSelect={onSelect}
      />,
    );
    fireEvent.click(screen.getByText("╪º┘ä╪¬╪¡┘ä┘è┘ä╪º╪¬"));
    expect(onSelect).toHaveBeenCalledWith("ANALYTICS");
  });

  it("collapses a group when its header is clicked", () => {
    render(
      <CategorySidebar
        categories={sampleCategories}
        selectedCategory=""
        onSelect={jest.fn()}
      />,
    );
    fireEvent.click(screen.getByText("marketplace.categories.groups.data"));
    expect(screen.queryByText("╪º┘ä╪¬╪¡┘ä┘è┘ä╪º╪¬")).not.toBeInTheDocument();
    expect(screen.queryByText("╪º┘ä╪ú╪¬┘à╪¬╪⌐")).not.toBeInTheDocument();
  });
});
