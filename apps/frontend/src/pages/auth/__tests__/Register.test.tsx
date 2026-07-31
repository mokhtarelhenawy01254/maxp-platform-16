import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Register from "../Register";

const mockNavigate = jest.fn();
const mockRegister = jest.fn();
const mockTrackCompleteRegistration = jest.fn();
const mockChangeLanguage = jest.fn();

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: {
      language: "ar",
      changeLanguage: (...args: unknown[]) => mockChangeLanguage(...args),
    },
  }),
}));

jest.mock("../../../hooks/useAuthSimple", () => ({
  useAuth: () => ({
    register: (...args: unknown[]) => mockRegister(...args),
  }),
}));

jest.mock("../../../utils/platformSiteMetaPixel", () => ({
  trackPlatformSiteCompleteRegistration: (...args: unknown[]) =>
    mockTrackCompleteRegistration(...args),
}));

describe("Register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRegister.mockResolvedValue({
      role: "COMPANY_OWNER",
      company: {
        onboarding: {
          needsAttention: true,
        },
      },
    });
  });

  test("sends brand-new accounts to the marketplace apps page", async () => {
    const { container } = render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    );

    fireEvent.change(container.querySelector('input[name="fullName"]')!, {
      target: { value: "أحمد محمد" },
    });
    fireEvent.change(container.querySelector('input[name="email"]')!, {
      target: { value: "new@example.com" },
    });
    fireEvent.change(container.querySelector('input[name="password"]')!, {
      target: { value: "StrongPass#123" },
    });
    fireEvent.change(container.querySelector('input[name="phone"]')!, {
      target: { value: "01012345678" },
    });

    fireEvent.click(
      screen.getByRole("button", { name: /إنشاء حساب/ }),
    );

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: "أحمد",
          lastName: "محمد",
          email: "new@example.com",
          password: "StrongPass#123",
        }),
      );
    });

    expect(mockTrackCompleteRegistration).toHaveBeenCalledWith(
      "auth_register",
      expect.objectContaining({
        destination: "/marketplace",
        role: "COMPANY_OWNER",
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("/marketplace");
  });
});
