import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import CompanySwitcher from "../CompanySwitcher";

const mockUseAuth = jest.fn();
const mockSwitchCompany = jest.fn();

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("CompanySwitcher", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: {
        hasMultipleCompanies: true,
        company: {
          id: "company-h2m",
          name: "H2m",
          role: "AGENT",
        },
        companies: [
          {
            id: "company-h2m",
            name: "H2m",
            role: "AGENT",
            isCurrent: true,
          },
          {
            id: "company-alpha",
            name: "Alpha Agent",
            role: "AGENT",
            isCurrent: false,
          },
        ],
      },
      switchCompany: mockSwitchCompany,
      isSwitchingCompany: false,
    });
  });

  it("shows the active company details in the collapsed mobile trigger", () => {
    render(<CompanySwitcher collapsed />);

    const trigger = screen.getByRole("button", {
      name: "تبديل الشركة الحالية: H2m",
    });

    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent("H2m");
    expect(trigger).toHaveTextContent("2 شركات");
  });

  it("marks the current company clearly inside the switcher menu", () => {
    render(<CompanySwitcher />);

    fireEvent.click(
      screen.getByRole("button", { name: /H2m/i }),
    );

    expect(screen.getByText("Alpha Agent")).toBeInTheDocument();
    expect(screen.getAllByText("H2m")).toHaveLength(2);
  });

  it("stays hidden for SUPER_ADMIN bound to a single company", () => {
    mockUseAuth.mockReturnValue({
      user: {
        role: "SUPER_ADMIN",
        hasMultipleCompanies: false,
        company: {
          id: "company-maxp",
          name: "max-p",
          role: "OWNER",
        },
        companies: [
          {
            id: "company-maxp",
            name: "max-p",
            role: "OWNER",
            isCurrent: true,
          },
        ],
      },
      switchCompany: mockSwitchCompany,
      isSwitchingCompany: false,
    });

    const { container } = render(<CompanySwitcher />);

    expect(container).toBeEmptyDOMElement();
  });
});
