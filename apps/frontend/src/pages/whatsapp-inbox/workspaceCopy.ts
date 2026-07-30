type WorkspaceLanguage = 'ar' | 'en';

type InboxWorkspaceCopy = {
  isArabic: boolean;
  locale: string;
  common: {
    online: string;
    offline: string;
    noDepartment: string;
    unassigned: string;
    vip: string;
    active: string;
    pending: string;
    search: string;
    save: string;
    saving: string;
    close: string;
    delete: string;
  };
  inbox: {
    railEyebrow: string;
    railTitle: string;
    heroEyebrow: string;
    heroFallbackTitle: string;
    heroDescription: string;
    metrics: {
      waiting: string;
      assigned: string;
      pending: string;
      slaBreached: string;
      missed: string;
      escalated: string;
    };
    searchPlaceholder: string;
    refresh: string;
    openDashboard: string;
    queueTabs: {
      all: string;
      waiting: string;
      assigned: string;
      pending: string;
      closed: string;
      escalated: string;
      missed: string;
    };
    emptyStateTitle: string;
    emptyStateDescription: string;
    previewFallback: string;
    moderatorPoolEyebrow: string;
    moderatorPoolTitle: string;
    moderatorPoolEmpty: string;
    statusFallback: string;
  };
  chat: {
    back: string;
    chatLabel: string;
    owner: string;
    language: string;
    country: string;
    department: string;
    lockUntil: string;
    slaDeadline: string;
    replyPlaceholder: string;
    sendReply: string;
    mediaHint: {
      IMAGE: string;
      VIDEO: string;
      AUDIO: string;
      DOCUMENT: string;
      VOICE: string;
      default: string;
    };
    status: Record<string, string>;
    tags: {
      title: string;
      addPlaceholder: string;
      add: string;
    };
    transfer: {
      title: string;
      selectPlaceholder: string;
      onlineBadge: string;
      offlineBadge: string;
      button: string;
    };
    collaboration: {
      title: string;
      placeholder: string;
      mentionTitle: string;
      saveNote: string;
      requestAssistance: string;
    };
    orders: {
      title: string;
      empty: string;
      itemsOne: string;
      itemsOther: string;
    };
    notes: {
      title: string;
      empty: string;
    };
    vipBadge: string;
    unassigned: string;
    notAvailable: string;
  };
  notifications: {
    heroEyebrow: string;
    title: string;
    description: string;
    metrics: {
      total: string;
      unread: string;
      read: string;
    };
    filters: {
      all: string;
      unread: string;
      read: string;
    };
    markAllRead: string;
    listTitle: string;
    listDescription: string;
    unreadState: string;
    readState: string;
    openConversation: string;
    deleteNotification: string;
    sessionTag: string;
    conversationTag: string;
    pagination: string;
    emptyTitle: string;
    emptyDescription: string;
    errors: {
      load: string;
      markRead: string;
      markAllRead: string;
      delete: string;
    };
    types: Record<string, string>;
  };
  settings: {
    heroEyebrow: string;
    title: string;
    description: string;
    heroMetrics: {
      routingStrategy: string;
      vipTeams: string;
    };
    actions: {
      save: string;
      saving: string;
    };
    toasts: {
      saved: string;
      saveFailed: string;
      loadFailed: string;
    };
    tabs: Record<string, string>;
    assignment: {
      title: string;
      description: string;
      distributionStrategy: string;
      activeWeight: string;
      activeWeightHint: string;
      pendingWeight: string;
      toggles: Record<string, string>;
      snapshotTitle: string;
      snapshotDescription: string;
      maxChatsPerModerator: string;
      reassignTimeout: string;
      queuePriorityOrder: string;
    };
    ownership: {
      title: string;
      description: string;
      lockDuration: string;
      transferRequiresNote: string;
      requireTransferReason: string;
      toggles: Record<string, string>;
    };
    queue: {
      title: string;
      description: string;
      maxChatsPerModerator: string;
      waitingQueueLimit: string;
      pendingQueueLimit: string;
      queuePriorityOrder: string;
      queuePriorityHint: string;
      autoMoveAssignedToActive: string;
    };
    reassignment: {
      title: string;
      description: string;
      timeoutMinutes: string;
      warningMinutes: string;
      fallbackStrategy: string;
      toggles: Record<string, string>;
    };
    skills: {
      title: string;
      description: string;
      languages: string;
      departments: string;
      expertise: string;
      vipTeams: string;
      snapshotTitle: string;
      snapshotDescription: string;
      snapshotEmpty: string;
      snapshotSummary: (usersCount: number, teamsCount: number) => string;
    };
    sla: {
      title: string;
      description: string;
      firstResponse: string;
      maxWaiting: string;
      escalation: string;
      missedChat: string;
      atRiskNote: string;
      escalatedNote: string;
    };
    notifications: {
      title: string;
      description: string;
      browserPush: string;
      soundEnabled: string;
      realTime: string;
      assignmentAlerts: string;
      queueAlerts: string;
      timeoutWarnings: string;
      soundUrl: string;
    };
    workingHours: {
      title: string;
      description: string;
      enabled: string;
      startTime: string;
      endTime: string;
      workingDays: string;
    };
    weekdays: Record<string, string>;
  };
};

const arabicCopy: InboxWorkspaceCopy = {
  isArabic: true,
  locale: 'ar-EG',
  common: {
    online: 'متصل',
    offline: 'غير متصل',
    noDepartment: 'بدون قسم',
    unassigned: 'غير مسند',
    vip: 'عميل VIP',
    active: 'نشطة',
    pending: 'معلقة',
    search: 'بحث',
    save: 'حفظ',
    saving: 'جارٍ الحفظ...',
    close: 'إغلاق',
    delete: 'حذف',
  },
  inbox: {
    railEyebrow: 'جلسات واتساب',
    railTitle: 'الأرقام المسندة',
    heroEyebrow: 'صندوق وارد بملكية حصرية',
    heroFallbackTitle: 'صندوق وارد واتساب للفريق',
    heroDescription: 'يعرض هذا المسار المحادثات الخاصة بالرقم الحالي مع توزيع حصري لمالك واحد فقط، مع رؤية إشرافية للأدمن وقائد الفريق عند الحاجة.',
    metrics: {
      waiting: 'قيد الانتظار',
      assigned: 'المسندة والنشطة',
      pending: 'معلقة',
      slaBreached: 'خرق SLA',
      missed: 'فائتة',
      escalated: 'مصعدة',
    },
    searchPlaceholder: 'ابحث باسم العميل أو رقم الهاتف أو ملخص الرسالة',
    refresh: 'تحديث القائمة',
    openDashboard: 'فتح لوحة المشرفين',
    queueTabs: {
      all: 'الكل',
      waiting: 'الانتظار',
      assigned: 'المسندة',
      pending: 'المعلقة',
      closed: 'المغلقة',
      escalated: 'المصعدة',
      missed: 'الفائتة',
    },
    emptyStateTitle: 'لا توجد محادثات ضمن هذا النطاق',
    emptyStateDescription: 'جرّب تغيير الـ queue أو مسح البحث الحالي لعرض محادثات أخرى.',
    previewFallback: 'لا توجد معاينة رسالة متاحة بعد.',
    moderatorPoolEyebrow: 'قدرة الفريق',
    moderatorPoolTitle: 'سعة المودريتورز المباشرة',
    moderatorPoolEmpty: 'لا يوجد مودريتورز مؤهلون لهذا الرقم حاليًا.',
    statusFallback: 'غير محدد',
  },
  chat: {
    back: 'رجوع',
    chatLabel: 'المحادثة',
    owner: 'المالك',
    language: 'اللغة',
    country: 'الدولة',
    department: 'القسم',
    lockUntil: 'القفل حتى',
    slaDeadline: 'موعد SLA',
    replyPlaceholder: 'رد كمالك المحادثة...',
    sendReply: 'إرسال الرد',
    mediaHint: {
      IMAGE: 'صورة',
      VIDEO: 'فيديو',
      AUDIO: 'صوت',
      DOCUMENT: 'ملف',
      VOICE: 'رسالة صوتية',
      default: 'ملف مرفق',
    },
    status: {
      NEW: 'جديدة',
      QUEUED: 'في الطابور',
      ASSIGNED: 'مسندة',
      ACTIVE: 'نشطة',
      PENDING: 'معلقة',
      WAITING_CUSTOMER: 'بانتظار العميل',
      ESCALATED: 'مصعدة',
      CLOSED: 'مغلقة',
    },
    tags: {
      title: 'الوسوم',
      addPlaceholder: 'أضف وسم',
      add: 'إضافة',
    },
    transfer: {
      title: 'التحويل / إعادة الإسناد',
      selectPlaceholder: 'اختر مودريتور',
      onlineBadge: 'متصل',
      offlineBadge: 'غير متصل',
      button: 'تحويل المحادثة',
    },
    collaboration: {
      title: 'التعاون الداخلي',
      placeholder: 'ملاحظة داخلية، ملخص تسليم، أو طلب مساعدة...',
      mentionTitle: 'أشر إلى زميل',
      saveNote: 'حفظ ملاحظة داخلية',
      requestAssistance: 'طلب مساعدة',
    },
    orders: {
      title: 'سجل الطلبات',
      empty: 'لا توجد طلبات سابقة',
      itemsOne: 'قطعة',
      itemsOther: 'قطع',
    },
    notes: {
      title: 'تسلسل الملاحظات الداخلية',
      empty: 'لا توجد ملاحظات داخلية بعد.',
    },
    vipBadge: 'VIP',
    unassigned: 'غير مسند',
    notAvailable: 'المحادثة غير متاحة',
  },
  notifications: {
    heroEyebrow: 'تنبيهات الصندوق',
    title: 'إشعارات الـ Inbox',
    description: 'تابع التنبيهات الحية الخاصة بالإسناد والتحويل وتغيّر الحالة دون مغادرة مساحة العمل.',
    metrics: {
      total: 'إجمالي الإشعارات',
      unread: 'غير المقروءة',
      read: 'المقروءة',
    },
    filters: {
      all: 'الكل',
      unread: 'غير المقروءة',
      read: 'المقروءة',
    },
    markAllRead: 'تحديد الكل كمقروء',
    listTitle: 'سجل التنبيهات',
    listDescription: 'آخر الأحداث التشغيلية المرتبطة بالمحادثات والرقم الحالي.',
    unreadState: 'غير مقروء',
    readState: 'تمت القراءة',
    openConversation: 'فتح المحادثة',
    deleteNotification: 'حذف الإشعار',
    sessionTag: 'الرقم',
    conversationTag: 'المحادثة',
    pagination: 'صفحة',
    emptyTitle: 'لا توجد إشعارات حاليًا',
    emptyDescription: 'بمجرد وصول رسالة جديدة أو تحويل محادثة أو تغيّر حالتها، ستظهر التنبيهات هنا.',
    errors: {
      load: 'تعذر تحميل الإشعارات الآن.',
      markRead: 'تعذر تحديث حالة الإشعار الآن.',
      markAllRead: 'تعذر تحديد جميع الإشعارات كمقروءة الآن.',
      delete: 'تعذر حذف الإشعار الآن.',
    },
    types: {
      new_message: 'رسالة جديدة',
      transfer: 'تحويل محادثة',
      status_change: 'تغيير حالة',
      default: 'تنبيه تشغيلي',
    },
  },
  settings: {
    heroEyebrow: 'مركز التحكم التشغيلي',
    title: 'إعدادات صندوق واتساب للفريق',
    description: 'كل إعدادات التوزيع والملكية والـ SLA والتنبيهات مجمعة هنا في صفحة واحدة بدون أي تكرار أو تشتت.',
    heroMetrics: {
      routingStrategy: 'استراتيجية التوزيع',
      vipTeams: 'فرق الـ VIP',
    },
    actions: {
      save: 'حفظ إعدادات الـ Inbox',
      saving: 'جارٍ حفظ الإعدادات...',
    },
    toasts: {
      saved: 'تم حفظ الإعدادات بنجاح.',
      saveFailed: 'تعذر حفظ الإعدادات الآن.',
      loadFailed: 'تعذر تحميل إعدادات الـ Inbox الآن.',
    },
    tabs: {
      assignment: 'التوزيع',
      ownership: 'الملكية',
      queue: 'الطوابير',
      reassignment: 'إعادة الإسناد',
      skills: 'المهارات',
      sla: 'SLA',
      notifications: 'التنبيهات',
      workingHours: 'ساعات العمل',
    },
    assignment: {
      title: 'قواعد التوزيع',
      description: 'اختر محرك الإسناد وكيف يوازن بين الأحمال وأولوية العملاء الحاليين والعائدين.',
      distributionStrategy: 'استراتيجية التوزيع',
      activeWeight: 'وزن المحادثات النشطة',
      activeWeightHint: 'كلما زادت القيمة زاد تأثير المحادثات النشطة داخل Least Load.',
      pendingWeight: 'وزن المحادثات المعلقة',
      toggles: {
        stickyReturningCustomers: 'تثبيت العميل العائد على مالكه السابق',
        respectOnlineStatus: 'مراعاة حالة الاتصال',
        respectWorkingHours: 'مراعاة ساعات العمل',
        vipRouting: 'توجيه خاص لعملاء VIP',
        countryDetection: 'اكتشاف الدولة تلقائيًا',
        languageDetection: 'اكتشاف اللغة تلقائيًا',
        previousOwnerPreference: 'تفضيل المالك السابق',
        priorityCustomersFirst: 'أولوية العملاء ذوي الأهمية',
      },
      snapshotTitle: 'لقطة تشغيلية فورية',
      snapshotDescription: 'ملخص سريع للحالة الحالية لمحرك التوزيع.',
      maxChatsPerModerator: 'الحد الأقصى لكل مودريتور',
      reassignTimeout: 'مهلة إعادة الإسناد',
      queuePriorityOrder: 'أولوية الطابور الحالية',
    },
    ownership: {
      title: 'قواعد ملكية المحادثة',
      description: 'حدد زمن القفل، من يملك صلاحية الـ override، ومتى يُشترط سبب واضح للتحويل.',
      lockDuration: 'مدة القفل بالدقائق',
      transferRequiresNote: 'إلزام سبب عند التحويل',
      requireTransferReason: 'اشترط كتابة سبب واضح لطلب التحويل',
      toggles: {
        exclusiveVisibility: 'رؤية حصرية لمالك المحادثة',
        allowAdminOverride: 'سماح Override للأدمن',
        allowTeamLeaderOverride: 'سماح Override لقائد الفريق',
        allowModeratorTransferRequest: 'سماح طلب تحويل من المودريتور',
      },
    },
    queue: {
      title: 'إعدادات الطوابير',
      description: 'اضبط حدود الطوابير وأولوية الحركة بينها بما يناسب التشغيل اليومي.',
      maxChatsPerModerator: 'الحد الأقصى للمحادثات لكل مودريتور',
      waitingQueueLimit: 'حد طابور الانتظار',
      pendingQueueLimit: 'حد الطابور المعلق',
      queuePriorityOrder: 'ترتيب أولوية الطابور',
      queuePriorityHint: 'اكتب القيم مفصولة بفاصلة، مثال: VIP, RETURNING, NEW',
      autoMoveAssignedToActive: 'نقل المحادثة من مسندة إلى نشطة عند أول رد',
    },
    reassignment: {
      title: 'إعادة الإسناد التلقائية',
      description: 'عند التأخر أو الخروج من ساعات العمل أو تجاوز السعة، يعيد النظام توزيع المحادثة تلقائيًا.',
      timeoutMinutes: 'مهلة الرد بالدقائق',
      warningMinutes: 'تنبيه قبل المهلة',
      fallbackStrategy: 'استراتيجية الإسناد البديلة',
      toggles: {
        enabled: 'تفعيل النظام',
        reassignOnOffline: 'إعادة الإسناد عند Offline',
        reassignOutsideWorkingHours: 'مراعاة ساعات العمل',
        reassignOnCapacityReached: 'إعادة الإسناد عند امتلاء السعة',
      },
    },
    skills: {
      title: 'كتالوج المهارات',
      description: 'حدّد اللغات والأقسام والخبرات التي يعتمد عليها التوجيه المبني على المهارات.',
      languages: 'اللغات',
      departments: 'الأقسام',
      expertise: 'الخبرات',
      vipTeams: 'فرق VIP',
      snapshotTitle: 'لقطة المواهب الحالية',
      snapshotDescription: 'ملخص سريع للمهارات الموجودة حاليًا على المستخدمين داخل النظام.',
      snapshotEmpty: 'لا توجد مهارات مرصودة على المستخدمين بعد. يمكنك البدء بإضافة مهارات مفصولة بفواصل داخل ملف كل مستخدم.',
      snapshotSummary: (usersCount, teamsCount) => `يتوفر حاليًا ${usersCount} مشغلًا ضمن السياق، موزعين على ${teamsCount} فرق.`,
    },
    sla: {
      title: 'SLA والأداء',
      description: 'حدود أول رد وأقصى انتظار والتصعيد التلقائي حتى لا تضيع أي محادثة مهمة.',
      firstResponse: 'أول رد',
      maxWaiting: 'أقصى انتظار',
      escalation: 'مهلة التصعيد',
      missedChat: 'مهلة المحادثة الفائتة',
      atRiskNote: 'يبدأ النظام بإظهار تنبيهات الخطر قبل خرق الـ SLA بوقت كافٍ ليتمكن قادة الفريق من التدخل مبكرًا.',
      escalatedNote: 'المحادثات المصعدة تبقى مرئية داخل الطابور المناسب، لكنها تُوسم بوضوح لتسهيل المتابعة والاستلام القيادي.',
    },
    notifications: {
      title: 'إعدادات التنبيهات',
      description: 'تحكم في تنبيهات المتصفح والصوت والتنبيهات الفورية الخاصة بالإسناد والطوابير والمهل الزمنية.',
      browserPush: 'تفعيل إشعارات المتصفح',
      soundEnabled: 'تفعيل الصوت',
      realTime: 'تنبيهات فورية مباشرة',
      assignmentAlerts: 'تنبيهات الإسناد',
      queueAlerts: 'تنبيهات الطوابير',
      timeoutWarnings: 'تنبيهات انتهاء المهلة',
      soundUrl: 'رابط أو ملف صوت التنبيه',
    },
    workingHours: {
      title: 'ساعات العمل',
      description: 'يعتمد النظام على هذا الجدول في التوجيه الذكي وإعادة الإسناد التلقائية.',
      enabled: 'تفعيل ساعات العمل',
      startTime: 'بداية الدوام',
      endTime: 'نهاية الدوام',
      workingDays: 'أيام العمل',
    },
    weekdays: {
      SAT: 'السبت',
      SUN: 'الأحد',
      MON: 'الاثنين',
      TUE: 'الثلاثاء',
      WED: 'الأربعاء',
      THU: 'الخميس',
      FRI: 'الجمعة',
    },
  },
};

const englishCopy: InboxWorkspaceCopy = {
  isArabic: false,
  locale: 'en-GB',
  common: {
    online: 'Online',
    offline: 'Offline',
    noDepartment: 'No department',
    unassigned: 'Unassigned',
    vip: 'VIP',
    active: 'Active',
    pending: 'Pending',
    search: 'Search',
    save: 'Save',
    saving: 'Saving...',
    close: 'Close',
    delete: 'Delete',
  },
  inbox: {
    railEyebrow: 'WhatsApp sessions',
    railTitle: 'Assigned numbers',
    heroEyebrow: 'Single-owner inbox',
    heroFallbackTitle: 'WhatsApp team inbox',
    heroDescription: 'This workspace keeps every conversation visible to one owner at a time, while admins and team leaders retain supervisory access when needed.',
    metrics: {
      waiting: 'Waiting',
      assigned: 'Assigned & active',
      pending: 'Pending',
      slaBreached: 'SLA breached',
      missed: 'Missed',
      escalated: 'Escalated',
    },
    searchPlaceholder: 'Search by customer, phone number, or message preview',
    refresh: 'Refresh list',
    openDashboard: 'Open moderator dashboard',
    queueTabs: {
      all: 'All',
      waiting: 'Waiting',
      assigned: 'Assigned',
      pending: 'Pending',
      closed: 'Closed',
      escalated: 'Escalated',
      missed: 'Missed',
    },
    emptyStateTitle: 'No conversations match this scope',
    emptyStateDescription: 'Try changing the queue filter or clearing the current search to reveal more conversations.',
    previewFallback: 'No message preview is available yet.',
    moderatorPoolEyebrow: 'Team capacity',
    moderatorPoolTitle: 'Live moderator capacity',
    moderatorPoolEmpty: 'No eligible moderators are available for this number right now.',
    statusFallback: 'Unspecified',
  },
  chat: {
    back: 'Back',
    chatLabel: 'Chat',
    owner: 'Owner',
    language: 'Language',
    country: 'Country',
    department: 'Department',
    lockUntil: 'Lock until',
    slaDeadline: 'SLA deadline',
    replyPlaceholder: 'Reply as the conversation owner...',
    sendReply: 'Send reply',
    mediaHint: {
      IMAGE: 'Image',
      VIDEO: 'Video',
      AUDIO: 'Audio',
      DOCUMENT: 'Document',
      VOICE: 'Voice message',
      default: 'Attachment',
    },
    status: {
      NEW: 'New',
      QUEUED: 'Queued',
      ASSIGNED: 'Assigned',
      ACTIVE: 'Active',
      PENDING: 'Pending',
      WAITING_CUSTOMER: 'Waiting for customer',
      ESCALATED: 'Escalated',
      CLOSED: 'Closed',
    },
    tags: {
      title: 'Tags',
      addPlaceholder: 'Add tag',
      add: 'Add',
    },
    transfer: {
      title: 'Transfer / Reassign',
      selectPlaceholder: 'Select moderator',
      onlineBadge: 'online',
      offlineBadge: 'offline',
      button: 'Transfer chat',
    },
    collaboration: {
      title: 'Internal collaboration',
      placeholder: 'Internal note, handoff summary, or request assistance...',
      mentionTitle: 'Mention a colleague',
      saveNote: 'Save internal note',
      requestAssistance: 'Request assistance',
    },
    orders: {
      title: 'Order history',
      empty: 'No previous orders',
      itemsOne: 'item',
      itemsOther: 'items',
    },
    notes: {
      title: 'Internal notes timeline',
      empty: 'No internal notes yet.',
    },
    vipBadge: 'VIP',
    unassigned: 'Unassigned',
    notAvailable: 'Conversation not available',
  },
  notifications: {
    heroEyebrow: 'Inbox alerts',
    title: 'Inbox notifications',
    description: 'Track live assignment, transfer, and status updates without leaving the operational workspace.',
    metrics: {
      total: 'Total alerts',
      unread: 'Unread',
      read: 'Read',
    },
    filters: {
      all: 'All',
      unread: 'Unread',
      read: 'Read',
    },
    markAllRead: 'Mark all as read',
    listTitle: 'Notification feed',
    listDescription: 'The latest operational events related to conversations and assigned numbers.',
    unreadState: 'Unread',
    readState: 'Read',
    openConversation: 'Open conversation',
    deleteNotification: 'Delete notification',
    sessionTag: 'Number',
    conversationTag: 'Conversation',
    pagination: 'Page',
    emptyTitle: 'No notifications yet',
    emptyDescription: 'New messages, transfers, and status updates will appear here as they happen.',
    errors: {
      load: 'We could not load inbox notifications right now.',
      markRead: 'We could not update this notification right now.',
      markAllRead: 'We could not mark all notifications as read right now.',
      delete: 'We could not delete this notification right now.',
    },
    types: {
      new_message: 'New message',
      transfer: 'Transfer',
      status_change: 'Status update',
      default: 'Operational alert',
    },
  },
  settings: {
    heroEyebrow: 'Operational control center',
    title: 'WhatsApp team inbox settings',
    description: 'All routing, ownership, SLA, and notification controls live here in one clean workspace with no duplicate settings surfaces.',
    heroMetrics: {
      routingStrategy: 'Routing strategy',
      vipTeams: 'VIP teams',
    },
    actions: {
      save: 'Save inbox settings',
      saving: 'Saving settings...',
    },
    toasts: {
      saved: 'Inbox settings were saved successfully.',
      saveFailed: 'We could not save inbox settings right now.',
      loadFailed: 'We could not load inbox settings right now.',
    },
    tabs: {
      assignment: 'Assignment',
      ownership: 'Ownership',
      queue: 'Queues',
      reassignment: 'Reassignment',
      skills: 'Skills',
      sla: 'SLA',
      notifications: 'Notifications',
      workingHours: 'Working hours',
    },
    assignment: {
      title: 'Assignment rules',
      description: 'Choose the routing engine and how workload, availability, and customer priority are balanced.',
      distributionStrategy: 'Distribution strategy',
      activeWeight: 'Active chat weight',
      activeWeightHint: 'Higher values increase the impact of active chats inside Least Load routing.',
      pendingWeight: 'Pending chat weight',
      toggles: {
        stickyReturningCustomers: 'Keep returning customers with the previous owner',
        respectOnlineStatus: 'Respect online status',
        respectWorkingHours: 'Respect working hours',
        vipRouting: 'Enable VIP routing',
        countryDetection: 'Enable country detection',
        languageDetection: 'Enable language detection',
        previousOwnerPreference: 'Prefer previous owner',
        priorityCustomersFirst: 'Prioritize high-value customers',
      },
      snapshotTitle: 'Live routing snapshot',
      snapshotDescription: 'A quick summary of the current routing configuration in production.',
      maxChatsPerModerator: 'Max chats per moderator',
      reassignTimeout: 'Reassignment timeout',
      queuePriorityOrder: 'Current queue priority',
    },
    ownership: {
      title: 'Ownership lock rules',
      description: 'Control lock duration, override privileges, and when transfer requests must include a clear reason.',
      lockDuration: 'Lock duration (minutes)',
      transferRequiresNote: 'Transfer reason requirement',
      requireTransferReason: 'Require a transfer reason before handoff',
      toggles: {
        exclusiveVisibility: 'Exclusive visibility for the owner',
        allowAdminOverride: 'Allow admin override',
        allowTeamLeaderOverride: 'Allow team leader override',
        allowModeratorTransferRequest: 'Allow moderator transfer requests',
      },
    },
    queue: {
      title: 'Queue settings',
      description: 'Define queue limits and the priority order that shapes daily operations.',
      maxChatsPerModerator: 'Max chats per moderator',
      waitingQueueLimit: 'Waiting queue limit',
      pendingQueueLimit: 'Pending queue limit',
      queuePriorityOrder: 'Queue priority order',
      queuePriorityHint: 'Use comma-separated values, for example: VIP, RETURNING, NEW',
      autoMoveAssignedToActive: 'Move assigned chats to active on first reply',
    },
    reassignment: {
      title: 'Auto reassignment',
      description: 'Automatically reassign conversations when a moderator is delayed, offline, outside working hours, or over capacity.',
      timeoutMinutes: 'Timeout (minutes)',
      warningMinutes: 'Warning lead time',
      fallbackStrategy: 'Fallback strategy',
      toggles: {
        enabled: 'Enable auto reassignment',
        reassignOnOffline: 'Reassign offline moderators',
        reassignOutsideWorkingHours: 'Respect working hours',
        reassignOnCapacityReached: 'Reassign when capacity is reached',
      },
    },
    skills: {
      title: 'Skill catalog',
      description: 'Define the languages, departments, and expertise used by skill-based routing.',
      languages: 'Languages',
      departments: 'Departments',
      expertise: 'Expertise',
      vipTeams: 'VIP teams',
      snapshotTitle: 'Detected talent snapshot',
      snapshotDescription: 'A quick summary of the skills currently present across active users.',
      snapshotEmpty: 'No user skills have been detected yet. Start by adding comma-separated skills to each user profile.',
      snapshotSummary: (usersCount, teamsCount) => `${usersCount} active operators are available in context across ${teamsCount} teams.`,
    },
    sla: {
      title: 'SLA & performance',
      description: 'Define first-response, waiting, escalation, and missed-chat thresholds so no important conversation slips away.',
      firstResponse: 'First response',
      maxWaiting: 'Max waiting',
      escalation: 'Escalation',
      missedChat: 'Missed chat',
      atRiskNote: 'At-risk alerts start before the SLA breach window so team leaders can intervene before a conversation is missed.',
      escalatedNote: 'Escalated chats remain visible in the proper queue while gaining a dedicated tracking state for leadership takeover.',
    },
    notifications: {
      title: 'Notification settings',
      description: 'Control browser, sound, real-time, queue, assignment, and timeout alert behavior from one place.',
      browserPush: 'Browser push notifications',
      soundEnabled: 'Sound alerts',
      realTime: 'Real-time notifications',
      assignmentAlerts: 'Assignment alerts',
      queueAlerts: 'Queue alerts',
      timeoutWarnings: 'Timeout warnings',
      soundUrl: 'Alert sound file / URL',
    },
    workingHours: {
      title: 'Working hours',
      description: 'This schedule is used by smart routing and automatic reassignment logic.',
      enabled: 'Enable working hours',
      startTime: 'Start time',
      endTime: 'End time',
      workingDays: 'Working days',
    },
    weekdays: {
      SAT: 'Saturday',
      SUN: 'Sunday',
      MON: 'Monday',
      TUE: 'Tuesday',
      WED: 'Wednesday',
      THU: 'Thursday',
      FRI: 'Friday',
    },
  },
};

const priorityLabels: Record<WorkspaceLanguage, Record<string, string>> = {
  ar: {
    VIP: 'VIP',
    RETURNING: 'عميل عائد',
    NEW: 'عميل جديد',
  },
  en: {
    VIP: 'VIP',
    RETURNING: 'Returning customer',
    NEW: 'New customer',
  },
};

const strategyLabels: Record<WorkspaceLanguage, Record<string, string>> = {
  ar: {
    ROUND_ROBIN: 'Round Robin',
    LEAST_LOAD: 'أقل ضغط',
    SKILL_BASED: 'مبني على المهارات',
  },
  en: {
    ROUND_ROBIN: 'Round Robin',
    LEAST_LOAD: 'Least load',
    SKILL_BASED: 'Skill based',
  },
};

const resolveLanguage = (language?: string): WorkspaceLanguage =>
  String(language || '').toLowerCase().startsWith('ar') ? 'ar' : 'en';

export const getWhatsAppInboxWorkspaceCopy = (language?: string) =>
  resolveLanguage(language) === 'ar' ? arabicCopy : englishCopy;

export const formatPriorityToken = (token: string, language?: string) => {
  const locale = resolveLanguage(language);
  return priorityLabels[locale][String(token || '').toUpperCase()] || token;
};

export const formatAssignmentStrategy = (strategy: string, language?: string) => {
  const locale = resolveLanguage(language);
  return strategyLabels[locale][String(strategy || '').toUpperCase()] || strategy;
};
