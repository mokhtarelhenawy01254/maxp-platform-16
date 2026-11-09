const sharedDatabase = require('../services/sharedDatabase');

const DEFAULT_EDUCATION_TABS = [
  {
    id: "dashboard",
    key: "/admin/education/dashboard",
    defaultLabelAr: "لوحة التحكم",
    defaultLabelEn: "Dashboard",
    labelAr: "لوحة التحكم",
    labelEn: "Dashboard",
    order: 0,
    visible: true,
    locked: false,
    iconName: "BarChart3"
  },
  {
    id: "subjects",
    key: "/admin/education/subjects",
    defaultLabelAr: "المواد الدراسية",
    defaultLabelEn: "Subjects",
    labelAr: "المواد الدراسية",
    labelEn: "Subjects",
    order: 1,
    visible: true,
    locked: false,
    iconName: "BookOpen"
  },
  {
    id: "packages",
    key: "/admin/education/packages",
    defaultLabelAr: "الباقات",
    defaultLabelEn: "Packages",
    labelAr: "الباقات",
    labelEn: "Packages",
    order: 2,
    visible: true,
    locked: false,
    iconName: "Gift"
  },
  {
    id: "students",
    key: "/admin/education/students",
    defaultLabelAr: "الطلاب",
    defaultLabelEn: "Students",
    labelAr: "الطلاب",
    labelEn: "Students",
    order: 3,
    visible: true,
    locked: false,
    iconName: "Users"
  },
  {
    id: "teachers",
    key: "/admin/education/teachers",
    defaultLabelAr: "المهندسين",
    defaultLabelEn: "Instructors",
    labelAr: "المهندسين",
    labelEn: "Instructors",
    order: 4,
    visible: true,
    locked: false,
    iconName: "GraduationCap"
  },
  {
    id: "teacher-schedule",
    key: "/admin/education/teacher-schedule",
    defaultLabelAr: "جدول المهندسين",
    defaultLabelEn: "Instructor Schedule",
    labelAr: "جدول المهندسين",
    labelEn: "Instructor Schedule",
    order: 5,
    visible: true,
    locked: false,
    iconName: "CalendarDays"
  },
  {
    id: "teacher-payments",
    key: "/admin/education/teacher-payments",
    defaultLabelAr: "مرتبات المهندسين",
    defaultLabelEn: "Instructor Payments",
    labelAr: "مرتبات المهندسين",
    labelEn: "Instructor Payments",
    order: 6,
    visible: true,
    locked: false,
    iconName: "DollarSign"
  },
  {
    id: "enrollments",
    key: "/admin/education/enrollments",
    defaultLabelAr: "التسجيلات",
    defaultLabelEn: "Enrollments",
    labelAr: "التسجيلات",
    labelEn: "Enrollments",
    order: 7,
    visible: true,
    locked: false,
    iconName: "Layers"
  },
  {
    id: "sessions",
    key: "/admin/education/sessions",
    defaultLabelAr: "الحصص",
    defaultLabelEn: "Sessions",
    labelAr: "الحصص",
    labelEn: "Sessions",
    order: 8,
    visible: true,
    locked: false,
    iconName: "Clock"
  },
  {
    id: "calendar",
    key: "/admin/education/calendar",
    defaultLabelAr: "التقويم",
    defaultLabelEn: "Calendar",
    labelAr: "التقويم",
    labelEn: "Calendar",
    order: 9,
    visible: true,
    locked: false,
    iconName: "CalendarDays"
  },
  {
    id: "funnel",
    key: "/admin/education/funnel",
    defaultLabelAr: "الإشعارات والفانل",
    defaultLabelEn: "Notifications & Funnel",
    labelAr: "الإشعارات والفانل",
    labelEn: "Notifications & Funnel",
    order: 10,
    visible: true,
    locked: false,
    iconName: "Megaphone"
  },
  {
    id: "settings",
    key: "/admin/education/settings",
    defaultLabelAr: "إعدادات النظام",
    defaultLabelEn: "Education Settings",
    labelAr: "إعدادات النظام",
    labelEn: "Education Settings",
    order: 11,
    visible: true,
    locked: true,
    iconName: "Settings"
  },
  {
    id: "logs",
    key: "/admin/education/logs",
    defaultLabelAr: "سجلات النظام التعليمي",
    defaultLabelEn: "Educational System Logs",
    labelAr: "سجلات النظام التعليمي",
    labelEn: "Educational System Logs",
    order: 12,
    visible: true,
    locked: false,
    iconName: "History"
  }
];

const sanitize = (str) => {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim();
};

const getSettings = async (req, res) => {
  try {
    const companyId = req.user?.companyId || req.user?.userCompanies?.[0]?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'غير مصرح' });

    const prisma = sharedDatabase.getSharedPrismaClient();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true }
    });

    if (!company) {
      return res.status(404).json({ success: false, error: 'الشركة غير موجودة' });
    }

    let parsedSettings = {};
    try {
      parsedSettings = company.settings ? JSON.parse(company.settings) : {};
    } catch {
      parsedSettings = {};
    }

    const savedEducation = parsedSettings.educationSettings || {};

    // Check custom app name if set
    let appCustomName = null;
    try {
      const companyApp = await prisma.companyApp.findFirst({
        where: {
          companyId,
          OR: [
            { appId: 'education-app' },
            { app: { slug: 'education-app' } }
          ]
        },
        select: { customName: true }
      });
      if (companyApp?.customName) {
        appCustomName = companyApp.customName;
      }
    } catch {
      // Ignore
    }

    const systemTitle = savedEducation.systemTitle || appCustomName || "النظام التعليمي";
    const systemTitleEn = savedEducation.systemTitleEn || "Education System";

    // Merge saved tabs with default tabs to guarantee all tabs exist
    const savedTabs = Array.isArray(savedEducation.tabs) ? savedEducation.tabs : [];
    const savedTabsMap = new Map();
    savedTabs.forEach((tab) => {
      if (tab && tab.id) {
        savedTabsMap.set(tab.id.toLowerCase(), tab);
      }
    });

    const mergedTabs = DEFAULT_EDUCATION_TABS.map((defTab, idx) => {
      const saved = savedTabsMap.get(defTab.id.toLowerCase());
      if (saved) {
        return {
          ...defTab,
          labelAr: typeof saved.labelAr === 'string' && saved.labelAr.trim() ? saved.labelAr.trim() : defTab.labelAr,
          labelEn: typeof saved.labelEn === 'string' && saved.labelEn.trim() ? saved.labelEn.trim() : defTab.labelEn,
          visible: defTab.locked ? true : (saved.visible !== false),
          order: typeof saved.order === 'number' ? saved.order : idx
        };
      }
      return {
        ...defTab,
        order: idx
      };
    });

    // Sort by order
    mergedTabs.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    mergedTabs.forEach((t, i) => {
      t.order = i;
    });

    res.json({
      success: true,
      data: {
        systemTitle,
        systemTitleEn,
        tabs: mergedTabs
      }
    });
  } catch (error) {
    console.error('Error fetching education settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء جلب إعدادات النظام التعليمي' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const userRole = String(req.user?.role || '').toUpperCase();
    const userPerms = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    if (!['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(userRole) && !userPerms.includes('settings.manage')) {
      return res.status(403).json({
        success: false,
        message: 'غير مصرح لك بتعديل إعدادات النظام التعليمي. هذه العملية مخصصة للمالك والمسؤولين فقط',
        code: 'FORBIDDEN'
      });
    }

    const companyId = req.user?.companyId || req.user?.userCompanies?.[0]?.companyId;
    if (!companyId) return res.status(403).json({ success: false, error: 'معرف الشركة مطلوب' });

    const { systemTitle, systemTitleEn, tabs } = req.body || {};

    let sanitizedTitle = "النظام التعليمي";
    if (systemTitle !== undefined && systemTitle !== null) {
      sanitizedTitle = sanitize(String(systemTitle));
      if (sanitizedTitle.length > 60) {
        return res.status(400).json({
          success: false,
          message: 'مسمى النظام يجب ألا يتجاوز 60 حرفاً'
        });
      }
      if (sanitizedTitle.length === 0) {
        sanitizedTitle = "النظام التعليمي";
      }
    }

    let sanitizedTitleEn = "Education System";
    if (systemTitleEn !== undefined && systemTitleEn !== null) {
      sanitizedTitleEn = sanitize(String(systemTitleEn));
      if (sanitizedTitleEn.length > 60) {
        return res.status(400).json({
          success: false,
          message: 'مسمى النظام بالإنجليزية يجب ألا يتجاوز 60 حرفاً'
        });
      }
      if (sanitizedTitleEn.length === 0) {
        sanitizedTitleEn = "Education System";
      }
    }

    let validatedTabs = [];
    if (Array.isArray(tabs)) {
      for (let i = 0; i < tabs.length; i++) {
        const item = tabs[i];
        if (!item || typeof item !== 'object') continue;
        const id = sanitize(String(item.id || ''));
        if (!id) continue;

        const def = DEFAULT_EDUCATION_TABS.find((d) => d.id.toLowerCase() === id.toLowerCase());
        const key = item.key || def?.key || `/admin/education/${id}`;
        const defaultLabelAr = def?.defaultLabelAr || item.defaultLabelAr || id;
        const defaultLabelEn = def?.defaultLabelEn || item.defaultLabelEn || id;
        const iconName = def?.iconName || item.iconName || "GraduationCap";
        const locked = def?.locked === true;

        const rawLabelAr = item.labelAr !== undefined ? item.labelAr : defaultLabelAr;
        const labelAr = sanitize(String(rawLabelAr || defaultLabelAr)).slice(0, 60);

        const rawLabelEn = item.labelEn !== undefined ? item.labelEn : defaultLabelEn;
        const labelEn = sanitize(String(rawLabelEn || defaultLabelEn)).slice(0, 60);

        const order = typeof item.order === 'number' && Number.isFinite(item.order) ? item.order : i;
        const visible = locked ? true : (item.visible !== false);

        validatedTabs.push({
          id,
          key,
          defaultLabelAr,
          defaultLabelEn,
          labelAr,
          labelEn,
          order,
          visible,
          locked,
          iconName
        });
      }
    } else {
      validatedTabs = DEFAULT_EDUCATION_TABS;
    }

    // Ensure all default tabs are present even if omitted by the frontend
    const existingIds = new Set(validatedTabs.map((t) => t.id.toLowerCase()));
    DEFAULT_EDUCATION_TABS.forEach((def, defIdx) => {
      if (!existingIds.has(def.id.toLowerCase())) {
        validatedTabs.push({
          ...def,
          order: validatedTabs.length + defIdx
        });
      }
    });

    validatedTabs.sort((a, b) => a.order - b.order);
    validatedTabs.forEach((t, idx) => {
      t.order = idx;
    });

    const prisma = sharedDatabase.getSharedPrismaClient();
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true }
    });

    if (!company) {
      return res.status(404).json({ success: false, message: 'الشركة غير موجودة' });
    }

    let currentSettings = {};
    try {
      currentSettings = company.settings ? JSON.parse(company.settings) : {};
    } catch {
      currentSettings = {};
    }

    // 1. Save educationSettings
    currentSettings.educationSettings = {
      systemTitle: sanitizedTitle,
      systemTitleEn: sanitizedTitleEn,
      tabs: validatedTabs
    };

    // 2. Synchronize into company.settings.sidebarSettings
    let currentSidebar = Array.isArray(currentSettings.sidebarSettings)
      ? [...currentSettings.sidebarSettings]
      : [];

    // Map of keys to update/add
    const educationSidebarItems = [];

    // Top-level education section title
    educationSidebarItems.push({
      key: 'education',
      order: 10,
      visible: true,
      labelAr: sanitizedTitle,
      labelEn: sanitizedTitleEn
    });

    // Sub-items
    validatedTabs.forEach((tab) => {
      educationSidebarItems.push({
        key: tab.key,
        order: tab.order,
        visible: tab.visible,
        labelAr: tab.labelAr,
        labelEn: tab.labelEn
      });
      // Also register clean relative key
      const cleanRelKey = tab.key.replace(/^\//, '');
      educationSidebarItems.push({
        key: cleanRelKey,
        order: tab.order,
        visible: tab.visible,
        labelAr: tab.labelAr,
        labelEn: tab.labelEn
      });
    });

    // Merge into currentSidebar without duplicating or losing other sections
    const incomingKeys = new Set(educationSidebarItems.map((it) => it.key.toLowerCase()));
    const remainingSidebar = currentSidebar.filter((it) => it && it.key && !incomingKeys.has(String(it.key).toLowerCase()));
    currentSettings.sidebarSettings = [...remainingSidebar, ...educationSidebarItems];

    // 3. Update companyApp customName if exists
    try {
      await prisma.companyApp.updateMany({
        where: {
          companyId,
          OR: [
            { appId: 'education-app' },
            { app: { slug: 'education-app' } }
          ]
        },
        data: {
          customName: sanitizedTitle
        }
      });
    } catch (caErr) {
      console.warn('⚠️ Could not update companyApp customName:', caErr.message);
    }

    // 4. Save to DB
    await prisma.company.update({
      where: { id: companyId },
      data: { settings: JSON.stringify(currentSettings) }
    });

    res.json({
      success: true,
      data: {
        systemTitle: sanitizedTitle,
        systemTitleEn: sanitizedTitleEn,
        tabs: validatedTabs
      },
      message: 'تم حفظ إعدادات النظام التعليمي بنجاح'
    });
  } catch (error) {
    console.error('Error updating education settings:', error);
    res.status(500).json({ success: false, error: 'حدث خطأ أثناء حفظ إعدادات النظام التعليمي', details: error.message });
  }
};

module.exports = {
  DEFAULT_EDUCATION_TABS,
  getSettings,
  updateSettings
};
