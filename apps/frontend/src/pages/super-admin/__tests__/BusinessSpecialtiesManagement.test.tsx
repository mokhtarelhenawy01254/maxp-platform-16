import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import BusinessSpecialtiesManagement from "../BusinessSpecialtiesManagement";

const listSpecialtiesMock = jest.fn();
const listAppOptionsMock = jest.fn();
const createSpecialtyMock = jest.fn();
const updateSpecialtyMock = jest.fn();
const removeSpecialtyMock = jest.fn();

jest.mock("sonner", () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("../../../components/ui/scroll-area", () => ({
  ScrollArea: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));

jest.mock("../../../services/businessSpecialtyService", () => ({
  __esModule: true,
  businessSpecialtyService: {
    listSpecialties: (...args: unknown[]) => listSpecialtiesMock(...args),
    listAppOptions: (...args: unknown[]) => listAppOptionsMock(...args),
    createSpecialty: (...args: unknown[]) => createSpecialtyMock(...args),
    updateSpecialty: (...args: unknown[]) => updateSpecialtyMock(...args),
    removeSpecialty: (...args: unknown[]) => removeSpecialtyMock(...args),
  },
  default: {
    listSpecialties: (...args: unknown[]) => listSpecialtiesMock(...args),
    listAppOptions: (...args: unknown[]) => listAppOptionsMock(...args),
    createSpecialty: (...args: unknown[]) => createSpecialtyMock(...args),
    updateSpecialty: (...args: unknown[]) => updateSpecialtyMock(...args),
    removeSpecialty: (...args: unknown[]) => removeSpecialtyMock(...args),
  },
}));

const sampleSpecialty = {
  id: "bizsp_ecommerce_retail",
  slug: "ecommerce-retail",
  nameAr: "╪º┘ä╪¬╪¼╪º╪▒╪⌐ ┘ê╪º┘ä┘à╪¬╪º╪¼╪▒",
  nameEn: "E-commerce & Retail",
  descriptionAr: "┘à╪¬╪¼╪▒ ╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ┘ê┘à┘å╪¬╪¼╪º╪¬ ┘ê╪╖┘ä╪¿╪º╪¬.",
  descriptionEn: "Online store, products and orders.",
  icon: "ShoppingBag",
  appSlugs: ["store-basic", "crm-lite", "analytics-basic"],
  autoInstallOnSignup: true,
  sortOrder: 10,
  isActive: true,
  companyCount: 4,
};

const sampleOptions = [
  {
    id: "app-store",
    slug: "store-basic",
    name: "╪º┘ä┘à╪¬╪¼╪▒ ╪º┘ä╪ú╪│╪º╪│┘è",
    nameEn: "Store Basic",
    category: "ECOMMERCE",
    icon: "Store",
  },
  {
    id: "app-crm",
    slug: "crm-lite",
    name: "╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä╪╣┘à┘ä╪º╪í",
    nameEn: "CRM Lite",
    category: "crm",
    icon: "Users",
  },
  {
    id: "app-analytics",
    slug: "analytics-basic",
    name: "╪º┘ä╪¬╪¡┘ä┘è┘ä╪º╪¬",
    nameEn: "Analytics",
    category: "general",
    icon: "BarChart",
  },
];

describe("BusinessSpecialtiesManagement page", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    listSpecialtiesMock.mockResolvedValue([sampleSpecialty]);
    listAppOptionsMock.mockResolvedValue(sampleOptions);
    removeSpecialtyMock.mockResolvedValue({
      specialty: null,
    });
  });

  test("loads specialties and app options and renders the surface", async () => {
    render(<BusinessSpecialtiesManagement />);

    await waitFor(() => {
      expect(listSpecialtiesMock).toHaveBeenCalled();
      expect(listAppOptionsMock).toHaveBeenCalled();
    });

    expect(
      (await screen.findAllByText(/╪º┘ä╪¬╪¼╪º╪▒╪⌐ ┘ê╪º┘ä┘à╪¬╪º╪¼╪▒/i)).length,
    ).toBeGreaterThan(0);
    expect(
      (await screen.findAllByText(/╪º┘ä┘à╪¬╪¼╪▒ ╪º┘ä╪ú╪│╪º╪│┘è/i)).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /╪Ñ┘å╪┤╪º╪í ┘å╪┤╪º╪╖/i }),
    ).toBeInTheDocument();
  });

  test("opens create dialog from the hero action", async () => {
    render(<BusinessSpecialtiesManagement />);

    expect((await screen.findAllByText(/╪º┘ä╪¬╪¼╪º╪▒╪⌐ ┘ê╪º┘ä┘à╪¬╪º╪¼╪▒/i)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /╪Ñ┘å╪┤╪º╪í ┘å╪┤╪º╪╖/i }));

    expect(
      await screen.findByText(/╪Ñ┘å╪┤╪º╪í ┘å╪┤╪º╪╖ ╪¬╪¼╪º╪▒┘è ╪¼╪»┘è╪»/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/╪º┘ä╪º╪│┘à ╪¿╪º┘ä╪╣╪▒╪¿┘è/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/╪º┘ä╪º╪│┘à ╪¿╪º┘ä╪Ñ┘å╪¼┘ä┘è╪▓┘è/i)).toBeInTheDocument();
  });

  test("shows existing app selections inside the edit dialog", async () => {
    render(<BusinessSpecialtiesManagement />);

    expect((await screen.findAllByText(/╪º┘ä╪¬╪¼╪º╪▒╪⌐ ┘ê╪º┘ä┘à╪¬╪º╪¼╪▒/i)).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getAllByRole("button", { name: /╪¬╪╣╪»┘è┘ä ╪º┘ä┘å╪┤╪º╪╖ ╪º┘ä╪¬╪¼╪º╪▒╪⌐ ┘ê╪º┘ä┘à╪¬╪º╪¼╪▒/i })[0]!,
    );

    expect(
      await screen.findByText(/╪¬╪╣╪»┘è┘ä ╪º┘ä┘å╪┤╪º╪╖ ╪º┘ä╪¬╪¼╪º╪▒┘è/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/╪º┘ä╪º╪│┘à ╪¿╪º┘ä╪╣╪▒╪¿┘è/i)).toHaveValue(
      "╪º┘ä╪¬╪¼╪º╪▒╪⌐ ┘ê╪º┘ä┘à╪¬╪º╪¼╪▒",
    );
  });

  test("opens delete confirmation for a specialty row", async () => {
    render(<BusinessSpecialtiesManagement />);

    expect((await screen.findAllByText(/╪º┘ä╪¬╪¼╪º╪▒╪⌐ ┘ê╪º┘ä┘à╪¬╪º╪¼╪▒/i)).length).toBeGreaterThan(0);

    fireEvent.click(
      screen.getAllByRole("button", { name: /╪¡╪░┘ü ╪º┘ä┘å╪┤╪º╪╖ ╪º┘ä╪¬╪¼╪º╪▒╪⌐ ┘ê╪º┘ä┘à╪¬╪º╪¼╪▒/i })[0]!,
    );

    expect(
      await screen.findByText(/╪¡╪░┘ü ╪º┘ä┘å╪┤╪º╪╖ ╪º┘ä╪¬╪¼╪º╪▒┘è/i),
    ).toBeInTheDocument();
  });
});
