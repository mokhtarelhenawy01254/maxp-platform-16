import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PatientModal from "../PatientModal";
import { toast } from "sonner";

jest.mock("../../../../utils/urlHelper", () => ({ buildApiUrl: jest.fn((p: string) => `http://localhost/api/v1/${p}`) }));
jest.mock("../../../../utils/tokenManager", () => ({
  __esModule: true, default: { createAuthHeaders: jest.fn() },
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("../MedicalHistoryChecklist", () => ({
  __esModule: true,
  default: () => <div data-testid="medical-history" />,
}));

afterEach(() => { jest.clearAllMocks(); cleanup(); });

const resolveFetch = (data: unknown) => async () => ({ json: async () => ({ success: true, data }) }) as Response;

describe("PatientModal", () => {
  test("double-click on save fires onSave only once", async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(resolveFetch([])) as unknown as typeof fetch;
    let resolveSave!: () => void;
    const onSave = jest.fn(() => new Promise<void>((r) => { resolveSave = r; }));
    const onClose = jest.fn();
    const { container } = render(<PatientModal patient={{}} onClose={onClose} onSave={onSave} />);
    const firstName = container.querySelectorAll<HTMLInputElement>("input")[0];
    await user.type(firstName, "╪ú╪¡┘à╪»");
    const saveBtn = screen.getByText("╪¡┘ü╪╕");
    await user.click(saveBtn);
    await user.click(saveBtn);
    expect(onSave).toHaveBeenCalledTimes(1);
    resolveSave();
  });

  test("onSave rejection keeps the modal open and shows an error toast", async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(resolveFetch([])) as unknown as typeof fetch;
    const onSave = jest.fn(() => Promise.reject(new Error("┘ü╪┤┘ä ╪¡┘ü╪╕ ╪º┘ä┘à╪▒┘è╪╢")));
    const onClose = jest.fn();
    const { container } = render(<PatientModal patient={{}} onClose={onClose} onSave={onSave} />);
    const firstName = container.querySelectorAll<HTMLInputElement>("input")[0];
    await user.type(firstName, "╪ú╪¡┘à╪»");
    await user.click(screen.getByText("╪¡┘ü╪╕"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("┘ü╪┤┘ä ╪¡┘ü╪╕ ╪º┘ä┘à╪▒┘è╪╢"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
