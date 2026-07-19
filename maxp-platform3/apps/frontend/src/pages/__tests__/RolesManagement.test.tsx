// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAuth = vi.fn();
const PERMISSIONS_ERROR_TEXT =
  /\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u062d\u0629/;
const ADD_ROLE_BUTTON_TEXT =
  /\u0625\u0636\u0627\u0641\u0629 \u062f\u0648\u0631 \u062c\u062f\u064a\u062f/;
const CREATE_BUTTON_TEXT = /\u0625\u0646\u0634\u0627\u0621/;
const RETRY_BUTTON_TEXT =
  /\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629/;

vi.mock("../../hooks/useAuthSimple", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@mui/icons-material", () => ({
  Add: () => <span aria-hidden="true" />,
  Edit: () => <span aria-hidden="true" />,
  Delete: () => <span aria-hidden="true" />,
  ExpandMore: () => <span aria-hidden="true" />,
  Security: () => <span aria-hidden="true" />,
  Group: () => <span aria-hidden="true" />,
  Check: () => <span aria-hidden="true" />,
  Lock: () => <span aria-hidden="true" />,
}));

import RolesManagement from "../RolesManagement";

const mockRolesResponse = {
  ok: true,
  json: async () => ({
    success: true,
    data: {
      MANAGER: {
        name: "Manager",
        description: "Team manager",
        permissions: ["CATALOG_READ"],
        isActive: true,
      },
    },
  }),
};

const mockPermissionsSuccessResponse = {
  ok: true,
  json: async () => ({
    success: true,
    data: {
      CATALOG_READ: {
        category: "Catalog",
        description: "View catalog",
      },
    },
  }),
};

describe("RolesManagement", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { companyId: "company-1" },
    });

    vi.restoreAllMocks();
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("test-token");
  });

  it("shows a visible permissions error and disables submit when permissions fail to load", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockRolesResponse as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          message:
            "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u062d\u0629",
        }),
      } as Response);

    render(<RolesManagement />);

    expect((await screen.findAllByText(PERMISSIONS_ERROR_TEXT)).length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: ADD_ROLE_BUTTON_TEXT }));

    expect(
      await screen.findByRole("button", { name: CREATE_BUTTON_TEXT }),
    ).toBeDisabled();
    expect(screen.getAllByText(PERMISSIONS_ERROR_TEXT).length).toBeGreaterThan(0);
  });

  it("retries permission loading and re-enables role creation once permissions arrive", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockRolesResponse as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          message:
            "\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0635\u0644\u0627\u062d\u064a\u0627\u062a \u0627\u0644\u0645\u062a\u0627\u062d\u0629",
        }),
      } as Response)
      .mockResolvedValueOnce(mockPermissionsSuccessResponse as Response);

    render(<RolesManagement />);

    expect((await screen.findAllByText(PERMISSIONS_ERROR_TEXT)).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: RETRY_BUTTON_TEXT })[0]);

    await waitFor(() => {
      expect(screen.queryByText(PERMISSIONS_ERROR_TEXT)).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: ADD_ROLE_BUTTON_TEXT }));

    const dialog = await screen.findByRole("dialog");

    await waitFor(() => {
      expect(
        within(dialog).getByRole("button", { name: CREATE_BUTTON_TEXT }),
      ).not.toBeDisabled();
    });

    expect(within(dialog).getByText(/Catalog/)).toBeInTheDocument();
    expect(within(dialog).getByText("CATALOG_READ")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
