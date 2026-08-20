import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import InvoiceModal from "../InvoiceModal";
import { BookingPatient } from "../shared";
import { toast } from "sonner";

jest.mock("../../../../utils/urlHelper", () => ({ buildApiUrl: jest.fn((p: string) => `http://localhost/api/v1/${p}`) }));
jest.mock("../../../../utils/tokenManager", () => ({
  __esModule: true, default: { createAuthHeaders: jest.fn() },
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const patient: BookingPatient = {
  id: "p1", firstName: "╪ú╪¡┘à╪»", lastName: "", phone: "01000000001", gender: "male", isActive: true, createdAt: "2024-01-01",
};

afterEach(() => { jest.clearAllMocks(); cleanup(); });

async function fillValidForm(user: ReturnType<typeof userEvent.setup>, container: HTMLElement) {
  const selects = container.querySelectorAll<HTMLSelectElement>("select");
  await user.selectOptions(selects[0], "p1");
  const totalInput = container.querySelectorAll<HTMLInputElement>('input[type="number"]')[0];
  await user.type(totalInput, "100");
}

describe("InvoiceModal", () => {
  test("double-click on save fires onSave only once", async () => {
    const user = userEvent.setup();
    let resolveSave!: () => void;
    const onSave = jest.fn(() => new Promise<void>((r) => { resolveSave = r; }));
    const onClose = jest.fn();
    const { container } = render(
      <InvoiceModal invoice={{}} patients={[patient]} onClose={onClose} onSave={onSave} />
    );
    await fillValidForm(user, container);
    const saveBtn = screen.getByText("╪¡┘ü╪╕");
    await user.click(saveBtn);
    await user.click(saveBtn);
    expect(onSave).toHaveBeenCalledTimes(1);
    resolveSave();
  });

  test("save button is disabled while a save is in flight", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn(() => new Promise<void>(() => {}));
    const { container } = render(
      <InvoiceModal invoice={{}} patients={[patient]} onClose={jest.fn()} onSave={onSave} />
    );
    await fillValidForm(user, container);
    const saveBtn = screen.getByText("╪¡┘ü╪╕");
    await user.click(saveBtn);
    expect(saveBtn).toBeDisabled();
  });

  test("onSave rejection keeps the modal open and shows an error toast", async () => {
    const user = userEvent.setup();
    const onSave = jest.fn(() => Promise.reject(new Error("┘ü╪┤┘ä ╪¡┘ü╪╕ ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐")));
    const onClose = jest.fn();
    const { container } = render(
      <InvoiceModal invoice={{}} patients={[patient]} onClose={onClose} onSave={onSave} />
    );
    await fillValidForm(user, container);
    await user.click(screen.getByText("╪¡┘ü╪╕"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("┘ü╪┤┘ä ╪¡┘ü╪╕ ╪º┘ä┘ü╪º╪¬┘ê╪▒╪⌐"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
