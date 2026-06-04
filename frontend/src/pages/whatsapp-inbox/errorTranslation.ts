type ApiErrorLike = {
  response?: {
    data?: {
      code?: string;
      error?: string;
    };
  };
};

type TranslatorLike = (key: string) => string;

const ERROR_KEY_MAP: Record<string, string> = {
  'A team with this name already exists': 'whatsappInbox.errors.teamAlreadyExists',
  'Access check failed': 'whatsappInbox.errors.accessCheckFailed',
  'Authentication required': 'whatsappInbox.errors.authenticationRequired',
  'Conversation access check failed': 'whatsappInbox.errors.conversationAccessDenied',
  'Failed to add team member': 'whatsappInbox.errors.addMember',
  'Failed to assign number': 'whatsappInbox.errors.assignNumber',
  'Failed to load routing workspace': 'whatsappInbox.errors.routingWorkspaceLoad',
  'Failed to save routing rule': 'whatsappInbox.errors.saveRoutingRule',
  'Failed to create team': 'whatsappInbox.errors.createTeam',
  'Failed to fetch assignments': 'whatsappInbox.errors.numberAssignmentsLoad',
  'Failed to fetch available numbers': 'whatsappInbox.errors.availableNumbersLoad',
  'Failed to fetch dashboard data': 'whatsappInbox.errors.dashboardLoad',
  'Failed to fetch moderators': 'whatsappInbox.errors.moderatorsLoad',
  'Failed to fetch permissions': 'whatsappInbox.errors.permissionsLoad',
  'Failed to fetch teams': 'whatsappInbox.errors.teamsLoad',
  'Failed to fetch users': 'whatsappInbox.errors.usersLoad',
  'Failed to remove team member': 'whatsappInbox.errors.removeMember',
  'Failed to unassign number': 'whatsappInbox.errors.unassignNumber',
  'Failed to update user role': 'whatsappInbox.errors.updateUserRole',
  'Failed to update user status': 'whatsappInbox.errors.updateUserStatus',
  'Insufficient permissions': 'whatsappInbox.errors.insufficientPermissions',
  'Invalid role. Must be one of: AGENT, MANAGER, COMPANY_ADMIN':
    'whatsappInbox.errors.invalidRole',
  'Invalid routing mode': 'whatsappInbox.errors.invalidRoutingMode',
  'One or more selected employees are invalid or inactive.':
    'whatsappInbox.errors.invalidEmployee',
  'At least one employee must be selected':
    'whatsappInbox.errors.userRequired',
  'NUMBER_OWNER mode requires exactly one employee.':
    'whatsappInbox.errors.directModeRequiresOneEmployee',
  'ROUND_ROBIN mode requires at least two employees.':
    'whatsappInbox.errors.roundRobinRequiresTwoEmployees',
  'Session ID and User ID are required':
    'whatsappInbox.errors.assignmentFieldsRequired',
  'Session ID is required': 'whatsappInbox.errors.sessionRequired',
  'WhatsApp session not found.': 'whatsappInbox.errors.sessionNotFound',
  'Team name is required': 'whatsappInbox.errors.teamNameRequired',
  'Team not found': 'whatsappInbox.errors.teamNotFound',
  'Team member not found': 'whatsappInbox.errors.teamMemberNotFound',
  'User ID is required': 'whatsappInbox.errors.userRequired',
  'User not found': 'whatsappInbox.errors.userNotFound',
};

const hasArabic = (value: string) => /[\u0600-\u06FF]/.test(value);

export const translateInboxApiError = (
  error: unknown,
  t: TranslatorLike,
  fallbackKey = 'whatsappInbox.errorOccurred',
) => {
  const responseMessage = (error as ApiErrorLike)?.response?.data?.error;
  const responseCode = (error as ApiErrorLike)?.response?.data?.code;

  if (responseCode === 'INSUFFICIENT_PERMISSIONS') {
    return t('whatsappInbox.errors.insufficientPermissions');
  }

  if (responseCode === 'NUMBER_ACCESS_DENIED') {
    return t('whatsappInbox.errors.numberAccessDenied');
  }

  if (responseCode === 'CONVERSATION_ACCESS_DENIED') {
    return t('whatsappInbox.errors.conversationAccessDenied');
  }

  if (!responseMessage) {
    return t(fallbackKey);
  }

  const mappedKey = ERROR_KEY_MAP[responseMessage];
  if (mappedKey) {
    return t(mappedKey);
  }

  if (hasArabic(responseMessage)) {
    return responseMessage;
  }

  return t(fallbackKey);
};
