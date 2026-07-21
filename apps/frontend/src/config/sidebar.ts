import {
    UserCircleIcon,
    ChartBarIcon,
    ChatBubbleLeftRightIcon,
    UsersIcon,
    ShoppingBagIcon,
    DocumentTextIcon,
    CogIcon,
    BuildingOfficeIcon,
    BuildingOffice2Icon,
    BuildingStorefrontIcon,
    CalendarIcon,
    CalendarDaysIcon,
    CheckCircleIcon,
    SpeakerWaveIcon,
    TagIcon,
    ArchiveBoxIcon,
    TicketIcon,
    ClipboardDocumentListIcon,
    BanknotesIcon,
    CreditCardIcon,
    PresentationChartLineIcon,
    WrenchScrewdriverIcon,
    BellIcon,
    BellAlertIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
    BeakerIcon,
    UserGroupIcon,
    KeyIcon,
    ClipboardDocumentCheckIcon,
    ShieldExclamationIcon,
    GiftIcon,
    CurrencyDollarIcon,
    TruckIcon,
    MapPinIcon,
    ArrowUturnLeftIcon,
    FunnelIcon,
    ShoppingCartIcon,
    SparklesIcon,
    MagnifyingGlassIcon,
    ClockIcon,
    BoltIcon,
    MegaphoneIcon,
    QuestionMarkCircleIcon,
    RocketLaunchIcon,
    StarIcon,
    ArrowPathRoundedSquareIcon,
    DocumentChartBarIcon,
    ArrowTrendingUpIcon,
    PaperAirplaneIcon,
    PencilSquareIcon,
    ComputerDesktopIcon,
    Cog6ToothIcon,
    QueueListIcon,
    ShieldCheckIcon,
    WalletIcon,
    CubeIcon,
    SwatchIcon,
    PhotoIcon,
    UserPlusIcon,
    CalculatorIcon,
    TrophyIcon,
    ArrowsRightLeftIcon,
    AcademicCapIcon,
    BookOpenIcon,
    LightBulbIcon,
    LinkIcon,
    NoSymbolIcon,
    PaintBrushIcon,
    GlobeAltIcon,
    HeartIcon,
    EyeIcon,
} from '@heroicons/react/24/outline';

import { SidebarManagementData, SidebarSection, SidebarSectionSettings } from '../types/layout';


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
            const itemPermissionAccess = !item.requiredPermissions || item.requiredPermissions.length === 0 ||
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
    'notifications': ['settings.view', 'notifications.view']
};

const hasPermissionAccessForSection = (user: SidebarUser | undefined, sectionId: string): boolean => {
    if (!user) return false;
    
    if (['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'].includes(user.role || '')) return true;
    
    const userPerms = user.permissions || [];
    
    // Built-in roles with no explicit permissions assigned:
    // Fail-safe: deny access so that sections are hidden until permissions are properly loaded.
    // Previously this returned true, which gave full sidebar access when permissions were missing.
    const BUILT_IN_ROLES = ['MANAGER', 'AGENT', 'AFFILIATE', 'MERCHANT'];
    if (BUILT_IN_ROLES.includes(user.role || '') && userPerms.length === 0) {
        return true; // TODO: Consider changing to `false` after verifying all built-in roles have permissions seeded in DB
    }
    
    if (sectionId === 'settings' || sectionId === 'my-account') return true;

    const reqPerms = DOMAIN_PERMISSIONS[sectionId];
    if (reqPerms && reqPerms.length > 0) {
        return reqPerms.some(p => userPerms.includes(p));
    }
    
    return false;
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
                const userPerms = user?.permissions || [];
                const itemPermissionAccess = !item.requiredPermissions || item.requiredPermissions.length === 0 ||
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
): SidebarSection[] => {
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
        // ponytail: isSuperCompany removed — app visibility now purely per activeApps

        // Ensure activeApps is an array and check for the slug
        return Array.isArray(activeApps) && activeApps.some(a =>
            typeof a === 'string' && a.toLowerCase() === slug.toLowerCase()
        );
    };
    const isAnyAppActive = (slugs: string[]) => slugs.some((slug) => isAppActive(slug));
    const canManageTaskIntegrations = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER'].includes(user?.role || '');

    if (user?.role === 'MERCHANT') {
        return [
            {
                id: 'merchant-portal',
                title: t('sidebar.merchantPortalSection'),
                icon: BuildingStorefrontIcon,
                items: [
                    { to: '/merchant-portal', icon: ChartBarIcon, label: t('sidebar.merchantPortal') },
                    { to: '/products', icon: ShoppingBagIcon, label: t('sidebar.merchantProducts') },
                    { to: '/inventory', icon: CubeIcon, label: t('sidebar.inventory') },
                    { to: '/orders', icon: ArchiveBoxIcon, label: t('sidebar.merchantOrders') },
                    { to: '/merchant-portal/commissions', icon: BanknotesIcon, label: t('sidebar.merchantCommissions') },
                ],
            },
            {
                id: 'merchant-account',
                title: t('sidebar.myAccountSection'),
                icon: UserCircleIcon,
                items: [
                    { to: '/profile', icon: UserCircleIcon, label: t('sidebar.myProfile') },
                ],
            },
        ];
    }

    if (user?.role === 'AFFILIATE') {
        const affiliateProfile = user.affiliate;
        const canCreateOrdersForOthers = affiliateProfile?.canCreateOrdersForOthers !== false;
        const canViewCustomerData = affiliateProfile?.canViewCustomerData !== false;
        const affiliateItems = [
            { to: '/affiliates/dashboard', icon: ChartBarIcon, label: t('dashboard.title') },
            { to: '/affiliates/orders', icon: ArchiveBoxIcon, label: t('sidebar.myOrders') },
            ...(canCreateOrdersForOthers
                ? [{ to: '/affiliates/orders/create', icon: PencilSquareIcon, label: t('sidebar.affiliateCreateOrder') }]
                : []),
            ...(canViewCustomerData
                ? [{ to: '/affiliates/customers', icon: UsersIcon, label: t('sidebar.customers') }]
                : []),
            { to: '/affiliates/referrals', icon: ArrowTrendingUpIcon, label: t('sidebar.referrals') },
            { to: '/affiliates/commission', icon: BanknotesIcon, label: t('sidebar.commissions') },
        ];

        return [
            {
                id: 'affiliate-portal',
                title: t('sidebar.affiliateSection'),
                icon: CurrencyDollarIcon,
                items: affiliateItems,
            },
            {
                id: 'affiliate-account',
                title: t('sidebar.myAccountSection'),
                icon: UserCircleIcon,
                items: [
                    { to: '/profile', icon: UserCircleIcon, label: t('sidebar.myProfile') },
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
                icon: ChartBarIcon,
                items: [
                    { to: '/company-dashboard', icon: ChartBarIcon, label: t('sidebar.dashboard') },
                    { to: '/my-companies/links', icon: BuildingOfficeIcon, label: t('sidebar.companyLinks') },
                ],
            },
            {
                id: 'storefront-design',
                title: t('sidebar.storefrontSection'),
                icon: SwatchIcon,
                items: [
                    {
                        to: '/shop',
                        icon: BuildingStorefrontIcon,
                        label: t('sidebar.visitStore'),
                        external: true,
                    },
                    { to: '/settings/store-pages', icon: DocumentTextIcon, label: t('sidebar.storePages') },
                    { to: '/settings/store?tab=branches', icon: BuildingStorefrontIcon, label: t('sidebar.storeSettings') },
                    { to: '/settings/store/product-conversion', icon: SparklesIcon, label: t('sidebar.storefrontStudio') },
                ],
            },
            {
                id: 'affiliate',
                title: t('sidebar.affiliateSection'),
                icon: CurrencyDollarIcon,
                items: [
                    { to: '/affiliates/management', icon: UserGroupIcon, label: t('sidebar.affiliateManagement') },
                    { to: '/affiliates/quick-actions', icon: BoltIcon, label: t('sidebar.quickActions') },
                    { to: '/merchants', icon: BuildingStorefrontIcon, label: t('sidebar.merchants') },
                    { to: '/platform/commissions', icon: CurrencyDollarIcon, label: t('sidebar.commissions') },
                    { to: '/affiliates/settings', icon: CogIcon, label: t('sidebar.affiliateSettings') },
                ],
            },
            {
                id: 'products',
                title: t('sidebar.productsSection'),
                icon: ShoppingBagIcon,
                items: [
                    { to: '/products', icon: ShoppingBagIcon, label: t('sidebar.products') },
                    { to: '/inventory', icon: ArchiveBoxIcon, label: t('sidebar.inventory') },
                    { to: '/inventory/warehouses', icon: BuildingOfficeIcon, label: t('sidebar.warehouses') },
                    { to: '/shipping-companies', icon: TruckIcon, label: t('sidebar.shippingCompanies') },
                ],
            },
            {
                id: 'procurement',
                title: t('sidebar.procurement'),
                icon: ClipboardDocumentListIcon,
                items: [
                    { to: '/procurement/dashboard', icon: ChartBarIcon, label: t('dashboard.title') },
                    { to: '/procurement/suppliers', icon: UserGroupIcon, label: t('sidebar.suppliers') },
                    { to: '/procurement/purchase-orders', icon: DocumentTextIcon, label: t('sidebar.purchaseOrders') },
                    { to: '/procurement/purchase-invoices', icon: ClipboardDocumentCheckIcon, label: t('sidebar.purchaseInvoices') },
                    { to: '/procurement/supplier-payments', icon: BanknotesIcon, label: t('sidebar.supplierPayments') },
                ],
            },
            {
                id: 'orders',
                title: t('sidebar.ordersSection'),
                icon: ArchiveBoxIcon,
                items: [
                    { to: '/orders', icon: ArchiveBoxIcon, label: t('sidebar.orders') },
                    { to: '/orders/manual', icon: PencilSquareIcon, label: t('sidebar.manualOrder') },
                    { to: '/orders/analytics', icon: ChartBarIcon, label: t('sidebar.orderAnalytics') },
                ],
            },
            {
                id: 'customers',
                title: t('sidebar.customers'),
                icon: UsersIcon,
                items: [
                    { to: '/customers', icon: UsersIcon, label: t('sidebar.customers') },
                    { to: '/leads', icon: UserPlusIcon, label: t('sidebar.leads') },
                ],
            },
            {
                id: 'marketplace',
                title: t('sidebar.marketplace'),
                icon: CubeIcon,
                items: [
                    { to: '/marketplace', icon: CubeIcon, label: t('sidebar.browseApps') },
                    { to: '/marketplace/bundles', icon: GiftIcon, label: t('sidebar.browseBundles') },
                    { to: '/payments', icon: WalletIcon, label: t('sidebar.myPayments') },

                    { to: '/subscription/pricing', icon: ClipboardDocumentListIcon, label: t('sidebar.appPricingSheet') },
                ],
            },
            {
                id: 'company',
                title: t('sidebar.companyManagementSection'),
                icon: UserGroupIcon,
                items: [
                    { to: '/settings/company', icon: Cog6ToothIcon, label: t('sidebar.companySettings') },
                    { to: '/users', icon: UserGroupIcon, label: t('sidebar.usersManagement') },
                    { to: '/roles', icon: KeyIcon, label: t('sidebar.rolesManagement') },
                    { to: '/profile', icon: UserCircleIcon, label: t('sidebar.myProfile') },
                ],
            },
        ];
    }

    const sidebarConfig = [
        // 1️⃣ الرئيسية
        {
            id: 'main',
            title: t('sidebar.mainSection'),
            icon: ChartBarIcon,
            items: [
                { to: '/company-dashboard', icon: ChartBarIcon, label: t('sidebar.dashboard') },
            ],
            hidden: user?.role === 'AFFILIATE' || !isAppActive('store')
        },
        
        // 1.5 الإنبوكس الموحد
        {
            id: 'unified-inbox-section',
            title: t('sidebar.unifiedInbox'),
            icon: ChatBubbleLeftRightIcon,
            items: [
                { to: '/unified-inbox', icon: ChatBubbleLeftRightIcon, label: t('sidebar.unifiedInbox') },
                { to: '/unified-inbox/connections', icon: LinkIcon, label: t('sidebar.platformConnections') },
            ],
            hidden: user?.role === 'AFFILIATE' || !isAppActive('unified-inbox')
        },

        // 1️⃣.6 العميل الذكي AI (للأدمن والمالك - عند تفعيل ai-chat-basic)
        ...((user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'OWNER') && isAppActive('ai-chat-basic') ? [{
            id: 'ai-operator',
            title: t('sidebar.aiOperatorSection'),
            icon: SparklesIcon,
            items: [
                { to: '/admin/agent-profiles', icon: UserGroupIcon, label: t('sidebar.agentProfiles') },
                { to: '/admin/ai-image-generator', icon: PhotoIcon, label: t('sidebar.aiImageGenerator') },
                { to: '/admin/ai-catalog', icon: ShoppingBagIcon, label: t('sidebar.aiCatalog') },
                { to: '/admin/ai-knowledge-questions', icon: LightBulbIcon, label: t('sidebar.aiKnowledgeQuestions') },
                { to: '/admin/ai-hub?tab=sandbox', icon: BeakerIcon, label: t('sidebar.aiAgentSandbox') },
                { to: '/admin/faqs', icon: QuestionMarkCircleIcon, label: t('sidebar.faqs') },
                { to: '/admin/policies', icon: ClipboardDocumentCheckIcon, label: t('sidebar.policies') },
                { to: '/admin/ai-hub?tab=routing', icon: ArrowPathRoundedSquareIcon, label: t('sidebar.channelRouting') },
                { to: '/admin/ai-hub?tab=skills', icon: SwatchIcon, label: t('sidebar.aiAgentSkills'), hidden: !isFeatureEnabled('aiToolsEnabled') },
                { to: '/admin/ai-hub?tab=tools', icon: WrenchScrewdriverIcon, label: t('sidebar.aiAgentTools'), hidden: !isFeatureEnabled('aiToolsEnabled') },
            ]
        }] : []),

        // 2️⃣ فيسبوك
        {
            id: 'facebook',
            title: t('sidebar.facebookSection'),
            icon: ChatBubbleLeftRightIcon,
            items: [
                { to: '/facebook-inbox', icon: ChatBubbleLeftRightIcon, label: t('sidebar.facebookInbox') },
                { to: '/unified-comments', icon: ChatBubbleLeftRightIcon, label: t('sidebar.unifiedComments') },
                { to: '/employee-stats', icon: ChartBarIcon, label: t('sidebar.employeeStats') },
                { to: '/sent-messages-stats', icon: ChartBarIcon, label: t('sidebar.sentMessagesStats') },
                { to: '/campaign-calculator', icon: CalculatorIcon, label: t('sidebar.campaignCalculator') },
                { to: '/settings/facebook-oauth', icon: ChatBubbleLeftRightIcon, label: t('sidebar.facebookConnect') },
                { to: '/settings/facebook-blocked', icon: NoSymbolIcon, label: t('sidebar.facebookBlocked') },
                { to: '/settings/agent-inbox', icon: KeyIcon, label: t('sidebar.agentInboxApi') },
                { to: '/settings/smart-replies', icon: ChatBubbleLeftRightIcon, label: t('sidebar.smartReplies') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('crm-basic'),
        },

        // 2️⃣.1 إنستجرام
        {
            id: 'instagram',
            title: t('sidebar.instagramSection'),
            icon: ChatBubbleLeftRightIcon,
            items: [
                { to: '/instagram-inbox', icon: ChatBubbleLeftRightIcon, label: t('sidebar.instagramInbox') },
                { to: '/settings/instagram', icon: CogIcon, label: t('sidebar.instagramSettings') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('crm-basic'),
        },

        // 2️⃣.5 واتساب
        {
            id: 'whatsapp',
            title: t('sidebar.whatsappSection'),
            icon: ChatBubbleLeftRightIcon,
            items: [
                { to: '/whatsapp', icon: ChatBubbleLeftRightIcon, label: t('sidebar.whatsapp') },
                { to: '/whatsapp/notifications', icon: BellIcon, label: t('sidebar.whatsappNotifications') },
                { 
                    to: '/whatsapp/templates', 
                    icon: DocumentTextIcon, 
                    label: t('sidebar.whatsappTemplates'),
                    children: [
                        { to: '/whatsapp/templates?category=ORDERS', label: t('sidebar.whatsappTemplatesOrders') },
                        { to: '/whatsapp/templates?category=HR', label: t('sidebar.whatsappTemplatesHR') },
                        { to: '/whatsapp/templates?category=SYSTEM', label: t('sidebar.whatsappTemplatesSystem') },
                    ]
                },
                { to: '/whatsapp/routing', icon: ArrowsRightLeftIcon, label: t('sidebar.whatsappRouting') },
                { to: '/whatsapp/settings', icon: CogIcon, label: t('sidebar.whatsappSettings') },
                { to: '/whatsapp/cloud-connect', icon: GlobeAltIcon, label: t('sidebar.whatsappCloudConnect') },
                { to: '/whatsapp/employee-analytics', icon: ChartBarIcon, label: t('sidebar.whatsappEmployeeAnalytics') },
                { to: '/whatsapp/conversation-analytics', icon: ChartBarIcon, label: t('sidebar.whatsappConversationAnalytics') },
                { to: '/whatsapp/meta-templates', icon: GlobeAltIcon, label: t('sidebar.whatsappMetaTemplates') },
                { to: '/whatsapp/template-broadcast', icon: MegaphoneIcon, label: t('sidebar.whatsappTemplateBroadcast') },
                { to: '/whatsapp/lead-followup', icon: BoltIcon, label: t('sidebar.whatsappLeadFollowup') },
                { to: '/whatsapp/customer-journey', icon: ArrowPathRoundedSquareIcon, label: t('sidebar.whatsappCustomerJourney') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('whatsapp-business')
        },

        // 2️⃣.6 تليجرام
        {
            id: 'telegram',
            title: t('sidebar.telegramSection'),
            icon: PaperAirplaneIcon,
            items: [
                { to: '/telegram/pro', icon: PaperAirplaneIcon, label: t('sidebar.telegramPro') },
                { to: '/telegram-userbot', icon: UserCircleIcon, label: t('sidebar.telegramUserbot') },
                { to: '/telegram/auto-reply', icon: BoltIcon, label: t('sidebar.autoReply') },
                { to: '/telegram/bulk-messages', icon: MegaphoneIcon, label: t('sidebar.bulkMessages') },
                { to: '/telegram/scheduler', icon: ClockIcon, label: t('sidebar.scheduler') },
                { to: '/telegram/campaigns', icon: MegaphoneIcon, label: t('sidebar.campaigns') },
                { to: '/telegram/groups', icon: UserGroupIcon, label: t('sidebar.groups') },
                { to: '/settings/telegram', icon: CogIcon, label: t('sidebar.telegramSettings') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('telegram-business'),
        },

        // 3️⃣ إدارة الطلبات (قسم مستقل شامل)
        {
            id: 'orders',
            title: t('sidebar.ordersSection'),
            icon: ArchiveBoxIcon,
            items: [
                { to: '/orders', icon: ArchiveBoxIcon, label: t('sidebar.orders'), requiredPermissions: ['orders.view'] },
                { to: '/orders/workspace', icon: UserCircleIcon, label: t('sidebar.agentWorkspace'), requiredPermissions: ['orders.workspace.view'] },
                { to: '/orders/preparation', icon: BeakerIcon, label: t('sidebar.orderPreparation'), requiredPermissions: ['orders.preparation.view'] },
                { to: '/orders/automation', icon: BoltIcon, label: t('sidebar.orderAutomation', 'أتمتة الحالات'), requiredPermissions: ['orders.automation.view'] },
                { to: '/orders/incomplete', icon: ExclamationTriangleIcon, label: t('sidebar.incompleteOrders'), requiredPermissions: ['orders.incomplete.view'] },
                { to: '/pos', icon: CreditCardIcon, label: t('sidebar.pos'), requiredPermissions: ['orders.pos.view'] },
                { to: '/orders/invoices', icon: DocumentTextIcon, label: t('sidebar.orderInvoices'), requiredPermissions: ['orders.invoices.view'] },
                { to: '/settings/order-invoice', icon: CogIcon, label: t('sidebar.orderInvoiceSettings'), requiredPermissions: ['orders.invoices.view'] },
                { to: '/orders/manual', icon: PencilSquareIcon, label: t('sidebar.manualOrder'), requiredPermissions: ['orders.manual.create'] },
                { to: '/bulk-search', icon: QueueListIcon, label: t('sidebar.bulkSearch'), requiredPermissions: ['orders.bulk-search.view'] },
                { to: '/products/reviews', icon: StarIcon, label: t('sidebar.productReviews'), requiredPermissions: ['orders.product-reviews.view'] },
                { to: '/settings/orders', icon: CogIcon, label: t('sidebar.ordersSettings'), requiredPermissions: ['orders.settings.view'] },
                { to: '/settings/customer-blocks', icon: ShieldExclamationIcon, label: t('sidebar.customerBlockSettings'), requiredPermissions: ['orders.customer-blocks.view'] },
                { to: '/settings/turbo', icon: RocketLaunchIcon, label: t('sidebar.turboSettings'), requiredPermissions: ['orders.turbo-settings.view'] },
                { to: '/orders/turbo-records', icon: TruckIcon, label: t('sidebar.turboRecords'), requiredPermissions: ['orders.turbo.view'] },
                { to: '/tickets', icon: TicketIcon, label: t('sidebar.turboTickets'), requiredPermissions: ['orders.tickets.view'] },
                { to: '/shipping-companies', icon: TruckIcon, label: t('sidebar.shippingCompanies'), requiredPermissions: ['orders.shipping.view'] },
                { to: '/returns', icon: CheckCircleIcon, label: t('sidebar.returnReviews'), requiredPermissions: ['orders.returns.view'] },
                { to: '/orders/bulk', icon: QueueListIcon, label: t('sidebar.bulkOrders', 'Bulk Orders'), requiredPermissions: ['orders.bulk.create'] },
                { to: '/orders/quick-status', icon: ArrowPathRoundedSquareIcon, label: t('sidebar.quickStatusChange'), requiredPermissions: ['orders.quickstatus.view'] },
                { to: '/orders/analytics', icon: ChartBarIcon, label: t('sidebar.orderAnalytics'), requiredPermissions: ['orders.stats.view'] },
                { to: '/orders/status-summary', icon: DocumentChartBarIcon, label: t('sidebar.orderStatusSummary'), requiredPermissions: ['orders.status-summary.view'] },
                { to: '/returns/settings', icon: CogIcon, label: t('sidebar.returnSettings'), requiredPermissions: ['orders.return-settings.view'] },
                { to: '/cancellations/settings', icon: XCircleIcon, label: t('sidebar.cancellationSettings'), requiredPermissions: ['orders.cancellation-reasons.view'] },
                { to: '/platform-integrations', icon: BoltIcon, label: t('sidebar.platformIntegrations'), requiredPermissions: ['orders.integrations.view'] },
                { to: '/settings/order-workflow', icon: ArrowsRightLeftIcon, label: t('sidebar.orderWorkflow'), requiredPermissions: ['orders.workflow.view'] },
                { to: '/settings/cod-deposit', icon: BanknotesIcon, label: t('sidebar.codDeposit', 'الدفعة المقدمة COD'), requiredPermissions: ['orders.settings.view'] },
                { to: '/whatsapp/templates?category=ORDERS', icon: BellIcon, label: t('sidebar.whatsappNotifications'), requiredPermissions: ['orders.whatsapp-notifications.view'] },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('store')
        },

        // 3️⃣.5 إحصائيات الطلبات
        {
            id: 'orders-analytics',
            title: t('sidebar.orderAnalytics'),
            icon: ChartBarIcon,
            items: [
                { to: '/analytics/orders', icon: ChartBarIcon, label: t('dashboard.overview') },
                { to: '/analytics/orders/orders', icon: ArchiveBoxIcon, label: t('sidebar.orderAnalytics') },
                { to: '/analytics/orders/revenue', icon: BanknotesIcon, label: t('sidebar.revenueAnalytics') },
                { to: '/analytics/orders/products', icon: ShoppingBagIcon, label: t('sidebar.productAnalytics') },
                { to: '/analytics/orders/variations', icon: TagIcon, label: t('sidebar.variationAnalytics') },
                { to: '/analytics/orders/categories', icon: TagIcon, label: t('sidebar.categoryAnalytics') },
                { to: '/analytics/orders/coupons', icon: TicketIcon, label: t('sidebar.couponAnalytics') },
                { to: '/analytics/orders/stock', icon: ClipboardDocumentListIcon, label: t('sidebar.stockAnalytics') },
                { to: '/analytics/orders/customers', icon: UsersIcon, label: t('sidebar.customerAnalytics') },
                { to: '/analytics/orders/payments', icon: CreditCardIcon, label: t('sidebar.paymentMethods') },
                { to: '/analytics/orders/campaign-attribution', icon: MegaphoneIcon, label: t('sidebar.campaignAttribution') },
                { to: '/analytics/orders/profit', icon: CurrencyDollarIcon, label: t('sidebar.profitAnalytics') },
                { to: '/analytics/orders/cod-performance', icon: TruckIcon, label: t('sidebar.codPerformance') },
                { to: '/analytics/orders/today-ops', icon: SparklesIcon, label: t('sidebar.todayOps') },
                { to: '/analytics/orders/cancellations', icon: XCircleIcon, label: t('sidebar.cancellationAnalytics') },
                { to: '/analytics/orders/delivery-rate', icon: TruckIcon, label: t('sidebar.deliveryRate') },
                { to: '/analytics/orders/regions', icon: MapPinIcon, label: t('sidebar.regionAnalytics') },
                { to: '/analytics/orders/returns', icon: ArrowUturnLeftIcon, label: t('sidebar.returnAnalytics') },
                { to: '/analytics/orders/funnel', icon: FunnelIcon, label: t('sidebar.conversionFunnel') },
                { to: '/analytics/orders/conversion', icon: ChartBarIcon, label: t('sidebar.conversionRate') },
                { to: '/analytics/orders/team-performance', icon: UsersIcon, label: t('sidebar.teamPerformance') },
                { to: '/analytics/orders/abandoned-cart', icon: ShoppingCartIcon, label: t('sidebar.abandonedCart') },
                { to: '/analytics/orders/advanced-plan', icon: ClipboardDocumentCheckIcon, label: t('sidebar.developmentPlan') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAnyAppActive(['analytics-advanced', 'analytics-basic'])
        },

        // 4️⃣ المنتجات
        {
            id: 'products',
            title: t('sidebar.productsSection'),
            icon: ShoppingBagIcon,
            items: [
                { to: '/products', icon: ShoppingBagIcon, label: t('sidebar.products') },
                { to: '/categories', icon: TagIcon, label: t('sidebar.categories') },
                { to: '/settings/upsell', icon: ArrowTrendingUpIcon, label: t('sidebar.upsellManagement') },
                { to: '/analytics/store', icon: ArrowTrendingUpIcon, label: t('sidebar.storeAnalytics') },
            ],
            hidden: user?.role === 'AFFILIATE' || !isAppActive('store')
        },

        // 4️⃣.1 تصميم وتنسيق المتجر (Storefront Design)
        {
            id: 'storefront-design',
            title: t('sidebar.storefrontSection'),
            icon: SwatchIcon,
            items: [
                {
                    to: '/shop',
                    icon: BuildingStorefrontIcon,
                    label: t('sidebar.visitStore'),
                    external: true
                },
                { to: '/settings/store-pages', icon: DocumentTextIcon, label: t('sidebar.storePages') },
                { to: '/settings/custom-domain', icon: LinkIcon, label: t('sidebar.customDomain') },
                { to: '/settings/store?tab=branches', icon: BuildingStorefrontIcon, label: t('sidebar.storeSettings') },
                { to: '/settings/store/product-conversion', icon: SparklesIcon, label: t('sidebar.conversionTools') },
                { to: '/settings/store/offers-bundles', icon: GiftIcon, label: t('sidebar.offersBundles') },
                { to: '/settings/store/growth-widgets', icon: ComputerDesktopIcon, label: t('sidebar.growthWidgets') },
                { to: '/settings/store/selling-modes', icon: ArrowsRightLeftIcon, label: t('sidebar.sellingModes') },
                { to: '/settings/store/reviews-social-proof', icon: StarIcon, label: t('sidebar.reviewsSocialProof') },
                { to: '/settings/store?tab=shipping', icon: TruckIcon, label: t('sidebar.storeShipping') },
                { to: '/settings/store?tab=footer', icon: DocumentTextIcon, label: t('sidebar.footerSettings') },
                { to: '/settings/promotion', icon: GiftIcon, label: t('sidebar.freeShippingSettings') },
                { to: '/settings/store-promotion', icon: GiftIcon, label: t('sidebar.storePromotion') },
                { to: '/admin/faqs', icon: QuestionMarkCircleIcon, label: t('sidebar.faqs') },
                { to: '/admin/policies', icon: ClipboardDocumentCheckIcon, label: t('sidebar.policies') },
                { to: '/settings/clarity', icon: ChartBarIcon, label: t('sidebar.microsoftClarity') },
                { to: '/offers-review', icon: ClipboardDocumentListIcon, label: t('sidebar.offersReview') },
                { to: '/coupons', icon: TicketIcon, label: t('sidebar.coupons') },
                {
                    to: '/analytics/orders/coupons',
                    icon: TicketIcon,
                    label: t('sidebar.couponAnalytics'),
                    hidden: !isAppActive('analytics-advanced')
                },
                {
                    to: '/analytics/orders/funnel',
                    icon: FunnelIcon,
                    label: t('sidebar.conversionFunnel'),
                    hidden: !isAppActive('analytics-advanced')
                },
                {
                    to: '/analytics/orders/abandoned-cart',
                    icon: ShoppingCartIcon,
                    label: t('sidebar.abandonedCart'),
                    hidden: !isAppActive('analytics-advanced')
                },
            ],
            // 🔒 متاح للمالك والأدمن فقط لتغيير تصميم المتجر
            hidden: user?.role === 'AFFILIATE' || !isAnyAppActive(['store', 'conversion-suite'])
        },

        // 4️⃣.2 العملاء
        {
            id: 'customers',
            title: t('sidebar.customers'),
            icon: UsersIcon,
            items: [
                { to: '/customers', icon: UsersIcon, label: t('sidebar.customers') },
                { to: '/customers?status=LEAD', icon: UserPlusIcon, label: t('sidebar.customerStatusLead') },
                { to: '/customers?status=ACTIVE', icon: CheckCircleIcon, label: t('sidebar.customerStatusActive') },
                { to: '/customers?status=INACTIVE', icon: ClockIcon, label: t('sidebar.customerStatusInactive') },
                { to: '/customers?status=BLOCKED', icon: NoSymbolIcon, label: t('sidebar.customerStatusBlocked') },
                { to: '/customers/whatsapp-notify', icon: MegaphoneIcon, label: t('sidebar.whatsappNotifications') },

                { to: '/customers/occasions-notify', icon: CalendarIcon, label: t('sidebar.customersOccasions') },
                { to: '/customers/birthday-whatsapp-notify', icon: GiftIcon, label: t('sidebar.customersBirthday') },
                { to: '/whatsapp/customer-journey', icon: SparklesIcon, label: t('sidebar.whatsappJourney') },
                ...(user?.role === 'CUSTOMER' ? [{ to: '/wallet', icon: WalletIcon, label: t('sidebar.wallet') }] : []),
                { to: '/customers/loyalty-programs', icon: GiftIcon, label: t('sidebar.loyaltyPrograms') },
                { to: '/customers/loyalty-tiers', icon: StarIcon, label: t('sidebar.loyaltyTiers') },
                { to: '/customers/loyalty-members', icon: UserGroupIcon, label: t('sidebar.loyaltyMembers') },
                { to: '/customers/loyalty-analytics', icon: ChartBarIcon, label: t('sidebar.loyaltyAnalytics') },
                { to: '/customers/segments', icon: FunnelIcon, label: t('sidebar.customerSegments') },
                { to: '/customers/points-center', icon: TrophyIcon, label: t('sidebar.customerPointsCenter') },
                { to: '/customers/cashback', icon: CurrencyDollarIcon, label: t('sidebar.cashbackSettings') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان CRM غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAnyAppActive(['crm-basic', 'crm-lite'])
        },

        // 4️⃣.3 المشتريات
        {
            id: 'procurement',
            title: t('sidebar.procurement'),
            icon: ClipboardDocumentListIcon,
            items: [
                { to: '/procurement/dashboard', icon: ChartBarIcon, label: t('dashboard.title') },
                { to: '/procurement/suppliers', icon: UserGroupIcon, label: t('sidebar.suppliers') },
                { to: '/procurement/purchase-orders', icon: DocumentTextIcon, label: t('sidebar.purchaseOrders') },
                { to: '/procurement/purchase-invoices', icon: ClipboardDocumentCheckIcon, label: t('sidebar.purchaseInvoices') },
                { to: '/procurement/supplier-payments', icon: BanknotesIcon, label: t('sidebar.supplierPayments') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAnyAppActive(['procurement-pro', 'ecommerce-pro'])
        },

        // 4️⃣.4 البيع بالجملة
        {
            id: 'wholesale',
            title: t('sidebar.wholesale'),
            icon: TagIcon,
            items: [
                { to: '/wholesale/dashboard', icon: ChartBarIcon, label: t('dashboard.title') },
                { to: '/wholesale/price-lists', icon: DocumentTextIcon, label: t('sidebar.priceLists') },
                { to: '/wholesale/customers', icon: UserGroupIcon, label: t('sidebar.wholesaleCustomers') },
                { to: '/wholesale/statements', icon: ClipboardDocumentCheckIcon, label: t('sidebar.customerStatements') },
                { to: '/wholesale/debts', icon: ExclamationTriangleIcon, label: t('sidebar.debtTracking') },
            ],
            hidden: user?.role === 'AFFILIATE' || !isAnyAppActive(['wholesale-pro'])
        },

        // 4️⃣.5 الافليت والدروب شيبنج
        {
            id: 'affiliate',
            title: t('sidebar.affiliateSection'),
            icon: CurrencyDollarIcon,
            hidden: !isAppActive('affiliate-program'),
            items: [
                ...(user?.role === 'OWNER' || user?.role === 'COMPANY_ADMIN' || user?.role === 'SUPER_ADMIN' ? [
                    { to: '/affiliates/management', icon: UserGroupIcon, label: t('sidebar.affiliateManagement') },
                    { to: '/affiliates/quick-actions', icon: BoltIcon, label: t('sidebar.quickActions') },
                    { to: '/merchants', icon: BuildingStorefrontIcon, label: t('sidebar.merchants') },
                    { to: '/platform/commissions', icon: CurrencyDollarIcon, label: t('sidebar.commissions') },
                    { to: '/affiliates/settings', icon: CogIcon, label: t('sidebar.affiliateSettings') },
                    { to: '/affiliates/products/visibility', icon: GlobeAltIcon, label: t('sidebar.affiliateProductVisibility') },
                    { to: '/company-affiliates', icon: BuildingStorefrontIcon, label: t('sidebar.relatedCompanies') },
                ] : []),
                ...(user?.role === 'AFFILIATE' ? [
                    { to: '/affiliates/dashboard', icon: ChartBarIcon, label: t('dashboard.title') },
                    { to: '/affiliates/orders', icon: ArchiveBoxIcon, label: t('sidebar.myOrders') },
                    { to: '/affiliates/orders/create', icon: PencilSquareIcon, label: t('sidebar.affiliateCreateOrder') },
                    { to: '/affiliates/commission', icon: BanknotesIcon, label: t('sidebar.commissions') },
                ] : [])
            ]
        },

        // 4️⃣.6 برنامج شركاء المنصة (Platform Partner Program)
        {
            id: 'platform-partner',
            title: t('sidebar.partnerProgram'),
            icon: UserPlusIcon,
            items: [
                { to: '/partner-dashboard', icon: UserGroupIcon, label: t('sidebar.partnerDashboard') },
            ],
            hidden: !isAppActive('partner-program'),
        },

        // 4️⃣.7 المخزون
        {
            id: 'inventory',
            title: t('sidebar.inventorySection'),
            icon: ClipboardDocumentListIcon,
            items: [
                { to: '/inventory', icon: ArchiveBoxIcon, label: t('sidebar.inventory') },
                { to: '/inventory/warehouses', icon: BuildingOfficeIcon, label: t('sidebar.warehouses') },
                { to: '/inventory/audits', icon: ClipboardDocumentListIcon, label: t('sidebar.inventoryAudits') },
                { to: '/inventory/analytics', icon: ChartBarIcon, label: t('sidebar.orderAnalytics') },
                { to: '/inventory/reports', icon: ChartBarIcon, label: t('sidebar.inventoryReports') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAppActive('store')
        },

        // 5️⃣ التسويق والإعلانات
        {
            id: 'marketing',
            title: t('sidebar.marketingSection'),
            icon: MegaphoneIcon,
            items: [
                { to: '/broadcast', icon: SpeakerWaveIcon, label: t('sidebar.broadcast'), hidden: !isAppActive('crm-basic') },
                { to: '/facebook/create-post', icon: PencilSquareIcon, label: t('sidebar.facebookPost') },
                { to: '/advertising/facebook-pixel', icon: ChartBarIcon, label: t('sidebar.facebookPixel') },
                { to: '/advertising/google-tag-manager', icon: ChartBarIcon, label: t('sidebar.googleTagManager') },
                { to: '/advertising/facebook-ads', icon: MegaphoneIcon, label: t('sidebar.facebookAds'), hidden: false },
                { to: '/advertising/facebook-ads/decision-reports', icon: ChartBarIcon, label: t('sidebar.facebookAdsReports'), hidden: false },
                { to: '/advertising/facebook-ads/ad-library', icon: MagnifyingGlassIcon, label: t('sidebar.adLibrary') },
                { to: '/advertising/facebook-ads/overlay-campaigns', icon: SparklesIcon, label: t('sidebar.overlayCampaigns') },
                { to: '/advertising/product-landing-pages', icon: ComputerDesktopIcon, label: t('sidebar.productLandingPages') },
                { to: '/advertising/facebook-ads/tests', icon: BeakerIcon, label: t('sidebar.abTests') },
                { to: '/advertising/facebook-ads/audiences', icon: UserGroupIcon, label: t('sidebar.audiences') },
                { to: '/advertising/facebook-ads/catalogs', icon: ShoppingBagIcon, label: t('sidebar.productCatalogs') },
                { to: '/tools/break-even', icon: CalculatorIcon, label: t('sidebar.projectBreakEven') },
                { to: '/tools/product-break-even', icon: CurrencyDollarIcon, label: t('sidebar.productBreakEven') },
                { to: '/tools/pricing-strategy', icon: TagIcon, label: t('sidebar.pricingStrategy') },
                { to: '/tools/profitability-engine', icon: CalculatorIcon, label: t('sidebar.profitabilityEngine') },
                { to: '/tools/ad-budget-planner', icon: CurrencyDollarIcon, label: t('sidebar.adBudgetPlanner') },
                { to: '/tools/discount-impact', icon: TagIcon, label: t('sidebar.discountImpact') },
                { to: '/tools/shipping-optimizer', icon: TruckIcon, label: t('sidebar.shippingOptimizer') },
                { to: '/tools/monthly-pnl', icon: ChartBarIcon, label: t('sidebar.monthlyPnL') },
                { to: '/tools/clv-calculator', icon: UserGroupIcon, label: t('sidebar.clvCalculator') },
                { to: '/tools/upsell-planner', icon: ArrowTrendingUpIcon, label: t('sidebar.upsellPlanner') },
                { to: '/tools/refund-rate', icon: ShieldExclamationIcon, label: t('sidebar.refundRateCalculator') },
            ],
            // 🔒 إخفاء القسم للمسوقين أو إذا كان غير مفعل
            hidden: user?.role === 'AFFILIATE' || !isAnyAppActive(['facebook-ads-pro', 'crm-basic'])
        },


        // 5️⃣.5 تحليل المنافسين
        {
            id: 'competitors',
            title: t('sidebar.competitors'),
            icon: ArrowTrendingUpIcon,
            items: [
                { to: '/competitors', icon: ArrowTrendingUpIcon, label: t('sidebar.competitors') },
                { to: '/competitors/gap-analysis', icon: PresentationChartLineIcon, label: t('sidebar.gapAnalysis') },
                { to: '/competitors/reports', icon: ClipboardDocumentListIcon, label: t('sidebar.competitorReports') },
                { to: '/competitors/settings', icon: Cog6ToothIcon, label: t('sidebar.competitorSettings') },
            ],
            hidden: user?.role === 'AFFILIATE' || !isAppActive('competitor-analysis')
        },

        // 6️⃣ حسابي (للموظف)
        {
            id: 'my-account',
            title: t('sidebar.myAccountSection'),
            icon: UserCircleIcon,
            items: [
                { to: '/my-dashboard', icon: ChartBarIcon, label: t('sidebar.myDashboard') },
                { to: '/my-attendance', icon: ClockIcon, label: t('sidebar.attendance'), hidden: !isAnyAppActive(['hr-attendance-pro', 'hr-basic']) },
                { to: '/my-leaves', icon: CalendarIcon, label: t('sidebar.myLeaves'), hidden: !isAnyAppActive(['hr-attendance-pro', 'hr-basic']) },
                { to: '/my-permissions', icon: ClockIcon, label: t('sidebar.myPermissions'), hidden: !isAnyAppActive(['hr-attendance-pro', 'hr-basic']) },
                { to: '/my-payroll', icon: BanknotesIcon, label: t('sidebar.myPayroll'), hidden: !isAnyAppActive(['hr-payroll', 'hr-basic']) },
                { to: '/my-deductions', icon: BanknotesIcon, label: t('sidebar.myDeductions'), hidden: !isAnyAppActive(['hr-payroll', 'hr-basic']) },
                { to: '/my-warnings', icon: ExclamationTriangleIcon, label: t('sidebar.warnings'), hidden: !isAppActive('hr-basic') },
                { to: '/my-promotions', icon: ArrowTrendingUpIcon, label: t('sidebar.myPromotions'), hidden: !isAppActive('hr-basic') },
                { to: '/my-rewards', icon: TrophyIcon, label: t('sidebar.myRewards'), hidden: !isAnyAppActive(['hr-assets', 'hr-basic']) },
                { to: '/my-training', icon: AcademicCapIcon, label: t('sidebar.myTraining'), hidden: !isAnyAppActive(['hr-assets', 'hr-basic']) },
                { to: '/my-custody', icon: ComputerDesktopIcon, label: t('sidebar.myCustody'), hidden: !isAnyAppActive(['hr-assets', 'hr-basic']) },
                { to: '/my-feedback', icon: DocumentTextIcon, label: t('sidebar.mySuggestions'), hidden: !isAppActive('hr-basic') },
                { to: '/my-resignation', icon: DocumentTextIcon, label: t('sidebar.myResignation'), hidden: !isAppActive('hr-basic') },
                { to: '/my-advances', icon: BanknotesIcon, label: t('sidebar.myAdvances'), hidden: !isAnyAppActive(['hr-payroll', 'hr-basic']) },
                { to: '/profile', icon: UserCircleIcon, label: t('sidebar.myProfile') },
                { to: '/my-activity', icon: ClipboardDocumentListIcon, label: t('sidebar.myActivity') },
            ]
        },

        // 6️⃣.5 الشركة (مدمج: شركاتي + إدارة الشركة + القانونية)
        ...(['OWNER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') ? [{
            id: 'company',
            title: t('sidebar.companyManagementSection'),
            icon: BuildingOfficeIcon,
            items: [
                { to: '/my-companies/hr', icon: ChartBarIcon, label: t('sidebar.companiesDashboard'), hidden: !isAppActive('store') },
                { to: '/my-companies/links', icon: BuildingOfficeIcon, label: t('sidebar.companyLinks') },
                { to: '/my-companies/reports', icon: PresentationChartLineIcon, label: t('sidebar.unifiedReports'), hidden: !isAppActive('store') },
                { to: '/my-companies/attendance', icon: CheckCircleIcon, label: t('sidebar.attendanceReport'), hidden: !isAppActive('hr-basic') },
                { to: '/users', icon: UserGroupIcon, label: t('sidebar.usersManagement') },
                { to: '/settings/company', icon: Cog6ToothIcon, label: t('sidebar.companySettings') },
                { to: '/company/activity', icon: ChartBarIcon, label: t('sidebar.companyActivity') },
                { to: '/roles', icon: KeyIcon, label: t('sidebar.rolesManagement') },
            ]
        }] : []),

        // 7️⃣ الموارد البشرية (للإدارة)
        ...(['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'].includes(user?.role || '') ? [{
            id: 'hr',
            title: t('sidebar.hrSection'),
            icon: UserGroupIcon,
            items: [
                { to: '/hr', icon: ChartBarIcon, label: t('sidebar.hrDashboard') },
                { to: '/hr/employees', icon: UsersIcon, label: t('sidebar.employees') },
                { to: '/hr/departments', icon: BuildingOfficeIcon, label: t('sidebar.departments') },
                { to: '/hr/attendance', icon: CheckCircleIcon, label: t('sidebar.attendance') },
                { to: '/hr/leaves', icon: CalendarIcon, label: t('sidebar.leaves') },
                { to: '/hr/permissions', icon: ClockIcon, label: t('sidebar.permissions') },
                { to: '/hr/shifts', icon: CalendarIcon, label: t('sidebar.shifts') },
                { to: '/hr/payroll', icon: BanknotesIcon, label: t('sidebar.payroll') },
                { to: '/hr/salary-updates', icon: BanknotesIcon, label: t('sidebar.salaryUpdates') },
                { to: '/hr/salary-history', icon: ClipboardDocumentListIcon, label: t('sidebar.salaryHistory') },
                { to: '/hr/deductions', icon: BanknotesIcon, label: t('sidebar.deductions') },
                { to: '/hr/benefits', icon: BanknotesIcon, label: t('sidebar.benefits') },
                { to: '/hr/performance-reviews', icon: ChartBarIcon, label: t('sidebar.performanceReviews') },
                { to: '/hr/training', icon: CheckCircleIcon, label: t('sidebar.training') },
                { to: '/hr/feedback', icon: DocumentTextIcon, label: t('sidebar.feedback') },
                { to: '/hr/warnings', icon: DocumentTextIcon, label: t('sidebar.warnings') },
                { to: '/hr/promotions', icon: ArrowTrendingUpIcon, label: t('sidebar.promotions') },
                { to: '/hr/resignations', icon: DocumentTextIcon, label: t('sidebar.resignations') },
                { to: '/hr/advances', icon: BanknotesIcon, label: t('sidebar.advances') },
                { to: '/hr/audit-logs', icon: ClipboardDocumentListIcon, label: t('sidebar.auditLogs') },
                { to: '/hr/company-policy', icon: DocumentTextIcon, label: t('sidebar.companyPolicy') },
                { to: '/hr/reports-hub', icon: DocumentTextIcon, label: t('sidebar.hrReports') },
                { to: '/hr/reporting/forms', icon: ClipboardDocumentListIcon, label: t('sidebar.reportingForms') },
                { to: '/hr/assets', icon: ComputerDesktopIcon, label: t('sidebar.assets') },
                { to: '/hr/recruitment', icon: UserGroupIcon, label: t('sidebar.recruitment') },
                { to: '/hr/settings', icon: Cog6ToothIcon, label: t('sidebar.hrSettings') },
                { to: '/whatsapp/templates?category=HR', icon: BellIcon, label: t('sidebar.whatsappNotifications') },
                { to: '/hr/rewards', icon: StarIcon, label: t('sidebar.rewards.title') },
            ],
            // 🔒 إخفاء إذا كان غير مفعل
            hidden: !isAppActive('hr-basic')
        }] : []),

        // 7️⃣.5 المواعيد
        {
            id: 'appointments',
            title: t('sidebar.appointments'),
            icon: CalendarIcon,
            hidden: !isAppActive('booking-app'),
            items: [
                { to: '/appointments', icon: CalendarIcon, label: t('sidebar.appointments') },
            ]
        },

        // 7️⃣.5️⃣ النظام الطبي
        {
            id: 'medical-center',
            title: t('sidebar.medicalCenter'),
            icon: HeartIcon,
            hidden: !isAppActive('medical-system'),
            items: [
                { to: '/admin/booking/dashboard', icon: ChartBarIcon, label: t('sidebar.bookingDashboard') },
                { to: '/admin/booking/appointments', icon: CalendarIcon, label: t('sidebar.bookingAppointments') },
                { to: '/admin/booking/calendar', icon: CalendarDaysIcon, label: t('sidebar.bookingCalendar') },
                { to: '/admin/booking/branches', icon: BuildingOffice2Icon, label: t('sidebar.bookingBranches') },
                { to: '/admin/booking/doctors', icon: UserGroupIcon, label: t('sidebar.bookingDoctors') },
                { to: '/admin/booking/services', icon: WrenchScrewdriverIcon, label: t('sidebar.bookingServices') },
            ]
        },

        // 7️⃣.7️⃣ النظام التعليمي
        {
            id: 'education',
            title: t('sidebar.educationModule'),
            icon: AcademicCapIcon,
            hidden: !isAppActive('education-app'),
            items: [
                { to: '/admin/education/dashboard', icon: ChartBarIcon, label: t('sidebar.educationDashboard') },
                { to: '/admin/education/subjects', icon: BookOpenIcon, label: t('sidebar.educationSubjects') },
                { to: '/admin/education/packages', icon: GiftIcon, label: t('sidebar.educationPackages') },
                { to: '/admin/education/students', icon: UserGroupIcon, label: t('sidebar.educationStudents') },
                { to: '/admin/education/teachers', icon: UsersIcon, label: t('sidebar.educationTeachers') },
                { to: '/admin/education/teacher-schedule', icon: CalendarDaysIcon, label: t('sidebar.educationTeacherSchedule') },
                { to: '/admin/education/teacher-payments', icon: CurrencyDollarIcon, label: t('sidebar.educationTeacherPayments') },
                { to: '/admin/education/sessions', icon: ClockIcon, label: t('sidebar.educationSessions') },
                { to: '/admin/education/calendar', icon: CalendarDaysIcon, label: t('sidebar.educationCalendar') },
                { to: '/admin/education/funnel', icon: MegaphoneIcon, label: t('sidebar.educationFunnel') },
            ]
        },

        // 7️⃣.8️⃣ نظام الفنادق
        {
            id: 'hotel',
            title: t('sidebar.hotelModule'),
            icon: BuildingOffice2Icon,
            items: [
                { to: '/admin/hotel', icon: BuildingOffice2Icon, label: t('sidebar.hotelDashboard') },
            ]
        },

        // 8️⃣ نماذج التسجيل
        {
            id: 'forms',
            title: t('sidebar.formsBuilder'),
            icon: DocumentTextIcon,
            hidden: !isAppActive('forms-app'),
            items: [
                { to: '/admin/forms', icon: DocumentTextIcon, label: t('sidebar.forms') },
            ]
        },

        // 9️⃣ إدارة المهام
        {
            id: 'tasks',
            title: t('sidebar.tasksWorkspace'),
            icon: CheckCircleIcon,
            hidden: !isAppActive('business-tools'),
            items: [
                {
                    to: '/tasks',
                    icon: CheckCircleIcon,
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

        // 9️⃣ التقارير والتحليلات
        {
            id: 'analytics',
            title: t('sidebar.analyticsSection'),
            icon: PresentationChartLineIcon,
            items: [
                { to: '/reports', icon: ChartBarIcon, label: t('sidebar.reports') },
                { to: '/analytics', icon: PresentationChartLineIcon, label: t('sidebar.advancedAnalytics') },
            ],
            // 🔒 إخفاء إذا كان غير مفعل
            hidden: !isAnyAppActive(['analytics-advanced', 'analytics-basic'])
        },

        // 1️⃣1️⃣ التطبيقات والفواتير
        {
            id: 'marketplace',
            title: t('sidebar.marketplace'),
            icon: CubeIcon,
            items: [
                { to: '/marketplace', icon: CubeIcon, label: t('sidebar.browseApps') },
                { to: '/marketplace/themes', icon: SwatchIcon, label: t('sidebar.storeThemes') },
                { to: '/marketplace/bundles', icon: GiftIcon, label: t('sidebar.browseBundles') },
                { to: '/payments', icon: WalletIcon, label: t('sidebar.myPayments') },
            ],
            // 🔒 إخفاء القسم للمسوقين
            hidden: user?.role === 'AFFILIATE'
        },

        // 1️⃣2️⃣ الإشعارات والأدوات
        {
            id: 'notifications',
            title: t('sidebar.notificationsSection'),
            icon: BellIcon,
            items: [
                { to: '/notifications', icon: BellIcon, label: t('sidebar.notifications') },
                { to: '/reminders', icon: BellAlertIcon, label: t('sidebar.reminders') },
                { to: '/notification-settings', icon: CogIcon, label: t('sidebar.notificationSettings') },
            ],
            hidden: !isAnyAppActive(['notification-automation'])
        },

        // 1️⃣4️⃣ الإعدادات (قسم موحد)
        {
            id: 'settings',
            title: t('sidebar.settingsSection'),
            icon: Cog6ToothIcon,
            items: [
                { to: '/settings', icon: CogIcon, label: t('sidebar.settings') },
                { to: '/settings/profile', icon: UserCircleIcon, label: t('sidebar.profileSettings') },
                { to: '/settings/security', icon: ShieldCheckIcon, label: t('sidebar.securitySettings') },
                { to: '/settings/appearance', icon: PaintBrushIcon, label: t('sidebar.appearanceSettings') },
                { to: '/settings/sidebar', icon: QueueListIcon, label: t('sidebar.sidebarSettings') },
            ]
        },

        // 1️⃣5️⃣ إدارة النظام (للسوبر أدمن)
        ...(user?.role === 'SUPER_ADMIN' ? [{
            id: 'system',
            title: t('sidebar.systemManagementSection'),
            icon: BuildingOfficeIcon,
            items: [
                { to: '/companies', icon: BuildingOfficeIcon, label: t('sidebar.companiesManagement') },
                { to: '/super-admin/queue-monitor', icon: QueueListIcon, label: t('sidebar.systemMonitoring') }, // BullMQ Monitor
                { to: '/super-admin/db-migration', icon: WrenchScrewdriverIcon, label: t('sidebar.dbMigration') },
                { to: '/super-admin/billing-overview', icon: BanknotesIcon, label: t('sidebar.billingOverview') },

                { to: '/super-admin/marketplace-management', icon: CubeIcon, label: t('sidebar.marketplaceManagement') },
                { to: '/super-admin/storefront-themes', icon: SwatchIcon, label: t('sidebar.storeThemePricing') },
                { to: '/super-admin/marketing-links', icon: MegaphoneIcon, label: t('sidebar.marketingLinks') },
                { to: '/super-admin/homepage-templates', icon: ComputerDesktopIcon, label: t('sidebar.homepageTemplates') },
                { to: '/super-admin/new-section', icon: SparklesIcon, label: t('sidebar.productStudio') },
                { to: '/settings/store', icon: SwatchIcon, label: t('sidebar.shopStudio') },
                { to: '/settings/store', icon: SwatchIcon, label: t('sidebar.shopTemplates') },
                { to: '/super-admin/premium-product-demo', icon: SparklesIcon, label: t('sidebar.premiumDemo') },
                { to: '/super-admin/partner-management', icon: UserGroupIcon, label: t('sidebar.partnerManagement') },
                { to: '/super-admin/dev-leaderboard', icon: ChartBarIcon, label: t('sidebar.devLeaderboard') },
            ]
        }] : []),


    ];

    // Apply dynamic sidebar management overrides (from DB settings + user settings)
    return applySidebarOverrides(sidebarConfig, sidebarManagementData, user?.role, userSidebarSettings, user);
};
