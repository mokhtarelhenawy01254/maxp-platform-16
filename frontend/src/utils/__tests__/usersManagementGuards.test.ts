import { getProtectedUserActionMessage } from "../usersManagementGuards";

const baseUsers = [
  { id: "admin-1", role: "COMPANY_ADMIN", isActive: true },
  { id: "agent-1", role: "AGENT", isActive: true },
];

describe("usersManagementGuards", () => {
  it("blocks deleting the current user", () => {
    expect(
      getProtectedUserActionMessage({
        users: baseUsers,
        targetedUserIds: ["agent-1"],
        currentUserId: "agent-1",
        action: "delete",
      }),
    ).toBe("لا يمكنك حذف حسابك من إدارة المستخدمين");
  });

  it("blocks deactivating the last active company admin", () => {
    expect(
      getProtectedUserActionMessage({
        users: baseUsers,
        targetedUserIds: ["admin-1"],
        currentUserId: "agent-1",
        action: "deactivate",
      }),
    ).toBe("لا يمكن تعطيل آخر مدير نشط في الشركة");
  });

  it("allows bulk actions when another active company admin remains", () => {
    expect(
      getProtectedUserActionMessage({
        users: [
          ...baseUsers,
          { id: "admin-2", role: "COMPANY_ADMIN", isActive: true },
        ],
        targetedUserIds: ["admin-1", "agent-1"],
        currentUserId: "viewer-1",
        action: "delete",
      }),
    ).toBeNull();
  });
});

