import {
  DEFAULT_TASK_WORKSPACE_SETTINGS,
  loadTaskWorkspaceSettings,
  normalizeTaskWorkspaceSettings,
  saveTaskWorkspaceSettings,
} from "../taskWorkspaceSettings";

describe("taskWorkspaceSettings helpers", () => {
  it("normalizes invalid persisted values back to defaults", () => {
    expect(
      normalizeTaskWorkspaceSettings({
        defaultScope: "unknown",
        defaultSortBy: "missing",
        defaultSortOrder: "sideways",
        pageSize: 999,
      }),
    ).toEqual(DEFAULT_TASK_WORKSPACE_SETTINGS);
  });

  it("saves and reloads user-scoped settings", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };

    saveTaskWorkspaceSettings(storage, "company-1", "user-7", {
      ...DEFAULT_TASK_WORKSPACE_SETTINGS,
      defaultScope: "my-tasks",
      pageSize: 25,
      showMobileCommandBar: false,
    });

    expect(
      loadTaskWorkspaceSettings(storage, "company-1", "user-7"),
    ).toEqual(
      expect.objectContaining({
        defaultScope: "my-tasks",
        pageSize: 25,
        showMobileCommandBar: false,
      }),
    );
  });
});
