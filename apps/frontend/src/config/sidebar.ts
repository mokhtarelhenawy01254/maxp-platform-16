import { WhatsAppIcon, TelegramIcon, FacebookIcon, InstagramIcon } from '../components/icons/brands';
import { AlertTriangle, Archive, ArrowLeftRight, BadgePercent, Ban, Banknote, BarChart3, Bell, BellPlus, BellRing, BookOpen, Bot, Box, Briefcase, Building, Building2, Calculator, Calendar, CalendarDays, CheckCircle2, HelpCircle, CircleUser, ClipboardCheck, ClipboardList, Clock, Cog, CreditCard, DollarSign, DoorOpen, Download, Eye, FileBarChart, FileText, Filter, FlaskConical, FolderOpen, FolderTree, Gift, GitBranch, Globe, GraduationCap, Grid3x3, HardDrive, Heart, Home, Dna, Image, Inbox, Key, LayoutDashboard, Lightbulb, LineChart, Link, ListChecks, ListOrdered, MapPin, Megaphone, MessageSquare, Monitor, Network, Paintbrush, Palette, Package, PackageCheck, Percent, Plus, PlugZap, Printer, Radio, Receipt, RefreshCcw, Rocket, ScanLine, Search, Send, Settings, Settings2, ShieldAlert, ShieldCheck, ShoppingBag, ShoppingCart, Sparkles, Volume2, SquarePen, Star, Store, Table2, Tag, Target, Ticket, TrendingUp, Trophy, Truck, Undo2, UserPlus, Users, Wallet, Wrench, XCircle, Zap, Radiation, Landmark, Stethoscope, Coffee, Sliders, Trash2, History } from 'lucide-react'
import { SidebarManagementData, SidebarSection, SidebarSectionSettings } from '../types/layout';
import { APP_REGISTRY } from './appRegistry';
import { STORE_APP_SLUGS } from '../utils/storeShortcut';

type SidebarCompany = {
    activeApps?: unknown[];
    isCurrent?: boolean;
    name?: string | null;
    plan?: string | null;
    sidebarLayout?: string | null;
    aiToolsEnabled?: boolean;
};

type SidebarUser = {
    affiliate?: {
        canCreateOrdersForOthers?: boolean | null;
        canViewCustomerData?: boolean | null;
        status?: string | null;
    } | null;
    companies?: SidebarCompany[] | null;
    company?: SidebarCompany | null;
    email?: string | null;
    id?: number | string | null;
    role?: string | null;
    permissions?: string[];
    settings?: string | Record<string, unknown> | null;
    isDentalTechnician?: boolean;
    dentalRole?: string;
};

const hasRoleAccess = (userRole: string | undefined | null, requiredRoles: string[] | undefined): boolean => {
    if (!requiredRoles || requiredRoles.length === 0) return true;
    if (!userRole) return false;
    return requiredRoles.includes(userRole);
};

const getItemId = (item: { to: string; itemId?: string }): string => {
    return item.itemId || item.to.replace(/[^a-zA-Z0-9]/g, '_');
};

const mergeSectionOverrides = (
    section: SidebarSection,
    dbSection: SidebarSectionSettings | undefined,
    userDb: SidebarSectionSettings | undefined,
    userRole: string | undefined | null,
    userPerms?: string[],
): SidebarSection => {
    // Layer 1: Company-level settings
    // Layer 2: User-level settings (override company settings)
    const effectiveRoles = userDb?.requiredRoles ?? dbSection?.requiredRoles;
    const sectionRoleAccess = hasRoleAccess(userRole, effectiveRoles);

    // Respect original hidden (app deactivation, role restrictions, etc.)
    // even if DB/user settings say visible
    if (section.hidden === true || !sectionRoleAccess) {
        return { ...section, hidden: true };
    }

    // Apply DB/user visibility — but only user-level settings can hide a
    // runtime-visible section. Company-level DB settings cannot override
    // app-gated visibility, preventing stale "visible: false" data from
    // keeping a section hidden after its required app is reactivated.
    const effectiveVisible = userDb?.visible ?? (section.hidden === false ? undefined : dbSection?.visible);
    const sectionVisible = effectiveVisible !== false;
    if (!sectionVisible) {
        return { ...section, hidden: true };
    }

    const effectiveItems = userDb?.items ?? dbSection?.items;

    const overriddenItems = section.items
        .map((item) => {
            const itemId = getItemId(item);
            const dbItem = effectiveItems?.[itemId];

            // Check item-level requiredPermissions (from code, not DB)
            const isSuperOrAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'].includes(userRole || '');
            const itemPermissionAccess = isSuperOrAdmin || !item.requiredPermissions || item.requiredPermissions.length === 0 ||
                (userPerms && item.requiredPermissions.some(p => userPerms.includes(p)));

            if (!dbItem) {
                // No DB override, just apply permission-based hiding
                const isHidden = !itemPermissionAccess || item.hidden === true;
                return { ...item, hidden: isHidden, itemId };
            }

            const itemVisible = dbItem.visible !== false;
            const itemEnabled = dbItem.enabled !== false;
            const itemRoleAccess = hasRoleAccess(userRole, dbItem.requiredRoles);

            const isHidden = !itemVisible || !itemEnabled || !itemRoleAccess || !itemPermissionAccess || item.hidden === true;

            return { ...item, hidden: isHidden, itemId, requiredRoles: dbItem.requiredRoles };
        })
        .sort((a, b) => {
            const aId = getItemId(a);
            const bId = getItemId(b);
            const aOrder = effectiveItems?.[aId]?.order ?? 0;
            const bOrder = effectiveItems?.[bId]?.order ?? 0;
            return aOrder - bOrder;
        });

    return { ...section, items: overriddenItems };
};

const DOMAIN_PERMISSIONS: Record<string, string[]> = {
    'main': ['dashboard.view'],
    'unified-inbox-section': ['inbox.view', 'inbox.view.own', 'inbox.view.team', 'inbox.view.all', 'conversations.view', 'facebook.view', 'instagram.view', 'whatsapp.view', 'telegram.view'],
    'facebook': ['inbox.view', 'inbox.view.own', 'inbox.view.team', 'inbox.view.all', 'conversations.view', 'facebook.view'],
    'instagram': ['inbox.view', 'inbox.view.own', 'inbox.view.team', 'inbox.view.all', 'conversations.view', 'instagram.view'],
    'whatsapp': ['whatsapp.view', 'inbox.view', 'inbox.view.own', 'inbox.view.team', 'inbox.view.all', 'conversations.view'],
    'telegram': ['telegram.view', 'inbox.view', 'inbox.view.own', 'inbox.view.team', 'inbox.view.all', 'conversations.view'],
    'orders': [
        'orders.view', 'orders.create', 'orders.edit', 'orders.delete', 'orders.status.change', 'orders.assign', 'orders.export',
        'orders.incomplete.view', 'orders.preparation.view', 'orders.workspace.view', 'orders.confirmation.view',
        'orders.quickstatus.view', 'orders.turbo.view', 'orders.bosta.view', 'orders.stats.view',
        'orders.automation.view', 'orders.invoices.view', 'orders.manual.create', 'orders.status-summary.view',
        'orders.returns.view', 'orders.shipping.view', 'orders.tickets.view', 'orders.bulk-search.view',
        'orders.pos.view', 'orders.settings.view', 'orders.customer-blocks.view', 'orders.turbo-settings.view',
        'orders.return-settings.view', 'orders.cancellation-reasons.view', 'orders.integrations.view',
        'orders.workflow.view', 'orders.product-reviews.view', 'orders.whatsapp-notifications.view',
    ],
    'customers': ['customers.view'],
    'marketplace': ['settings.view'],
    'company': ['settings.view', 'users.view', 'roles.view'],
    'products': ['products.view'],
    'procurement': ['finance.view', 'finance.invoices', 'finance.payments'],
    'analytics': ['reports.view'],
    'marketing-agency': ['dashboard.view', 'settings.view'],
    'marketing': ['dashboard.view', 'settings.view'],
    'notifications': ['settings.view', 'notifications.view']
};

const hasPermissionAccessForSection = (user: SidebarUser | undefined, sectionId: string): boolean => {
    if (!user) return false;
    
    if (['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'].includes(user.role || '')) return true;
    
    const userPerms = user.permissions || [];
    
    // Built-in roles with no explicit permissions assigned:
    // Fail-safe: deny access so that sections are hidden until permissions are properly loaded.
    const BUILT_IN_ROLES = ['MANAGER', 'AGENT', 'AFFILIATE', 'MERCHANT'];
    if (BUILT_IN_ROLES.includes(user.role || '') && userPerms.length === 0) {
        return false;
    }
    
    if (sectionId === 'settings' || sectionId === 'my-account') return true;

    const reqPerms = DOMAIN_PERMISSIONS[sectionId];
    if (reqPerms && reqPerms.length > 0) {
        return reqPerms.some(p => userPerms.includes(p));
    }
    
    // Sections that do not define domain-level restrictions (e.g. vertical apps) are accessible
    return true;
};

const applySidebarOverrides = (
    sections: SidebarSection[],
    managementData: SidebarManagementData | undefined,
    userRole: string | undefined | null,
    userSettings?: { enabled: boolean; sections: Record<string, SidebarSectionSettings> } | undefined,
    user?: SidebarUser | undefined,
): SidebarSection[] => {
    const dbSections = managementData?.sections;
    const userSections = userSettings?.enabled ? userSettings.sections : undefined;

    const permissionFilteredSections = sections.filter(section => hasPermissionAccessForSection(user, section.id));

    if ((!dbSections || Object.keys(dbSections).length === 0) && (!userSections || Object.keys(userSections).length === 0)) {
        return permissionFilteredSections.map(section => ({
            ...section,
            items: section.items.map(item => {
                const isSuperOrAdmin = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'].includes(user?.role || '');
                const userPerms = user?.permissions || [];
                const itemPermissionAccess = isSuperOrAdmin || !item.requiredPermissions || item.requiredPermissions.length === 0 ||
                    userPerms.some(p => item.requiredPermissions!.includes(p));
                return { ...item, hidden: !itemPermissionAccess || item.hidden === true };
            })
        }));
    }

    return permissionFilteredSections
        .map((section) => {
            const dbSection = dbSections?.[section.id];
            const userSection = userSections?.[section.id];
            return mergeSectionOverrides(section, dbSection, userSection, userRole, user?.permissions);
        })
        .sort((a, b) => {
            const aDb = dbSections?.[a.id];
            const bDb = dbSections?.[b.id];
            const aUser = userSections?.[a.id];
            const bUser = userSections?.[b.id];
            const aOrder = aUser?.order ?? aDb?.order ?? 0;
            const bOrder = bUser?.order ?? bDb?.order ?? 0;
            return aOrder - bOrder;
        });
};

export const getSidebarConfig = (
    t: (key: string) => string,
    user: SidebarUser,
    sidebarManagementData?: SidebarManagementData,
    userSidebarSettings?: { enabled: boolean; sections: Record<string, SidebarSectionSettings> },
    assignedApps?: string[],
): SidebarSection[] => {
    const savedLang = typeof window !== 'undefined' ? localStorage.getItem('language') : null;
    const docLang = typeof document !== 'undefined' ? document.documentElement.lang : null;
    const isExplicitAr = savedLang === 'ar' || docLang === 'ar';

    const isEn = !isExplicitAr && Boolean(
        savedLang === 'en' ||
        docLang === 'en' ||
        (typeof t === 'function' && t('sidebar.marketingSection') === 'Marketing & Advertising')
    );

    const debugWindow =
        typeof window !== 'undefined'
            ? (window as Window & { debugSidebar?: boolean; debug?: boolean })
            : undefined;
    const shouldDebugSidebar =
        import.meta.env?.DEV &&
        ((debugWindow?.debugSidebar === true) || (debugWindow?.debug === true));

    // 🔍 DEBUG: Track user role for sidebar visibility
    if (shouldDebugSidebar) {
        console.log('🔍 [SIDEBAR] getSidebarConfig called with user:', {
            role: user?.role,
            email: user?.email,
            id: user?.id,
        });
    }

    const currentCompany = user?.companies?.find((c) => c.isCurrent) || user?.company;
    const activeApps = currentCompany?.activeApps || [];
    // ponytail: plan-based superCompany check removed

    if (shouldDebugSidebar) {
        console.log('🔍 [SIDEBAR-DEBUG] Current Company:', currentCompany?.name);
        console.log('🔍 [SIDEBAR-DEBUG] Active Apps Count:', activeApps?.length);
        console.log('🔍 [SIDEBAR-DEBUG] Active Apps List:', activeApps);
    }

    const FEATURE_FLAG_MAP: Record<string, boolean | undefined> = {
        aiToolsEnabled: currentCompany?.aiToolsEnabled === true,
    };
    const isFeatureEnabled = (key: string): boolean => FEATURE_FLAG_MAP[key] === true;

    const isAppActive = (slug: string) => {
        if (!slug || !Array.isArray(activeApps)) return false;
        const targetSlug = slug.trim().toLowerCase();
        return activeApps.some(a => {
            if (typeof a === 'string') return a.trim().toLowerCase() === targetSlug;
            if (a && typeof a === 'object') {
                const obj = a as { slug?: string; app?: { slug?: string } };
                if (typeof obj.slug === 'string' && obj.slug.trim().toLowerCase() === targetSlug) return true;
                if (obj.app && typeof obj.app.slug === 'string' && obj.app.slug.trim().toLowerCase() === targetSlug) return true;
            }
            return false;
        });
    };
    const isAnyAppActive = (slugs: string[]) => slugs.some((slug) => isAppActive(slug));
    const isStoreActive = () => isAnyAppActive([...STORE_APP_SLUGS]);
    const hasMultipleCompanies = (user?.companies?.length ?? 0) > 1;
    const canManageTaskIntegrations = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'].includes(user?.role || '');
    const isRadiologyManager = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(user?.role || '');

    if (user?.role === 'MERCHANT') {
        return [
            {
                id: 'merchant-portal',
                title: t('sidebar.merchantPortalSection'),
                icon: Store,
                items: [
                    { to: '/merchant-portal', icon: BarChart3, label: t('sidebar.merchantPortal') },
                    { to: '/products', icon: ShoppingBag, label: t('sidebar.merchantProducts') },
                    { to: '/inventory', icon: Box, label: t('sidebar.inventory') },
                    { to: '/orders', icon: Archive, label: t('sidebar.merchantOrders') },
                    { to: '/merchant-portal/commissions', icon: Banknote, label: t('sidebar.merchantCommissions') },
                ],
            },
            {
                id: 'merchant-account',
                title: t('sidebar.myAccountSection'),
                icon: CircleUser,
                items: [
                    { to: '/profile', icon: CircleUser, label: t('sidebar.myProfile') },
                ],
            },
        ];
    }

    if (user?.role === 'AFFILIATE') {
        const affiliateProfile = user.affiliate;
        const canCreateOrdersForOthers = affiliateProfile?.canCreateOrdersForOthers !== false;
        const canViewCustomerData = affiliateProfile?.canViewCustomerData !== false;
        const affiliateItems = [
            { to: '/affiliates/dashboard', icon: BarChart3, label: t('dashboard.title') },
            { to: '/affiliates/orders', icon: Archive, label: t('sidebar.myOrders') },
            ...(canCreateOrdersForOthers
                ? [{ to: '/affiliates/orders/create', icon: SquarePen, label: t('sidebar.affiliateCreateOrder') }]
                : []),
            ...(canViewCustomerData
                ? [{ to: '/affiliates/customers', icon: Users, label: t('sidebar.customers') }]
                : []),
            { to: '/affiliates/referrals', icon: TrendingUp, label: t('sidebar.referrals') },
            { to: '/affiliates/commission', icon: Banknote, label: t('sidebar.commissions') },
        ];

        return [
            {
                id: 'affiliate-portal',
                title: t('sidebar.affiliateSection'),
                icon: DollarSign,
                items: affiliateItems,
            },
            {
                id: 'affiliate-account',
                title: t('sidebar.myAccountSection'),
                icon: CircleUser,
                items: [
                    { to: '/profile', icon: CircleUser, label: t('sidebar.myProfile') },
                ],
            },
        ];
    }

    // 🩺 قصر القائمة الجانبية لفني معمل الأسنان على ما يخصه فقط (Bench, Barcode, Wage, Profile)
    // 🛡️ لا يطبق إطلاقاً على مالكي الشركات أو المديرين (OWNER, COMPANY_ADMIN, SUPER_ADMIN)
    const isPlatformOwnerOrAdmin = ['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');

    const isTechFromStorage = !isPlatformOwnerOrAdmin && typeof window !== 'undefined' && (() => {
        try {
            const raw = localStorage.getItem('user');
            if (raw) {
                const parsed = JSON.parse(raw);
                // تحقق دقيق: يجب أن يطابق معرف المستخدم الحالي لضمان عدم تسريب بيانات جلسات سابقة
                if (parsed?.id && user?.id && parsed.id === user.id) {
                    if (parsed?.isDentalTechnician === true || parsed?.dentalRole === 'TECHNICIAN') return true;
                }
            }
        } catch { return false; }
        return false;
    })();

    const isTechnicianOnlyUser = !isPlatformOwnerOrAdmin && (
        user?.isDentalTechnician === true ||
        user?.dentalRole === 'TECHNICIAN' ||
        isTechFromStorage
    );

    if (isTechnicianOnlyUser) {
        return [
            {
                id: 'dental-technician-portal',
                title: isEn ? 'Dental Lab Station' : t('sidebar.dentalLabTechnicianModule', 'محطة عمل الفني'),
                icon: Stethoscope,
                items: [
                    { to: '/dental-lab', icon: ListChecks, label: isEn ? 'My Cases & Bench' : t('sidebar.dentalLabMyCases', 'حالاتي ومحطة الإنتاج') },
                    { to: '/dental-lab/kiosk', icon: ScanLine, label: isEn ? 'Barcode Scanner' : t('sidebar.dentalLabKiosk', 'ماسح الباركود السريع') },
                    { to: '/dental-lab/my-wage', icon: Wallet, label: isEn ? 'My Wage & Ledger' : t('sidebar.dentalLabMyWage', 'مستحقاتي وسجل الصرف') },
                    { to: '/dental-lab/notifications', icon: Bell, label: isEn ? 'My Alerts & Overdue' : t('sidebar.dentalLabNotifications', 'إشعاراتي وتنبيهات العمل') },
                    { to: '/dental-lab/reports', icon: BarChart3, label: isEn ? 'Productivity Report' : t('sidebar.dentalLabReports', 'تقرير الإنتاجية والأداء') },
                ],
            },
        ];
    }

    if (shouldDebugSidebar) {
        console.log('🔍 [SIDEBAR] Full user object:', user);
        console.log('🔍 [SIDEBAR] Company data:', user?.company);
    }

    const isAffiliateDemoCompany = currentCompany?.sidebarLayout === 'affiliate-demo';
    const isCompanyOperator = ['OWNER', 'COMPANY_ADMIN'].includes(user?.role || '');

    if (isAffiliateDemoCompany && isCompanyOperator) {
        return [
            {
                id: 'main',
                title: t('sidebar.mainSection'),
                icon: BarChart3,
                items: [
                    { to: '/company-dashboard', icon: BarChart3, label: t('sidebar.dashboard') },
                    { to: '/my-companies/links', icon: Building, label: t('sidebar.companyLinks') },
                ],
            },
            {
                id: 'storefront-design',
                title: t('sidebar.storefrontSection'),
                icon: Palette,
                items: [
                    {
                        to: '/shop',
                        icon: Store,
                        label: t('sidebar.visitStore'),
                        external: true,
                    },
                    { to: '/settings/store-pages', icon: FileText, label: t('sidebar.storePages') },
                    { to: '/settings/store?tab=branches', icon: Store, label: t('sidebar.storeSettings') },
                    { to: '/settings/store/tools', icon: Sparkles, label: t('sidebar.storefrontStudio') },
                    { to: '/settings/store-payment-offers', icon: BadgePercent, label: t('sidebar.paymentOffers') },
                ],
            },
            {
                id: 'affiliate',
                title: t('sidebar.affiliateSection'),
                icon: DollarSign,
                items: [
                    { to: '/affiliates/management', icon: Users, label: t('sidebar.affiliateManagement') },
                    { to: '/affiliates/quick-actions', icon: Zap, label: t('sidebar.quickActions') },
                    { to: '/merchants', icon: Store, label: t('sidebar.merchants') },
                    { to: '/platform/commissions', icon: DollarSign, label: t('sidebar.commissions') },
                    { to: '/affiliates/settings', icon: Cog, label: t('sidebar.affiliateSettings') },
                ],
            },
            {
                id: 'products',
                title: t('sidebar.productsSection'),
                icon: ShoppingBag,
                items: [
                    { to: '/products', icon: ShoppingBag, label: t('sidebar.products') },
                    { to: '/products/products-availability', icon: Table2, label: t('sidebar.productsAvailability'), requiredPermissions: ['products.view'] },
                ],
            },
            {
                id: 'procurement',
                title: t('sidebar.procurement'),
                icon: ClipboardList,
                items: [
                    { to: '/procurement/dashboard', icon: BarChart3, label: t('dashboard.title') },
                    { to: '/procurement/suppliers', icon: Users, label: t('sidebar.suppliers') },
                    { to: '/procurement/purchase-orders', icon: FileText, label: t('sidebar.purchaseOrders') },
                    { to: '/procurement/purchase-invoices', icon: ClipboardCheck, label: t('sidebar.purchaseInvoices') },
                    { to: '/procurement/supplier-payments', icon: Banknote, label: t('sidebar.supplierPayments') },
                ],
                hidden: !isAnyAppActive(['procurement-pro', 'store-pro']),
            },
            {
                id: 'cafe',
                title: 'الكافيه والمطعم',
                icon: Coffee,
                items: [
                    { to: '/cafe/recipes', icon: FlaskConical, label: 'معايير الرسيبي' },
                    { to: '/cafe/audits', icon: ClipboardCheck, label: 'جلسات الجرد' },
                    { to: '/cafe/modifiers', icon: Sliders, label: 'خيارات المشروبات' },
                    { to: '/cafe/waste', icon: Trash2, label: 'هدر وتالف البار' },
                    { to: '/pos', icon: CreditCard, label: 'نقطة البيع POS' },
                ],
                hidden: !isAnyAppActive(['cafe-restaurant-pro']),
            },
            {
                id: 'orders',
                title: t('sidebar.ordersSection'),
                icon: Archive,
                items: [
                    { to: '/orders', icon: Archive, label: t('sidebar.orders') },
                    { to: '/orders/manual', icon: SquarePen, label: t('sidebar.manualOrder'), hidden: !isAnyAppActive(['manual-orders-pro', 'store-pro']) },
                    { to: '/orders/analytics', icon: BarChart3, label: t('sidebar.orderAnalytics') },
                ],
            },
            {
                id: 'customers',
                title: t('sidebar.customers'),
                icon: Users,
                items: [
                    { to: '/customers', icon: Users, label: t('sidebar.customers') },
                    { to: '/leads', icon: UserPlus, label: t('sidebar.leads') },
                ],
            },
            {
                id: 'marketplace',
                title: t('sidebar.marketplace'),
                icon: Box,
                items: [
                    { to: '/marketplace', icon: Box, label: isEn ? 'App Marketplace' : 'متجر التطبيقات' },
                    { to: '/my-apps', icon: Grid3x3, label: t('sidebar.myApps') },
                    { to: '/marketplace/history', icon: History, label: isEn ? 'Apps Activity Log' : 'سجل التطبيقات' },
                    { to: '/marketplace/downloads', icon: Monitor, label: isEn ? 'Device & Mobile Apps' : 'تطبيقات الأجهزة والموبايل' },
                    { to: '/marketplace/bundles', icon: Gift, label: t('sidebar.browseBundles') },
                    { to: '/payments', icon: Wallet, label: t('sidebar.myPayments') },

                    { to: '/subscription/pricing', icon: ClipboardList, label: t('sidebar.appPricingSheet') },
                ],
            },
            {
                id: 'company',
                title: t('sidebar.companyManagementSection'),
                icon: Users,
                items: [
                    { to: '/settings/company', icon: Settings, label: t('sidebar.companySettings') },
                    { to: '/users', icon: Users, label: t('sidebar.usersManagement') },
                    { to: '/roles', icon: Key, label: t('sidebar.rolesManagement') },
                    { to: '/profile', icon: CircleUser, label: t('sidebar.myProfile') },
                ],
            },
        ];
    }

    const sidebarConfig = [
        // 1️⃣ الرئيسية
        {
            id: 'main',
            title: t('sidebar.mainSection'),
            icon: BarChart3,
            items: [
                { to: '/company-dashboard', icon: BarChart3, label: t('sidebar.dashboard') },
            ],
            hidden: user?.role === 'AFFILIATE'
        },
        
        // 1.5 الإنبوكس الموحد
        {
            id: 'unified-inbox-section',
            title: t('sidebar.unifiedInbox'),
            icon: MessageSquare,
            items: [
                { to: '/unified-inbox', icon: MessageSquare, label: t('sidebar.unifiedInbox') },
                { to: '/unified-inbox/connections', icon: Link, label: t('sidebar.platformConnections') },
            ],
            hidden: user?.role === 'AFFILIATE' || !isAppActive('unified-inbox')
        },

        // 1️⃣.6 العميل الذكي AI (للأدمن والمالك - عند تفعيل ai-chat-basic)
        ...((user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'OWNER') && isAppActive('ai-chat-basic') ? [{
            id: 'ai-operator',
            title: t('sidebar.aiOperatorSection'),
            icon: Sparkles,
            items: [
                { to: '/admin/agent-chat', icon: MessageSquare, label: isEn ? 'Agent Conversations' : 'محادثات الإيجنت' },
                { to: '/admin/agent-profiles', icon: Users, label: t('sidebar.agentProfiles') },
                { to: '/marketplace/agents', icon: Bot, label: isEn ? 'Agents Marketplace' : 'سوق الإيجنت' },
                { to: '/advertising/creative-studio', icon: Palette, label: isEn ? 'AI Creative Studio' : 'استوديو التصاميم الذكي' },
                { to: '/admin/ai-catalog', icon: ShoppingBag, label: t('sidebar.aiCatalog') },
                { to: '/admin/ai-knowledge-questions', icon: Lightbulb, label: t('sidebar.aiKnowledgeQuestions') },
                { to: '/admin/ai-hub?tab=sandbox', icon: FlaskConical, label: t('sidebar.aiAgentSandbox') },
                { to: '/admin/ai-hub?tab=train', icon: GraduationCap, label: t('sidebar.agentTraining') },
                { to: '/admin/ai-hub?tab=widget', icon: Globe, label: t('sidebar.webChatWidget') },
                { to: '/admin/faqs', icon: HelpCircle, label: t('sidebar.faqs') },
                { to: '/admin/policies', icon: ClipboardCheck, label: t('sidebar.policies') },
                { to: '/admin/ai-hub?tab=routing', icon: RefreshCcw, label: t('sidebar.channelRouting') },
                { to: '/admin/ai-hub?tab=ignoreList', icon: Ban, label: t('sidebar.aiIgnoreList') },
                { to: '/admin/ai-hub?tab=skills', icon: Palette, label: t('sidebar.aiAgentSkills'), hidden: !isFeatureEnabled('aiToolsEnabled') },
                { to: '/admin/ai-hub?tab=tools', icon: Wrench, label: t('sidebar.aiAgentTools'), hidden: !isFeatureEnabled('aiToolsEnabled') },
                { to: '/admin/ai-hub?tab=incidents', icon: ShieldAlert, label: isEn ? 'AI Tool Incidents' : 'رصد أعطال الأدوات', hidden: !isFeatureEnabled('aiToolsEnabled') },
            ]
        }] : []),

        // 2️⃣ فيسبوك
        {
          id: 'facebook',
          title: t('sidebar.facebookSection'),
          icon: FacebookIcon,
            items: [
                { to: '/facebook-inbox', icon: MessageSquare, label: t('sidebar.facebookInbox') },
                { to: '/unified-comments', icon: MessageSquare, label: t('sidebar.unifiedComments') },
                { to: '/employee-stats', icon: BarChart3, label: t('sidebar.employeeStats') },
                { to: '/sent-messages-stats', icon: BarChart3, label: t('sidebar.sentMessagesStats') },
                { to: '/settings/facebook-oauth', icon: MessageSquare, label: t('sidebar.facebookConnect') },
                { to: '/settings/facebook-blocked', icon: Ban, label: t('sidebar.facebookBlocked') },
                { to: '/settings/smart-replies', icon: MessageSquare, label: t('sidebar.smartReplies') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAnyAppActive(['facebook-pages-connect', 'crm-basic', 'facebook-ads-pro']),
        },

        // 2️⃣.1 إنستجرام
        {
          id: 'instagram',
          title: t('sidebar.instagramSection'),
          icon: InstagramIcon,
            items: [
                { to: '/instagram-inbox', icon: MessageSquare, label: t('sidebar.instagramInbox') },
                { to: '/settings/instagram', icon: Cog, label: t('sidebar.instagramSettings') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAnyAppActive(['instagram-business', 'crm-basic']),
        },

        // 2️⃣.5 واتساب
        {
          id: 'whatsapp',
          title: t('sidebar.whatsappSection'),
          icon: WhatsAppIcon,
            items: [
                { to: '/whatsapp', icon: MessageSquare, label: t('sidebar.whatsapp'), requiredPermissions: ['inbox.view'] },
                { to: '/whatsapp/notifications', icon: Bell, label: t('sidebar.whatsappNotifications'), requiredPermissions: ['orders.whatsapp-notifications.view'] },
                { to: '/whatsapp/templates', icon: FileText, label: t('sidebar.whatsappTemplates'), requiredPermissions: ['whatsapp.templates'] },
                { to: '/whatsapp/routing', icon: ArrowLeftRight, label: t('sidebar.whatsappRouting'), requiredPermissions: ['whatsapp.sessions'] },
                { to: '/whatsapp/settings', icon: Cog, label: t('sidebar.whatsappSettings'), requiredPermissions: ['whatsapp.settings'] },
                { to: '/whatsapp/cloud-connect', icon: Globe, label: t('sidebar.whatsappCloudConnect'), requiredPermissions: ['whatsapp.sessions'] },
                { to: '/whatsapp/employee-analytics', icon: BarChart3, label: t('sidebar.whatsappEmployeeAnalytics'), requiredPermissions: ['whatsapp.analytics.view'] },
                { to: '/whatsapp/conversation-analytics', icon: BarChart3, label: t('sidebar.whatsappConversationAnalytics'), requiredPermissions: ['whatsapp.analytics.view'] },
                { to: '/whatsapp/notification-logs', icon: FileBarChart, label: t('sidebar.whatsappNotificationLogs'), requiredPermissions: ['whatsapp.analytics.view'] },
                { to: '/whatsapp/meta-templates', icon: Globe, label: t('sidebar.whatsappMetaTemplates'), requiredPermissions: ['whatsapp.templates'] },
                { to: '/whatsapp/template-broadcast', icon: Megaphone, label: t('sidebar.whatsappTemplateBroadcast'), requiredPermissions: ['whatsapp.broadcast'] },
                { to: '/whatsapp/lead-followup', icon: Zap, label: t('sidebar.whatsappLeadFollowup'), requiredPermissions: ['inbox.view'] },
                { to: '/whatsapp/customer-journey', icon: RefreshCcw, label: t('sidebar.whatsappCustomerJourney'), requiredPermissions: ['inbox.view'] },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('whatsapp-business')
        },

        // ????? ????????? (?????)
        {
          id: 'messaging-automation',
          title: t('sidebar.messagingAutomationSection'),
          icon: Send,
            items: [
                { to: '/automation/bot-studio', icon: Send, label: t('sidebar.botStudio') },
            ],
            hidden: user?.role === 'AFFILIATE' || !isAnyAppActive(['bot-automation', 'whatsapp-business', 'facebook-pages-connect', 'crm-basic'])
        },

        // 2??.6 ????????
        {
          id: 'telegram',
          title: t('sidebar.telegramSection'),
          icon: TelegramIcon,
            items: [
                { to: '/telegram/pro', icon: Send, label: t('sidebar.telegramPro') },
                { to: '/telegram-userbot', icon: CircleUser, label: t('sidebar.telegramUserbot') },
                { to: '/telegram/auto-reply', icon: Zap, label: t('sidebar.autoReply') },
                { to: '/telegram/bulk-messages', icon: Megaphone, label: t('sidebar.bulkMessages') },
                { to: '/telegram/scheduler', icon: Clock, label: t('sidebar.scheduler') },
                { to: '/telegram/campaigns', icon: Megaphone, label: t('sidebar.campaigns') },
                { to: '/telegram/groups', icon: Users, label: t('sidebar.groups') },
                { to: '/settings/telegram', icon: Cog, label: t('sidebar.telegramSettings') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('telegram-business'),
        },

        // 3️⃣ إدارة الطلبات (قسم مستقل شامل)
        {
            id: 'orders',
            title: t('sidebar.ordersSection'),
            icon: Archive,
            items: [
                { to: '/orders', icon: Archive, label: t('sidebar.orders'), requiredPermissions: ['orders.view'] },
                { to: '/orders/workspace', icon: CircleUser, label: t('sidebar.agentWorkspace'), requiredPermissions: ['orders.workspace.view'], hidden: !isAppActive('agent-workspace') },
                { to: '/orders/preparation', icon: FlaskConical, label: t('sidebar.orderPreparation'), requiredPermissions: ['orders.preparation.view'] },
                { to: '/orders/automation', icon: Zap, label: t('sidebar.orderAutomation'), requiredPermissions: ['orders.automation.view'], hidden: !isAppActive('order-automation') },
                { to: '/orders/incomplete', icon: AlertTriangle, label: t('sidebar.incompleteOrders'), requiredPermissions: ['orders.incomplete.view'] },
                { to: '/pos', icon: CreditCard, label: t('sidebar.pos'), requiredPermissions: ['orders.pos.view'], hidden: !isAppActive('pos-pro') },
                { to: '/orders/invoices', icon: FileText, label: t('sidebar.orderInvoices'), requiredPermissions: ['orders.invoices.view'], hidden: !isAnyAppActive(['order-invoicing', 'store-pro']) },
                { to: '/settings/order-invoice', icon: Cog, label: t('sidebar.orderInvoiceSettings'), requiredPermissions: ['orders.invoices.view'], hidden: !isAnyAppActive(['order-invoicing', 'store-pro']) },
                { to: '/orders/manual', icon: SquarePen, label: t('sidebar.manualOrder'), requiredPermissions: ['orders.manual.create'], hidden: !isAnyAppActive(['manual-orders-pro', 'store-pro']) },
                { to: '/bulk-search', icon: ListOrdered, label: t('sidebar.bulkSearch'), requiredPermissions: ['orders.bulk-search.view'], hidden: !isAppActive('bulk-search') },
                { to: '/products/reviews', icon: Star, label: t('sidebar.productReviews'), requiredPermissions: ['orders.product-reviews.view'], hidden: !isAnyAppActive(['ugc-reviews-pro', 'store-pro']) },
                { to: '/settings/orders', icon: Cog, label: t('sidebar.ordersSettings'), requiredPermissions: ['orders.settings.view'] },
                { to: '/settings/customer-blocks', icon: ShieldAlert, label: t('sidebar.customerBlockSettings'), requiredPermissions: ['orders.customer-blocks.view'], hidden: !isAppActive('customer-blocks') },
                { to: '/orders/shipments', icon: Truck, label: isEn ? 'Shipments & Delivery Logs' : 'سجلات الشحنات والتوصيل', requiredPermissions: ['orders.turbo.view', 'orders.shipping.view'], hidden: !isAnyAppActive(['order-shipping-turbo', 'order-shipping-hub', 'order-shipping-bosta', 'order-shipping-qpexpress', 'commerce-advanced', ...STORE_APP_SLUGS]) },
                { to: '/tickets', icon: Ticket, label: isEn ? 'Shipping Tickets & Chat' : 'تذاكر ودعم الشحن (Turbo)', requiredPermissions: ['orders.turbo.view', 'orders.shipping.view'], hidden: !isAnyAppActive(['order-shipping-turbo', 'order-shipping-hub', 'order-shipping-bosta', 'order-shipping-qpexpress', 'commerce-advanced', ...STORE_APP_SLUGS]) },
                { to: '/shipping-companies', icon: Building, label: t('sidebar.shippingCompanies'), requiredPermissions: ['orders.shipping.view'], hidden: !isAnyAppActive(['order-shipping-turbo', 'order-shipping-hub', 'order-shipping-bosta', 'order-shipping-qpexpress', 'commerce-advanced', ...STORE_APP_SLUGS]) },
                { to: '/shipping-settlement', icon: Banknote, label: t('sidebar.shippingSettlement'), requiredPermissions: ['orders.shipping.view'], hidden: !isAnyAppActive(['order-shipping-turbo', 'order-shipping-hub', 'order-shipping-bosta', 'order-shipping-qpexpress', 'commerce-advanced', ...STORE_APP_SLUGS]) },
                { to: '/returns', icon: CheckCircle2, label: t('sidebar.returnReviews'), requiredPermissions: ['orders.returns.view'], hidden: !isAnyAppActive(['returns-settings', 'store-pro']) },
                { to: '/orders/bulk', icon: ListOrdered, label: t('sidebar.bulkOrders'), requiredPermissions: ['bulkOrders.view', 'orders.bulk.create'], hidden: !isAppActive('bulk-orders') },
                { to: '/orders/bulk-status', icon: ArrowLeftRight, label: t('sidebar.bulkStatusUpdate'), requiredPermissions: ['orders.status.change'], hidden: !isAppActive('bulk-orders') },
                { to: '/orders/activity-log', icon: Clock, label: isEn ? 'Orders Activity Log' : 'سجل نشاط الطلبات', requiredPermissions: ['orders.view'] },
                { to: '/orders/quick-status', icon: RefreshCcw, label: t('sidebar.quickStatusChange'), requiredPermissions: ['orders.quickstatus.view'], hidden: !isAppActive('quick-status') },
                { to: '/orders/analytics', icon: BarChart3, label: t('sidebar.orderAnalytics'), requiredPermissions: ['orders.stats.view'], hidden: !isAnyAppActive(['analytics-advanced', 'analytics-basic', 'orders-analytics']) },
                { to: '/orders/status-summary', icon: FileBarChart, label: t('sidebar.orderStatusSummary'), requiredPermissions: ['orders.status-summary.view'], hidden: !isAppActive('status-summary') },
                { to: '/returns/settings', icon: Cog, label: t('sidebar.returnSettings'), requiredPermissions: ['orders.return-settings.view'], hidden: !isAppActive('returns-settings') },
                { to: '/platform-integrations', icon: Zap, label: t('sidebar.platformIntegrations'), requiredPermissions: ['orders.integrations.view'], hidden: !isAnyAppActive(['woocommerce-pro', 'webhooks-pro']) },
                { to: '/settings/order-workflow', icon: ArrowLeftRight, label: t('sidebar.orderWorkflow'), requiredPermissions: ['orders.workflow.view'], hidden: !isAppActive('order-workflow') },
                { to: '/settings/cod-deposit', icon: Banknote, label: t('sidebar.codDeposit'), requiredPermissions: ['orders.settings.view'], hidden: !isAppActive('cod-deposit') },
                { to: '/orders/status-templates', icon: FileText, label: t('sidebar.orderStatusTemplates'), requiredPermissions: ['orders.whatsapp-notifications.view'], hidden: !isAppActive('whatsapp-business') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || (!isStoreActive() && !isAnyAppActive(['pos-pro', 'order-core', 'cafe-restaurant-pro']))
        },

        // 3️⃣.2 أسطول المناديب والتوصيل الداخلي (قسم مستقل شامل معزول تماماً)
        {
            id: 'internal-courier-fleet',
            title: isEn ? 'Internal Courier Fleet' : 'أسطول المناديب والتوصيل الداخلي',
            icon: Truck,
            items: [
                { to: '/shipping/couriers', icon: Truck, label: isEn ? 'Courier Fleet Management' : 'إدارة أسطول المناديب', requiredPermissions: ['orders.shipping.view', 'courier.view'] },
                { to: '/shipping/delivery-runs', icon: MapPin, label: isEn ? 'Delivery Runs & Manifests' : 'رحلات التوزيع والمانيفست', requiredPermissions: ['orders.shipping.view', 'courier.runs.view'] },
                { to: '/shipping/courier-settlements', icon: Banknote, label: isEn ? 'Courier Settlements & Remittance' : 'تسويات وتوريد المناديب', requiredPermissions: ['orders.shipping.view', 'courier.settlement.view'] },
                { to: '/marketplace/apps/internal-courier-fleet/settings', icon: Cog, label: isEn ? 'Fleet Settings' : 'إعدادات أسطول التوصيل', requiredPermissions: ['orders.shipping.view', 'courier.settings.view'] },
            ],
            // 🔒 إخفاء القسم بالكامل إذا كان التطبيق غير مفعل في الماركت بليس
            hidden: user?.role === 'AFFILIATE' || !isAppActive('internal-courier-fleet')
        },

        // 3️⃣.5 إحصائيات الطلبات
        {
            id: 'orders-analytics',
            title: t('sidebar.orderAnalytics'),
            icon: BarChart3,
            items: [
                { to: '/analytics/orders', icon: BarChart3, label: t('dashboard.overview') },
                { to: '/analytics/store', icon: LineChart, label: isEn ? 'Store & Funnel Analytics' : 'تحليلات المتجر ومسار التحويل' },
                { to: '/analytics/orders/orders', icon: Archive, label: t('sidebar.orderAnalytics') },
                { to: '/analytics/orders/revenue', icon: Banknote, label: t('sidebar.revenueAnalytics') },
                { to: '/analytics/orders/products', icon: ShoppingBag, label: t('sidebar.productAnalytics') },
                { to: '/analytics/orders/variations', icon: Tag, label: t('sidebar.variationAnalytics') },
                { to: '/analytics/orders/categories', icon: Tag, label: t('sidebar.categoryAnalytics') },
                { to: '/analytics/orders/coupons', icon: Ticket, label: t('sidebar.couponAnalytics') },
                { to: '/analytics/orders/stock', icon: ClipboardList, label: t('sidebar.stockAnalytics') },
                { to: '/analytics/orders/customers', icon: Users, label: t('sidebar.customerAnalytics') },
                { to: '/analytics/orders/payments', icon: CreditCard, label: t('sidebar.paymentMethods') },
                { to: '/analytics/orders/campaign-attribution', icon: Megaphone, label: t('sidebar.campaignAttribution'), hidden: !isAppActive('campaign-attribution') },
                { to: '/analytics/orders/profit', icon: DollarSign, label: t('sidebar.profitAnalytics') },
                { to: '/analytics/orders/cod-performance', icon: Truck, label: t('sidebar.codPerformance') },
                { to: '/analytics/orders/today-ops', icon: Sparkles, label: t('sidebar.todayOps') },
                { to: '/analytics/orders/cancellations', icon: XCircle, label: t('sidebar.cancellationAnalytics') },
                { to: '/analytics/orders/delivery-rate', icon: Truck, label: t('sidebar.deliveryRate') },
                { to: '/analytics/orders/fulfillment', icon: PackageCheck, label: t('sidebar.productFulfillment') },
                { to: '/analytics/orders/delivery-returns', icon: Undo2, label: t('sidebar.deliveryReturnsAnalytics') },
                { to: '/analytics/orders/product-delivery-returns', icon: Package, label: isEn ? 'Product Delivery & Collection' : t('sidebar.productDeliveryReturns', 'تسليم وتحصيل المنتجات (أسباب المرتجع)') },
                { to: '/analytics/orders/regions', icon: MapPin, label: t('sidebar.regionAnalytics') },
                { to: '/analytics/orders/returns', icon: Undo2, label: t('sidebar.returnAnalytics') },
                { to: '/analytics/orders/returns-reasons', icon: ListChecks, label: t('sidebar.returnReasonsAnalytics') },
                { to: '/analytics/store', icon: Filter, label: t('sidebar.conversionFunnel'), hidden: true },
                { to: '/analytics/store', icon: BarChart3, label: t('sidebar.conversionRate'), hidden: true },
                { to: '/analytics/orders/team-performance', icon: Users, label: t('sidebar.teamPerformance') },
                { to: '/analytics/orders/abandoned-cart', icon: ShoppingCart, label: t('sidebar.abandonedCart') },
                { to: '/analytics/orders/advanced-plan', icon: ClipboardCheck, label: t('sidebar.developmentPlan') },
                { to: '/reports/profit-loss', icon: DollarSign, label: t('sidebar.profitLoss') },
                { to: '/analytics/orders/status-analysis', icon: BarChart3, label: t('sidebar.statusAnalysis') },
                { to: '/analytics/orders/status-movement', icon: GitBranch, label: t('sidebar.orderMovement') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAnyAppActive(['analytics-advanced', 'analytics-basic', 'orders-analytics'])
        },

        // 4️⃣ المنتجات
        {
            id: 'products',
            title: t('sidebar.productsSection'),
            icon: ShoppingBag,
            items: [
                { to: '/products', icon: ShoppingBag, label: t('sidebar.products') },
                { to: '/products/products-availability', icon: Table2, label: t('sidebar.productsAvailability'), requiredPermissions: ['products.view'] },
                { to: '/categories', icon: Tag, label: t('sidebar.categories') },
                {
                    to: '/inventory/studio',
                    icon: Sparkles,
                    label: isEn ? 'AI Product & Inventory Studio' : 'مركز المنتجات والمخزون الذكي (AI Studio)',
                },
            ],
            hidden: user?.role === 'AFFILIATE' || (!isStoreActive() && !isAnyAppActive(['pos-pro', 'inventory-pro', 'cafe-restaurant-pro']))
        },

        // 4️⃣.0 المدونة والـ SEO (Blog & Affiliate) — mens-grooming-pro compatible
        {
            id: 'blog',
            title: t('sidebar.blogSection'),
            icon: FileText,
            items: [
                { to: '/articles', icon: FileText, label: t('sidebar.articles') },
                { to: '/articles/new', icon: SquarePen, label: t('sidebar.newArticle') },
                { to: '/shop', icon: Store, label: t('sidebar.visitStore'), external: true },
            ],
            hidden: user?.role === 'AFFILIATE' || !isAppActive('blog-pro')
        },

        // 4️⃣.1 تصميم وتنسيق المتجر (Storefront Design)
        {
            id: 'storefront-design',
            title: t('sidebar.storefrontSection'),
            icon: Palette,
            items: [
                {
                    to: '/shop',
                    icon: Store,
                    label: t('sidebar.visitStore'),
                    external: true
                },
                { to: '/settings/store', icon: Store, label: t('sidebar.storeSettings') },
                {
                    to: '/settings/storefront/editor',
                    icon: Palette,
                    label: t('sidebar.storefrontDesign')
                },
                { to: '/settings/custom-domain', icon: Link, label: t('sidebar.customDomain') },
                { to: '/settings/store/tools', icon: Sparkles, label: t('sidebar.conversionTools') },
                { to: '/settings/upsell', icon: TrendingUp, label: t('sidebar.upsellManagement') },
                { to: '/settings/post-purchase-offer', icon: Zap, label: isEn ? 'Post-Purchase Offer' : 'العرض بعد الطلب (Upsell)' },
                { to: '/admin/faqs', icon: HelpCircle, label: t('sidebar.faqs') },
                { to: '/admin/policies', icon: ClipboardCheck, label: t('sidebar.policies') },
                { to: '/settings/clarity', icon: BarChart3, label: t('sidebar.microsoftClarity') },
                { to: '/offers-review', icon: ClipboardList, label: t('sidebar.offersReview') },
                { to: '/coupons', icon: Ticket, label: t('sidebar.coupons'), hidden: !isAnyAppActive(['coupons-pro', 'store-pro']) },
                {
                    to: '/analytics/orders/coupons',
                    icon: Ticket,
                    label: t('sidebar.couponAnalytics'),
                    hidden: !isAppActive('analytics-advanced')
                },
                {
                    to: '/analytics/store',
                    icon: LineChart,
                    label: isEn ? 'Store & Funnel Analytics' : 'تحليلات المتجر ومسار التحويل',
                    hidden: !isAppActive('analytics-advanced')
                },
                {
                    to: '/analytics/store',
                    icon: Filter,
                    label: t('sidebar.conversionFunnel'),
                    hidden: true
                },
                {
                    to: '/analytics/orders/abandoned-cart',
                    icon: ShoppingCart,
                    label: t('sidebar.abandonedCart'),
                    hidden: !isAppActive('analytics-advanced')
                },
                { to: '/settings/store-pages', icon: FileText, label: t('sidebar.storePages') },
                { to: '/settings/store-payment-offers', icon: BadgePercent, label: t('sidebar.paymentOffers') },
            ],
            // 🔒 متاح للمالك والأدمن فقط لتغيير تصميم المتجر
            hidden: user?.role === 'AFFILIATE' || (!isStoreActive() && !isAppActive('conversion-suite'))
        },

        // 4️⃣.2 العملاء
        {
            id: 'customers',
            title: t('sidebar.customers'),
            icon: Users,
            items: [
                { to: '/customers', icon: Users, label: t('sidebar.customers') },
                { to: '/whatsapp/customer-journey', icon: RefreshCcw, label: isEn ? 'Customer Journeys & Re-order' : (t('sidebar.whatsappCustomerJourney') || 'رحلات زيادة الطلب والتكرار') },
                { to: '/customers/points-center', icon: Trophy, label: isEn ? 'Loyalty Members & Points' : (t('sidebar.customerPointsCenter') || 'أعضاء ونقاط الولاء') },
                { to: '/customers/segments', icon: Filter, label: isEn ? 'Segments & Customer Lists' : (t('sidebar.customerSegments') || 'الشرائح وقوائم العملاء') },
                { to: '/customers/customer-notifications', icon: Bell, label: isEn ? 'Customer Notifications & Campaigns' : (t('sidebar.customerNotifications') || 'إشعارات وحملات العملاء') },
                { to: '/customers/settings', icon: Settings2, label: isEn ? 'Loyalty & Discount Settings' : (t('sidebar.customerLoyaltySettings') || 'إعدادات الولاء والخصم') },
                ...(user?.role === 'CUSTOMER' ? [{ to: '/wallet', icon: Wallet, label: t('sidebar.wallet') }] : []),
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان CRM غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAnyAppActive(['crm-basic', 'crm-lite'])
        },

        // 4️⃣.3 المشتريات
        {
            id: 'procurement',
            title: t('sidebar.procurement'),
            icon: ClipboardList,
            items: [
                { to: '/procurement/dashboard', icon: BarChart3, label: t('dashboard.title') },
                { to: '/procurement/suppliers', icon: Users, label: t('sidebar.suppliers') },
                { to: '/procurement/purchase-orders', icon: FileText, label: t('sidebar.purchaseOrders') },
                { to: '/procurement/purchase-invoices', icon: ClipboardCheck, label: t('sidebar.purchaseInvoices') },
                { to: '/procurement/supplier-payments', icon: Banknote, label: t('sidebar.supplierPayments') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAnyAppActive(['procurement-pro'])
        },

        // 4️⃣.34 الكافيه والمطعم
        {
            id: 'cafe',
            title: isEn ? 'Cafe & Restaurant' : 'الكافيه والمطعم',
            icon: Coffee,
            items: [
                { to: '/cafe/recipes', icon: FlaskConical, label: isEn ? 'Recipes (BOM)' : 'معايير الرسيبي' },
                { to: '/cafe/audits', icon: ClipboardCheck, label: isEn ? 'Stock Audits' : 'جلسات الجرد' },
                { to: '/cafe/modifiers', icon: Sliders, label: isEn ? 'Drink Modifiers' : 'خيارات المشروبات' },
                { to: '/cafe/waste', icon: Trash2, label: isEn ? 'Operational Waste' : 'هدر وتالف البار' },
                { to: '/pos', icon: CreditCard, label: isEn ? 'Cloud POS' : 'نقطة البيع POS' },
            ],
            hidden: user?.role === 'AFFILIATE' || !isAnyAppActive(['cafe-restaurant-pro'])
        },

        // 4️⃣.35 الخزينة والنفقات ورأس المال
        {
            id: 'treasury-expenses',
            title: isEn ? 'Treasury & Expenses' : 'الخزينة والنفقات ورأس المال',
            icon: Landmark,
            items: [
                { to: '/treasury-expenses?tab=expenses', icon: Receipt, label: isEn ? 'Expenses & Outflows' : 'النفقات والمصروفات' },
                { to: '/treasury-expenses?tab=treasury', icon: Landmark, label: isEn ? 'Treasury & Capital' : 'الخزنة ورأس المال' },
            ],
            hidden: user?.role === 'AFFILIATE'
        },

        // 4️⃣.4 البيع بالجملة
        {
            id: 'wholesale',
            title: t('sidebar.wholesale'),
            icon: Tag,
            items: [
                { to: '/wholesale/dashboard', icon: BarChart3, label: t('dashboard.title') },
                { to: '/wholesale/price-lists', icon: FileText, label: t('sidebar.priceLists') },
                { to: '/wholesale/customers', icon: Users, label: t('sidebar.wholesaleCustomers') },
                { to: '/wholesale/statements', icon: ClipboardCheck, label: t('sidebar.customerStatements') },
                { to: '/wholesale/debts', icon: AlertTriangle, label: t('sidebar.debtTracking') },
            ],
            hidden: user?.role === 'AFFILIATE' || !isAnyAppActive(['wholesale-pro'])
        },

        // 4️⃣.5 الافليت والدروب شيبنج
        {
            id: 'affiliate',
            title: t('sidebar.affiliateSection'),
            icon: DollarSign,
            hidden: !isAppActive('affiliate-program'),
            items: [
                ...(user?.role === 'OWNER' || user?.role === 'COMPANY_ADMIN' || user?.role === 'SUPER_ADMIN' ? [
                    { to: '/affiliates/management', icon: Users, label: t('sidebar.affiliateManagement') },
                    { to: '/affiliates/quick-actions', icon: Zap, label: t('sidebar.quickActions') },
                    { to: '/merchants', icon: Store, label: t('sidebar.merchants') },
                    { to: '/platform/commissions', icon: DollarSign, label: t('sidebar.commissions') },
                    { to: '/affiliates/settings', icon: Cog, label: t('sidebar.affiliateSettings') },
                    { to: '/affiliates/products/visibility', icon: Globe, label: t('sidebar.affiliateProductVisibility') },
                    { to: '/company-affiliates', icon: Store, label: t('sidebar.relatedCompanies') },
                ] : []),
                ...(user?.role === 'AFFILIATE' ? [
                    { to: '/affiliates/dashboard', icon: BarChart3, label: t('dashboard.title') },
                    { to: '/affiliates/orders', icon: Archive, label: t('sidebar.myOrders') },
                    { to: '/affiliates/orders/create', icon: SquarePen, label: t('sidebar.affiliateCreateOrder') },
                    { to: '/affiliates/commission', icon: Banknote, label: t('sidebar.commissions') },
                ] : [])
            ]
        },

        // 4️⃣.6 أمازون أفليت (Amazon Associates)
        {
            id: 'amazon-affiliate',
            title: t('sidebar.amazonAffiliateSection'),
            icon: Globe,
            hidden: !isAppActive('amazon-affiliate-pro'),
            items: [
                { to: '/amazon-affiliate/settings', icon: Cog, label: t('sidebar.amazonAffiliateSettings') },
                { to: '/amazon-affiliate/import', icon: Download, label: t('sidebar.amazonAffiliateImport') },
                { to: '/amazon-affiliate/products', icon: Package, label: t('sidebar.amazonAffiliateProducts') },
            ]
        },

        // 4️⃣.7 برنامج شركاء المنصة (Platform Partner Program)
        {
            id: 'platform-partner',
            title: t('sidebar.partnerProgram'),
            icon: UserPlus,
            items: [
                { to: '/partner-dashboard', icon: Users, label: t('sidebar.partnerDashboard') },
            ],
            hidden: !isAppActive('partner-program'),
        },

        // 4️⃣.7 المخزون
        {
            id: 'inventory',
            title: t('sidebar.inventorySection'),
            icon: ClipboardList,
            items: [
                { to: '/inventory', icon: Archive, label: t('sidebar.inventory') },
                { to: '/inventory/movements', icon: ArrowLeftRight, label: t('sidebar.stockMovements') },
                { to: '/inventory/warehouses', icon: Building, label: t('sidebar.warehouses'), hidden: !isAnyAppActive(['inventory-pro', 'multi-warehouse-pro', 'store-pro']) },
                { to: '/inventory/audits', icon: ClipboardList, label: t('sidebar.inventoryAudits') },
                { to: '/inventory/reorder-points', icon: AlertTriangle, label: t('sidebar.reorderPoints') },
                { to: '/inventory/analytics', icon: BarChart3, label: t('sidebar.orderAnalytics') },
                { to: '/inventory/reports', icon: BarChart3, label: t('sidebar.inventoryReports') },
                {
                    to: '/inventory/studio',
                    icon: Sparkles,
                    label: isEn ? 'AI Inventory & Pricing Studio' : 'مركز المخزون والتسعير الذكي (AI Studio)',
                },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAnyAppActive(['inventory-pro', 'multi-warehouse-pro', ...STORE_APP_SLUGS])
        },

        // 4️⃣.9️⃣ إدارة الوكالة (Agency OS)
        {
            id: 'marketing-agency',
            title: isEn ? 'Marketing Agency (Agency OS)' : t('sidebar.marketingAgencySection', { defaultValue: 'إدارة الوكالة' }),
            icon: Briefcase,
            items: [
                { to: '/agency', icon: BarChart3, label: isEn ? 'Agency Dashboard' : t('sidebar.agencyOverview', { defaultValue: 'لوحة التحكم' }) },
                { to: '/agency?tab=clients', icon: Users, label: isEn ? 'Clients & Pricing' : t('sidebar.agencyClients', { defaultValue: 'العملاء والأسعار' }) },
                { to: '/agency?tab=invoices', icon: Receipt, label: isEn ? 'Invoices & Profit' : t('sidebar.agencyInvoices', { defaultValue: 'الفواتير والأرباح' }) },
                { to: '/agency?tab=approvals', icon: ClipboardCheck, label: isEn ? 'Content Approvals' : t('sidebar.agencyApprovals', { defaultValue: 'موافقات المحتوى' }) },
                { to: '/agency?tab=suite', icon: Briefcase, label: isEn ? 'Integrated Suite' : t('sidebar.agencySuite', { defaultValue: 'الأدوات المتكاملة' }) },
            ],
            hidden: user?.role === 'AFFILIATE' || !isAppActive('marketing-agency-pro'),
        },

        // 5️⃣ التسويق والإعلانات
        {
            id: 'marketing',
            title: isEn ? 'Marketing & Advertising' : t('sidebar.marketingSection'),
            icon: Megaphone,
            items: [
                // 1. مركز التسويق الذكي (AI Studio)
                {
                    to: '/advertising/marketing-studio',
                    icon: Sparkles,
                    label: isEn ? 'AI Marketing Studio' : 'مركز التسويق الذكي (AI Studio)',
                },
                // 1.5 استوديو التصاميم الذكي (AI Creative Studio)
                {
                    to: '/advertising/creative-studio',
                    icon: Palette,
                    label: isEn ? 'AI Creative Studio' : 'استوديو التصاميم الإعلانية (AI)',
                },
                // 2. إعلانات فيسبوك (Meta Ads Cockpit)
                {
                    to: '/advertising/facebook-ads',
                    icon: Megaphone,
                    label: isEn ? 'Facebook Ads (Meta Ads)' : (t('sidebar.facebookAds') || 'إعلانات فيسبوك (Meta Ads)'),
                },
                // 3. إنشاء إعلان جديد
                {
                    to: '/advertising/facebook-ads/create-ad',
                    icon: Plus,
                    label: isEn ? 'Create Ad (Wizard)' : 'إنشاء إعلان جديد',
                },
                // 4. الحملات الإعلانية
                {
                    to: '/advertising/facebook-ads/campaigns',
                    icon: BarChart3,
                    label: isEn ? 'Campaigns List' : 'قائمة الحملات الإعلانية',
                },
                // 5. ربط إعلانات Meta (مفرد وغير مكرر)
                {
                    to: '/advertising/facebook-ads/connection',
                    icon: PlugZap,
                    label: isEn ? 'Meta Ads Connection' : (t('sidebar.metaAdsConnection') || 'ربط إعلانات Meta'),
                },
                // 6. قواعد الأتمتة الإعلانية
                {
                    to: '/advertising/facebook-ads/automation-rules',
                    icon: Zap,
                    label: isEn ? 'Automation Rules' : 'قواعد الأتمتة الإعلانية',
                },
                // 7. تنبيهات الرصيد WhatsApp
                {
                    to: '/advertising/facebook-ads/budget-alerts',
                    icon: BellRing,
                    label: isEn ? 'WhatsApp Budget Alerts' : 'تنبيهات الرصيد WhatsApp',
                },
                // 8. تقارير الأرباح والقرارات
                {
                    to: '/advertising/facebook-ads/decision-reports',
                    icon: FileBarChart,
                    label: isEn ? 'Decision Reports & Profit' : 'تقارير الأرباح والقرارات',
                },
                // 9. التوليف الإبداعي الديناميكي (DCO)
                {
                    to: '/advertising/facebook-ads/dco',
                    icon: Palette,
                    label: isEn ? 'Dynamic Creative (DCO)' : 'التوليف الإبداعي الديناميكي (DCO)',
                },
                // 10. إعلانات Advantage+ والتسوق
                {
                    to: '/advertising/facebook-ads/advantage-plus',
                    icon: Rocket,
                    label: isEn ? 'Advantage+ Shopping' : 'إعلانات Advantage+ والتسوق',
                },
                // 11. نماذج العملاء الفورية (Lead Forms)
                {
                    to: '/advertising/facebook-ads/lead-forms',
                    icon: FileText,
                    label: isEn ? 'Instant Lead Forms' : 'نماذج العملاء الفورية (Lead Forms)',
                },
                // 12. إعدادات الإسناد ونوافذ التحويل
                {
                    to: '/advertising/facebook-ads/attribution',
                    icon: CheckCircle2,
                    label: isEn ? 'Attribution Settings' : 'إعدادات الإسناد ونوافذ التحويل',
                },
                // 13. الجماهير الإعلانية المخصصة والشبيهة
                {
                    to: '/advertising/facebook-ads/audiences',
                    icon: Users,
                    label: isEn ? 'Audiences' : 'الجماهير المخصصة والشبيهة',
                },
                // 14. الجماهير المحفوظة (Saved Audiences)
                {
                    to: '/advertising/facebook-ads/saved-audiences',
                    icon: Users,
                    label: isEn ? 'Saved Audiences' : 'الجماهير المحفوظة (Saved Audiences)',
                },
                // 15. كتالوجات المنتجات (Catalog)
                {
                    to: '/advertising/facebook-ads/catalogs',
                    icon: ShoppingBag,
                    label: isEn ? 'Product Catalogs' : 'كتالوجات المنتجات (Catalog)',
                },
                // 16. معاينة الإعلانات (Ad Preview)
                {
                    to: '/advertising/facebook-ads/ad-preview',
                    icon: Eye,
                    label: isEn ? 'Ad Preview & QA' : 'معاينة الإعلانات (Ad Preview)',
                },
                // 17. مكتبة الكرياتيف والبحث
                {
                    to: '/advertising/facebook-ads/ad-library',
                    icon: FolderOpen,
                    label: isEn ? 'Ad Library & Research' : 'مكتبة الكرياتيف والبحث',
                },
                // 18. اختبارات A/B Tests
                {
                    to: '/advertising/facebook-ads/tests',
                    icon: FlaskConical,
                    label: isEn ? 'A/B Tests' : 'اختبارات A/B Tests',
                },
                // 19. الأداء الجغرافي والمحافظات
                {
                    to: '/advertising/facebook-ads/geo',
                    icon: Globe,
                    label: isEn ? 'Geographic Performance' : 'الأداء الجغرافي والمحافظات',
                },
                // 20. البيكسل والتتبع (Pixel & CAPI)
                {
                    to: '/advertising/facebook-pixel',
                    icon: Target,
                    label: isEn ? 'Facebook Pixel & CAPI' : t('sidebar.facebookPixel'),
                },
                // 21. Google Tag Manager
                {
                    to: '/advertising/google-tag-manager',
                    icon: Tag,
                    label: isEn ? 'Google Tag Manager' : t('sidebar.googleTagManager'),
                },
                // 22. Google Analytics & Ads
                {
                    to: '/advertising/google-analytics',
                    icon: BarChart3,
                    label: isEn ? 'Google Analytics & Ads' : t('sidebar.googleAnalytics'),
                },
                // 23. صفحات هبوط المنتجات
                {
                    to: '/advertising/product-landing-pages',
                    icon: Monitor,
                    label: isEn ? 'Product Landing Pages' : (t('sidebar.productLandingPages') || 'صفحات هبوط المنتجات'),
                },
                // 24. مسار تحويل سريع (Quick Funnel)
                {
                    to: '/advertising/funnel-wizard',
                    icon: Filter,
                    label: isEn ? 'Quick Funnel' : (t('sidebar.quickFunnel') || 'مسار تحويل سريع'),
                },
                // 25. نشر حملات البث (Broadcast)
                {
                    to: '/broadcast',
                    icon: Send,
                    label: isEn ? 'Broadcast' : t('sidebar.broadcast'),
                    hidden: !isAppActive('crm-basic'),
                },
                // 26. نشر منشورات Facebook
                {
                    to: '/facebook/create-post',
                    icon: SquarePen,
                    label: isEn ? 'Facebook Post' : (t('sidebar.facebookPost') || 'نشر منشورات Facebook'),
                },
                // 27. نشر TikTok Publish
                {
                    to: '/tiktok/publish',
                    icon: SquarePen,
                    label: isEn ? 'TikTok Publish' : t('sidebar.tiktokPublish'),
                    hidden: !isAppActive('tiktok-integrations'),
                },
                // 28. متجر TikTok Shop
                {
                    to: '/tiktok/shop',
                    icon: Store,
                    label: isEn ? 'TikTok Shop' : t('sidebar.tiktokShop'),
                    hidden: !isAppActive('tiktok-integrations'),
                },
                // 29. صندوق وارد TikTok Inbox
                {
                    to: '/tiktok-inbox',
                    icon: Inbox,
                    label: isEn ? 'TikTok Inbox' : t('sidebar.tiktokInbox'),
                    hidden: !isAppActive('tiktok-integrations'),
                },
                // 30. إعدادات TikTok Settings
                {
                    to: '/tiktok/settings',
                    icon: Settings,
                    label: isEn ? 'TikTok Settings' : t('sidebar.tiktokSettings'),
                    hidden: !isAppActive('tiktok-integrations'),
                },
                // 31. محرك الربحية الشامل (Profitability Engine)
                {
                    to: '/tools/profitability-engine',
                    icon: Calculator,
                    label: isEn ? 'Profitability Engine' : t('sidebar.profitabilityEngine'),
                },
                // 32. نقطة التعادل للمشروع
                {
                    to: '/tools/break-even',
                    icon: TrendingUp,
                    label: isEn ? 'Project Break-Even' : t('sidebar.projectBreakEven'),
                },
                // 33. نقطة التعادل للمنتج
                {
                    to: '/tools/product-break-even',
                    icon: Package,
                    label: isEn ? 'Product Break-Even' : t('sidebar.productBreakEven'),
                },
                // 34. استراتيجية التسعير
                {
                    to: '/tools/pricing-strategy',
                    icon: DollarSign,
                    label: isEn ? 'Pricing Strategy' : t('sidebar.pricingStrategy'),
                },
                // 35. حاسبة الحملات
                {
                    to: '/campaign-calculator',
                    icon: Calculator,
                    label: isEn ? 'Campaign Calculator' : t('sidebar.campaignCalculator'),
                },
                // 36. مخطط ميزانية الإعلانات
                {
                    to: '/tools/ad-budget-planner',
                    icon: Wallet,
                    label: isEn ? 'Ad Budget Planner' : t('sidebar.adBudgetPlanner'),
                },
                // 37. تأثير الخصومات
                {
                    to: '/tools/discount-impact',
                    icon: Percent,
                    label: isEn ? 'Discount Impact' : t('sidebar.discountImpact'),
                },
                // 38. مُحسّن تكلفة الشحن
                {
                    to: '/tools/shipping-optimizer',
                    icon: Truck,
                    label: isEn ? 'Shipping Optimizer' : t('sidebar.shippingOptimizer'),
                },
                // 39. الأرباح والخسائر الشهرية
                {
                    to: '/tools/monthly-pnl',
                    icon: Receipt,
                    label: isEn ? 'Monthly P&L' : t('sidebar.monthlyPnL'),
                },
                // 40. حساب القيمة الدائمة للعميل
                {
                    to: '/tools/clv-calculator',
                    icon: Users,
                    label: isEn ? 'CLV Calculator' : t('sidebar.clvCalculator'),
                },
                // 41. مخطط البيع الإضافي
                {
                    to: '/tools/upsell-planner',
                    icon: BadgePercent,
                    label: isEn ? 'Upsell Planner' : t('sidebar.upsellPlanner'),
                },
                // 42. حاسبة معدل المرتجعات
                {
                    to: '/tools/refund-rate',
                    icon: Undo2,
                    label: isEn ? 'Refund Rate Calculator' : t('sidebar.refundRateCalculator'),
                },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAnyAppActive(['facebook-ads-pro', 'crm-basic', 'tiktok-integrations'])
        },

        // 5️⃣.5 تحليل المنافسين
        {
            id: 'competitors',
            title: t('sidebar.competitors'),
            icon: TrendingUp,
            items: [
                { to: '/competitors', icon: TrendingUp, label: t('sidebar.competitors') },
                { to: '/competitors/gap-analysis', icon: LineChart, label: t('sidebar.gapAnalysis') },
                { to: '/competitors/reports', icon: ClipboardList, label: t('sidebar.competitorReports') },
                { to: '/competitors/settings', icon: Settings, label: t('sidebar.competitorSettings') },
            ],
            hidden: user?.role === 'AFFILIATE' || !isAppActive('competitor-analysis')
        },

        // 6️⃣ حسابي (للموظف)
        {
            id: 'my-account',
            title: t('sidebar.myAccountSection'),
            icon: CircleUser,
            hidden: !isAnyAppActive(['hr-basic', 'hr-core', 'hr-attendance-pro', 'hr-payroll', 'hr-assets', 'hr-recruitment']),
            items: [
                { to: '/my-dashboard', icon: BarChart3, label: t('sidebar.myDashboard'), hidden: !isAnyAppActive(['hr-basic', 'hr-core', 'hr-attendance-pro']) },
                { to: '/my-attendance', icon: Clock, label: t('sidebar.attendance'), hidden: !isAnyAppActive(['hr-attendance-pro', 'hr-basic', 'hr-core']) },
                { to: '/my-leaves', icon: Calendar, label: t('sidebar.myLeaves'), hidden: !isAnyAppActive(['hr-attendance-pro', 'hr-basic', 'hr-core']) },
                { to: '/my-permissions', icon: Clock, label: t('sidebar.myPermissions'), hidden: !isAnyAppActive(['hr-attendance-pro', 'hr-basic', 'hr-core']) },
                { to: '/my-payroll', icon: Banknote, label: t('sidebar.myPayroll'), hidden: !isAnyAppActive(['hr-payroll', 'hr-basic', 'hr-core']) },
                { to: '/my-deductions', icon: Banknote, label: t('sidebar.myDeductions'), hidden: !isAnyAppActive(['hr-payroll', 'hr-basic', 'hr-core']) },
                { to: '/my-warnings', icon: AlertTriangle, label: t('sidebar.warnings'), hidden: !isAnyAppActive(['hr-basic', 'hr-core']) },
                { to: '/my-promotions', icon: TrendingUp, label: t('sidebar.myPromotions'), hidden: !isAnyAppActive(['hr-basic', 'hr-core']) },
                { to: '/my-rewards', icon: Trophy, label: t('sidebar.myRewards'), hidden: !isAnyAppActive(['hr-assets', 'hr-basic', 'hr-core']) },
                { to: '/my-training', icon: GraduationCap, label: t('sidebar.myTraining'), hidden: !isAnyAppActive(['hr-assets', 'hr-basic', 'hr-core']) },
                { to: '/my-custody', icon: Monitor, label: t('sidebar.myCustody'), hidden: !isAnyAppActive(['hr-assets', 'hr-basic', 'hr-core']) },
                { to: '/my-feedback', icon: FileText, label: t('sidebar.mySuggestions'), hidden: !isAnyAppActive(['hr-basic', 'hr-core']) },
                { to: '/my-resignation', icon: FileText, label: t('sidebar.myResignation'), hidden: !isAnyAppActive(['hr-basic', 'hr-core']) },
                { to: '/my-advances', icon: Banknote, label: t('sidebar.myAdvances'), hidden: !isAnyAppActive(['hr-payroll', 'hr-basic', 'hr-core']) },
                { to: '/profile', icon: CircleUser, label: t('sidebar.myProfile') },
                { to: '/my-activity', icon: ClipboardList, label: t('sidebar.myActivity') },
            ]
        },

        // 6️⃣.5 الشركة (مدمج: شركاتي + إدارة الشركة + القانونية)
        ...(['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') ? [{
            id: 'company',
            title: t('sidebar.companyManagementSection'),
            icon: Building,
            items: [
                { to: '/my-companies/hr', icon: BarChart3, label: t('sidebar.companiesDashboard'), hidden: !hasMultipleCompanies },
                { to: '/my-companies/reports', icon: LineChart, label: t('sidebar.unifiedReports'), hidden: !hasMultipleCompanies || !isAnyAppActive(['pos', ...STORE_APP_SLUGS]) },
                { to: '/my-companies/attendance', icon: CheckCircle2, label: t('sidebar.attendanceReport'), hidden: !hasMultipleCompanies || !isAnyAppActive(['hr-basic', 'hr-core', 'hr-attendance-pro', 'hr-payroll', 'hr-assets', 'hr-recruitment']) },
                { to: '/my-companies/links', icon: Building, label: t('sidebar.companyLinks') },
                { to: '/users', icon: Users, label: t('sidebar.usersManagement') },
                { to: '/settings/company', icon: Settings, label: t('sidebar.companySettings') },
                { to: '/company/activity', icon: BarChart3, label: t('sidebar.companyActivity') },
                { to: '/roles', icon: Key, label: t('sidebar.rolesManagement') },
            ]
        }] : []),

        // 7️⃣ الموارد البشرية (للإدارة)
        ...(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(user?.role || '') ? [{
            id: 'hr',
            title: t('sidebar.hrSection'),
            icon: Users,
            items: [
                { to: '/hr', icon: BarChart3, label: t('sidebar.hrDashboard') },
                { to: '/hr/employees', icon: Users, label: t('sidebar.employees') },
                { to: '/hr/online', icon: Radio, label: t('sidebar.onlineTeam') },
                { to: '/hr/monitor', icon: Monitor, label: 'مراقبة نشاط الموظفين والأجهزة' },
                { to: '/hr/departments', icon: Building, label: t('sidebar.departments') },
                { to: '/hr/attendance', icon: CheckCircle2, label: t('sidebar.attendance') },
                { to: '/hr/leaves', icon: Calendar, label: t('sidebar.leaves') },
                { to: '/hr/permissions', icon: Clock, label: t('sidebar.permissions') },
                { to: '/hr/shifts', icon: Calendar, label: t('sidebar.shifts') },
                { to: '/hr/payroll', icon: Banknote, label: t('sidebar.payroll') },
                { to: '/hr/salary-updates', icon: Banknote, label: t('sidebar.salaryUpdates') },
                { to: '/hr/salary-history', icon: ClipboardList, label: t('sidebar.salaryHistory') },
                { to: '/hr/deductions', icon: Banknote, label: t('sidebar.deductions') },
                { to: '/hr/benefits', icon: Banknote, label: t('sidebar.benefits') },
                { to: '/hr/performance-reviews', icon: BarChart3, label: t('sidebar.performanceReviews') },
                { to: '/hr/training', icon: CheckCircle2, label: t('sidebar.training') },
                { to: '/hr/feedback', icon: FileText, label: t('sidebar.feedback') },
                { to: '/hr/warnings', icon: FileText, label: t('sidebar.warnings') },
                { to: '/hr/promotions', icon: TrendingUp, label: t('sidebar.promotions') },
                { to: '/hr/resignations', icon: FileText, label: t('sidebar.resignations') },
                { to: '/hr/advances', icon: Banknote, label: t('sidebar.advances') },
                { to: '/hr/audit-logs', icon: ClipboardList, label: t('sidebar.auditLogs') },
                { to: '/hr/company-policy', icon: FileText, label: t('sidebar.companyPolicy') },
                { to: '/hr/reports-hub', icon: FileText, label: t('sidebar.hrReports') },
                { to: '/hr/reporting/forms', icon: ClipboardList, label: t('sidebar.reportingForms') },
                { to: '/hr/assets', icon: Monitor, label: t('sidebar.assets') },
                { to: '/hr/recruitment', icon: Users, label: t('sidebar.recruitment') },
                { to: '/hr/settings', icon: Settings, label: t('sidebar.hrSettings') },
                { to: '/hr/integrations', icon: Key, label: 'الربط الخارجي والـ AI' },
                { to: '/whatsapp/templates?category=HR', icon: Bell, label: t('sidebar.whatsappNotifications') },
                { to: '/hr/rewards', icon: Star, label: t('sidebar.rewards.title') },
            ],
            // 🔒 إخفاء إذا كان غير مفعل
            hidden: !isAnyAppActive(['hr-basic', 'hr-core', 'hr-attendance-pro', 'hr-payroll', 'hr-assets', 'hr-recruitment'])
        }] : []),

        // 7️⃣.5 المواعيد
        {
            id: 'appointments',
            title: t('sidebar.appointments'),
            icon: Calendar,
            hidden: !isAppActive('booking-app'),
            items: [
                { to: '/appointments', icon: Calendar, label: t('sidebar.appointments') },
            ]
        },

        // 7️⃣.5️⃣ النظام الطبي
        {
            id: 'medical-center',
            title: t('sidebar.medicalCenter'),
            icon: Heart,
            hidden: !isAppActive('medical-system'),
            items: [
                { to: '/admin/booking/dashboard', icon: BarChart3, label: t('sidebar.bookingDashboard') },
                { to: '/admin/booking/appointments', icon: Calendar, label: t('sidebar.bookingAppointments') },
                { to: '/admin/booking/calendar', icon: CalendarDays, label: t('sidebar.bookingCalendar') },
                { to: '/admin/booking/branches', icon: Building2, label: t('sidebar.bookingBranches') },
                { to: '/admin/booking/doctors', icon: Users, label: t('sidebar.bookingDoctors') },
                { to: '/admin/booking/services', icon: Wrench, label: t('sidebar.bookingServices') },
                { to: '/admin/booking/patients', icon: Users, label: t('sidebar.bookingPatients') },
                { to: '/admin/booking/invoices', icon: BarChart3, label: t('sidebar.bookingInvoices') },
                { to: '/admin/booking/price-lists', icon: Tag, label: t('sidebar.bookingPriceLists') },
                { to: '/admin/booking/workflow', icon: ListChecks, label: t('sidebar.bookingWorkflow') },
                { to: '/admin/booking/reports', icon: BarChart3, label: t('sidebar.bookingReports') },
                { to: '/admin/booking/operations', icon: Printer, label: t('sidebar.bookingOperations') },
                { to: '/admin/booking/insurance-companies', icon: ShieldCheck, label: t('sidebar.bookingInsuranceCompanies') },
                { to: '/admin/booking/member-types', icon: Percent, label: t('sidebar.bookingMemberTypes') },
            ]
        },

        // 7️⃣.6️⃣ نظام المعمل
        {
            id: 'lab',
            title: t('sidebar.labModule'),
            icon: FlaskConical,
            hidden: !isAppActive('lab-app'),
            items: [
                { to: '/lab/dashboard', icon: BarChart3, label: t('sidebar.labDashboard') },
                { to: '/lab/reception', icon: Inbox, label: t('sidebar.labReception') },
                { to: '/lab/patients', icon: Users, label: t('sidebar.labPatients') },
                { to: '/lab/orders', icon: ListChecks, label: t('sidebar.labOrders') },
                { to: '/lab/reports-medical', icon: FileText, label: t('sidebar.labMedicalReports') },
                { to: '/lab/tests', icon: FlaskConical, label: t('sidebar.labTests') },
                { to: '/lab/cultures', icon: Dna, label: t('sidebar.labCultures') },
                { to: '/lab/price-lists', icon: Tag, label: t('sidebar.labPriceLists') },
                { to: '/lab/contracts', icon: FileText, label: t('sidebar.labContracts') },
                { to: '/lab/branches', icon: Building2, label: t('sidebar.labBranches') },
                { to: '/lab/invoices', icon: CreditCard, label: t('sidebar.labInvoices') },
                { to: '/lab/reports', icon: BarChart3, label: t('sidebar.labReports') },
                { to: '/lab/home-visits', icon: Home, label: t('sidebar.labHomeVisits') },
                { to: '/lab/settings', icon: Settings, label: t('sidebar.labSettings') },
            ]
        },

        // 7️⃣.6️⃣.6️⃣ نظام معمل الأسنان
        {
            id: 'dental-lab',
            title: t('sidebar.dentalLabModule'),
            icon: Stethoscope,
            hidden: !isAppActive('dental-lab-app'),
            items: [
                { to: '/dental-lab/dashboard', icon: BarChart3, label: t('sidebar.dentalLabDashboard') },
                { to: '/dental-lab/cases', icon: ListChecks, label: t('sidebar.dentalLabCases') },
                { to: '/dental-lab/doctors', icon: Users, label: t('sidebar.dentalLabDoctors') },
                { to: '/dental-lab/work-types', icon: Tag, label: t('sidebar.dentalLabWorkTypes') },
                { to: '/dental-lab/materials', icon: Package, label: t('sidebar.dentalLabMaterials', 'الخامات والمخزون') },
                { to: '/dental-lab/technicians', icon: Users, label: t('sidebar.dentalLabTechnicians') },
                { to: '/dental-lab/invoices', icon: CreditCard, label: t('sidebar.dentalLabInvoices') },
                { to: '/dental-lab/settings', icon: Settings, label: t('sidebar.dentalLabSettings') },
                { to: '/dental-lab/notifications', icon: BellRing, label: t('sidebar.dentalLabNotifications') },
                { to: '/dental-lab/reports', icon: BarChart3, label: t('sidebar.dentalLabReports') },
            ]
        },

        // 7️⃣.6️⃣.7️⃣ أكاديمية ماكس بي
        {
            id: 'academy',
            title: isEn ? 'MaxP Academy' : t('sidebar.academyModule', 'أكاديمية ماكس بي'),
            icon: GraduationCap,
            hidden: !isAppActive('academy-app') && !isAppActive('academy'),
            items: [
                { to: '/academy/dashboard', icon: BarChart3, label: isEn ? 'Academy Dashboard' : t('sidebar.academyDashboard', 'لوحة الأكاديمية') },
                { to: '/academy/courses', icon: BookOpen, label: isEn ? 'Courses Management' : t('sidebar.academyCourses', 'إدارة الكورسات') },
                { to: '/academy/catalog', icon: Store, label: isEn ? 'Student Portal & Catalog' : t('sidebar.academyCatalog', 'بوابة الطلاب والكتالوج') },
                { to: '/academy/students', icon: Users, label: isEn ? 'Students & Progress' : t('sidebar.academyStudents', 'الطلاب والتقدم') },
            ]
        },

        // 7️⃣.6️⃣.5 نظام الأشعة
        {
            id: 'radiology',
            title: t('sidebar.radiologyModule'),
            icon: Radiation,
            hidden: !isAppActive('radiology-app'),
            items: [
                { to: '/radiology/dashboard', icon: BarChart3, label: t('sidebar.radiologyDashboard') },
                {
                    to: '/radiology/queue',
                    icon: ListChecks,
                    label: t('sidebar.radiologyGroupToday'),
                    children: [
                        { to: '/radiology/exam-categories', label: t('sidebar.radiologyExamCategories') },
                        { to: '/radiology/rooms', label: t('sidebar.radiologyRooms'), icon: DoorOpen },
                        { to: '/radiology/price-lists', label: t('sidebar.radiologyPriceLists') },
                        { to: '/radiology/radiologists', label: t('sidebar.radiologyRadiologists') },
                        { to: '/radiology/referring-physicians', label: t('sidebar.radiologyReferringPhysicians') },
                    ],
                },
                {
                    to: '/radiology/exam-types',
                    icon: ScanLine,
                    label: t('sidebar.radiologyGroupResources'),
                    hidden: !isRadiologyManager,
                    children: [
                        { to: '/radiology/exam-categories', label: t('sidebar.radiologyExamCategories') },
                        { to: '/radiology/price-lists', label: t('sidebar.radiologyPriceLists') },
                        { to: '/radiology/radiologists', label: t('sidebar.radiologyRadiologists') },
                        { to: '/radiology/referring-physicians', label: t('sidebar.radiologyReferringPhysicians') },
                        { to: '/radiology/referral-sources', label: t('sidebar.radiologyReferralSources') },
                        { to: '/radiology/marketing-reps', label: t('sidebar.radiologyMarketingReps') },
                        { to: '/radiology/external-partners', label: t('sidebar.radiologyExternalPartners') },
                    ],
                },
                {
                    to: '/radiology/invoices',
                    icon: CreditCard,
                    label: t('sidebar.radiologyGroupFinance'),
                    hidden: !isRadiologyManager,
                    children: [
                        { to: '/radiology/insurance-invoices', label: t('sidebar.radiologyInsuranceInvoices') },
                        { to: '/radiology/insurance-ledger', label: t('sidebar.radiologyInsuranceLedger') },
                        { to: '/radiology/insurance-companies', label: t('sidebar.radiologyInsuranceCompanies') },
                        { to: '/radiology/cashier-shifts', label: t('sidebar.radiologyCashierShifts') },
                    ],
                },
                {
                    to: '/radiology/statistics',
                    icon: BarChart3,
                    label: t('sidebar.radiologyGroupAnalytics'),
                    hidden: !isRadiologyManager,
                    children: [
                        { to: '/radiology/price-quote', label: t('sidebar.radiologyPriceQuote') },
                        { to: '/radiology/reports-overview', label: t('sidebar.radiologyReportsOverview') },
                    ],
                },
                {
                    to: '/radiology/contracts',
                    icon: FileText,
                    label: t('sidebar.radiologyGroupSettings'),
                    hidden: !isRadiologyManager,
                    children: [
                        { to: '/radiology/branches', label: t('sidebar.radiologyBranches') },
                        { to: '/radiology/settings', label: t('sidebar.radiologySettings') },
                    ],
                },
            ]
        },

        // 7️⃣.7️⃣ النظام التعليمي
        {
            id: 'education',
            title: t('sidebar.educationModule'),
            icon: GraduationCap,
            hidden: !isAppActive('education-app'),
            items: [
                { to: '/admin/education/dashboard', icon: BarChart3, label: t('sidebar.educationDashboard') },
                { to: '/admin/education/subjects', icon: BookOpen, label: t('sidebar.educationSubjects') },
                { to: '/admin/education/packages', icon: Gift, label: t('sidebar.educationPackages') },
                { to: '/admin/education/students', icon: Users, label: t('sidebar.educationStudents') },
                { to: '/admin/education/teachers', icon: Users, label: t('sidebar.educationTeachers') },
                { to: '/admin/education/teacher-schedule', icon: CalendarDays, label: t('sidebar.educationTeacherSchedule') },
                { to: '/admin/education/teacher-payments', icon: DollarSign, label: t('sidebar.educationTeacherPayments') },
                { to: '/admin/education/sessions', icon: Clock, label: t('sidebar.educationSessions') },
                { to: '/admin/education/calendar', icon: CalendarDays, label: t('sidebar.educationCalendar') },
                { to: '/admin/education/funnel', icon: Megaphone, label: t('sidebar.educationFunnel') },
            ]
        },

        // 7️⃣.8️⃣ نظام الفنادق
        {
            id: 'hotel',
            title: t('sidebar.hotelModule'),
            icon: Building2,
            hidden: !isAppActive('hotel-app'),
            items: [
                { to: '/admin/hotel', icon: Building2, label: t('sidebar.hotelDashboard') },
            ]
        },

        // 8️⃣ نماذج التسجيل
        {
            id: 'forms',
            title: t('sidebar.formsBuilder'),
            icon: FileText,
            hidden: !isAppActive('forms-app'),
            items: [
                { to: '/admin/forms', icon: FileText, label: t('sidebar.forms') },
            ]
        },

        // 8️⃣.5️⃣ طلبات الخدمات
        {
            id: 'service-requests',
            title: t('sidebar.serviceRequests'),
            icon: ClipboardList,
            hidden: !isAppActive('service-request-app'),
            items: [
                { to: '/admin/services', icon: SquarePen, label: t('sidebar.serviceManagement') },
                { to: '/admin/service-orders', icon: ClipboardList, label: t('sidebar.serviceOrders') },
                { to: '/admin/services/settings', icon: Settings, label: isEn ? 'Services Settings' : 'إعدادات الخدمات' },
            ]
        },

        // 9️⃣ إدارة المهام
        {
            id: 'tasks',
            title: t('sidebar.tasksWorkspace'),
            icon: CheckCircle2,
            hidden: !isAppActive('business-tools'),
            items: [
                {
                    to: '/tasks',
                    icon: CheckCircle2,
                    label: t('sidebar.tasks'),
                    children: [
                        { to: '/goals', label: t('sidebar.goals') },
                        { to: '/tasks/projects', label: t('sidebar.taskProjects') },
                        { to: '/tasks/categories', label: t('sidebar.taskCategories') },
                        { to: '/tasks/settings', label: t('sidebar.taskSettings') },
                        {
                            to: '/tasks/integrations',
                            label: t('sidebar.taskIntegrations'),
                            hidden: !canManageTaskIntegrations,
                        },
                    ],
                },
            ]
        },

        // 1️⃣1️⃣ التطبيقات والفواتير
        {
            id: 'marketplace',
            title: t('sidebar.marketplace'),
            icon: Box,
            items: [
                { to: '/marketplace', icon: Box, label: isEn ? 'App Marketplace' : 'متجر التطبيقات' },
                { to: '/my-apps', icon: Grid3x3, label: t('sidebar.myApps') },
                { to: '/marketplace/history', icon: History, label: isEn ? 'Apps Activity Log' : 'سجل التطبيقات' },
                { to: '/marketplace/downloads', icon: Monitor, label: isEn ? 'Device & Mobile Apps' : 'تطبيقات الأجهزة والموبايل' },
                { to: '/marketplace/agents', icon: Bot, label: isEn ? 'Agents Marketplace' : 'سوق الإيجنت (Workforce)' },
                { to: '/marketplace/themes', icon: Palette, label: t('sidebar.storeThemes') },
                { to: '/marketplace/bundles', icon: Gift, label: t('sidebar.browseBundles') },
                { to: '/payments', icon: Wallet, label: t('sidebar.myPayments') },
            ],
            // 🔒 إخفاء القسم للمسوقين
            hidden: user?.role === 'AFFILIATE'
        },

        // 1️⃣2️⃣ الإشعارات والأدوات
        {
            id: 'notifications',
            title: t('sidebar.notificationsSection'),
            icon: Bell,
            items: [
                { to: '/notifications', icon: Bell, label: t('sidebar.notifications') },
                { to: '/reminders', icon: BellPlus, label: t('sidebar.reminders') },
                { to: '/notification-settings', icon: Cog, label: t('sidebar.notificationSettings') },
            ],
            hidden: !isAnyAppActive(['notification-automation'])
        },

        // 1️⃣4️⃣ الإعدادات (قسم موحد)
        {
            id: 'settings',
            title: t('sidebar.settingsSection'),
            icon: Settings,
            items: [
                { to: '/settings', icon: Cog, label: t('sidebar.settings') },
                { to: '/settings/profile', icon: CircleUser, label: t('sidebar.profileSettings') },
                { to: '/settings/security', icon: ShieldCheck, label: t('sidebar.securitySettings') },
                { to: '/settings/appearance', icon: Paintbrush, label: t('sidebar.appearanceSettings') },
                { to: '/settings/sidebar', icon: ListOrdered, label: t('sidebar.sidebarSettings') },
                { to: '/notification-settings', icon: Bell, label: t('sidebar.notificationSettings') },
            ]
        },

        // 1️⃣5️⃣ إدارة النظام (للسوبر أدمن)
        ...(user?.role === 'SUPER_ADMIN' ? [{
            id: 'system',
            title: isEn ? 'System Management' : (t('sidebar.systemManagementSection') || 'إدارة النظام'),
            icon: Building,
            items: [
                { to: '/super-admin/dashboard', icon: LayoutDashboard, label: isEn ? 'Super Admin Dashboard' : 'لوحة تحكم السوبر أدمن' },
                { to: '/super-admin/companies-v2', icon: Building, label: isEn ? 'Companies Management' : (t('sidebar.companiesManagement') || 'إدارة الشركات') },
                { to: '/super-admin/server-usage', icon: HardDrive, label: isEn ? 'Server Usage & Monitoring' : 'استهلاك الخوادم والمراقبة' },
            ]
        }] : []),

    ];

    // Apply dynamic sidebar management overrides (from DB settings + user settings)
    let result = applySidebarOverrides(sidebarConfig, sidebarManagementData, user?.role, userSidebarSettings, user);

    // Strict per-user app assignment: when assignedApps is configured (non-empty),
    // only the sections belonging to those apps remain.
    // For OWNER and SUPER_ADMIN roles, core administrative sections (company, settings,
    // marketplace, my-account) remain accessible so owners can always manage their company.
    if (assignedApps && assignedApps.length > 0) {
        const normalizedAssigned = assignedApps.map((a) => a.trim().toLowerCase()).filter(Boolean);
        const isAssigned = (section: SidebarSection): boolean => {
            if (['OWNER', 'SUPER_ADMIN'].includes(user?.role || '') && ['company', 'settings', 'my-account', 'marketplace'].includes(section.id)) {
                return true;
            }
            const slugs = resolveSectionAppSlugs(section.id);
            if (slugs.length === 0) return false;
            return slugs.some((slug) => normalizedAssigned.includes(slug.toLowerCase()));
        };
        result = result.filter(isAssigned);
    }

    return result;
};

/**
 * Direct mapping for vertical & operational sections to their marketplace app slugs.
 * Ensures robust mapping even if APP_REGISTRY metadata is modified or queried by sectionId.
 */
const SECTION_APP_FALLBACKS: Record<string, string[]> = {
    'dental-lab': ['dental-lab-app'],
    'lab': ['lab-app'],
    'radiology': ['radiology-app'],
    'medical-center': ['medical-system'],
    'education': ['education-app'],
    'hotel': ['hotel-app'],
    'forms': ['forms-app'],
    'tasks': ['business-tools'],
    'academy': ['academy-app'],
};

/**
 * Resolve the marketplace app slugs that a sidebar section belongs to, based on
 * the app registry section mapping.
 */
const resolveSectionAppSlugs = (sectionId: string): string[] => {
    const rawId = sectionId.toLowerCase();
    const matching = APP_REGISTRY.filter(
        (app) => app.sectionIds.includes(sectionId) || app.id === sectionId,
    );
    const slugs = new Set<string>([
        rawId,
        rawId.endsWith('-app') ? rawId.replace(/-app$/, '') : `${rawId}-app`,
        rawId.endsWith('-section') ? rawId.replace(/-section$/, '') : `${rawId}-section`,
        rawId.endsWith('-module') ? rawId.replace(/-module$/, '') : `${rawId}-module`,
    ]);
    for (const app of matching) {
        slugs.add(app.id.toLowerCase());
        if (app.requiredApps && app.requiredApps.length > 0) {
            for (const req of app.requiredApps) {
                slugs.add(req.toLowerCase());
            }
        }
    }
    const fallbacks = SECTION_APP_FALLBACKS[sectionId];
    if (fallbacks) {
        for (const fb of fallbacks) {
            slugs.add(fb.toLowerCase());
        }
    }
    return Array.from(slugs);
};
