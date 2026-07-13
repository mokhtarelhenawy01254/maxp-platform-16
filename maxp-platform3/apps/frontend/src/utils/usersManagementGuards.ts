export type UsersManagementGuardRecord = {
  id: string;
  role: string;
  isActive: boolean;
};

type ProtectedUserAction = "delete" | "deactivate";

type ProtectedUserActionOptions = {
  users: UsersManagementGuardRecord[];
  targetedUserIds: string[];
  currentUserId?: string | null;
  action: ProtectedUserAction;
};

const ACTION_MESSAGES: Record<
  ProtectedUserAction,
  { self: string; lastAdmin: string }
> = {
  delete: {
    self: "لا يمكنك حذف حسابك من إدارة المستخدمين",
    lastAdmin: "لا يمكن حذف آخر مدير نشط في الشركة",
  },
  deactivate: {
    self: "لا يمكنك تعطيل حسابك الحالي",
    lastAdmin: "لا يمكن تعطيل آخر مدير نشط في الشركة",
  },
};

export const getProtectedUserActionMessage = ({
  users,
  targetedUserIds,
  currentUserId,
  action,
}: ProtectedUserActionOptions): string | null => {
  if (targetedUserIds.length === 0) {
    return null;
  }

  if (currentUserId && targetedUserIds.includes(currentUserId)) {
    return ACTION_MESSAGES[action].self;
  }

  const activeAdminIds = users
    .filter((entry) => entry.role === "COMPANY_ADMIN" && entry.isActive)
    .map((entry) => entry.id);

  const targetedActiveAdminCount = activeAdminIds.filter((id) =>
    targetedUserIds.includes(id),
  ).length;

  if (
    targetedActiveAdminCount > 0 &&
    activeAdminIds.length - targetedActiveAdminCount <= 0
  ) {
    return ACTION_MESSAGES[action].lastAdmin;
  }

  return null;
};

