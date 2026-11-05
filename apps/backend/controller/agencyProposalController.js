const crypto = require('crypto');
const { getSharedPrismaClient } = require('../services/sharedDatabase');

function parseAgencyData(settingsRaw) {
    if (!settingsRaw) return { clients: [], approvals: [], proposals: [], settings: {} };
    let parsed = {};
    try {
        parsed = typeof settingsRaw === 'string' ? JSON.parse(settingsRaw) : settingsRaw;
    } catch (e) {
        parsed = {};
    }
    const agencyData = parsed.agencyData || {};
    return {
        clients: Array.isArray(agencyData.clients) ? agencyData.clients : [],
        approvals: Array.isArray(agencyData.approvals) ? agencyData.approvals : [],
        proposals: Array.isArray(agencyData.proposals) ? agencyData.proposals : [],
        settings: agencyData.settings || {},
    };
}

async function saveAgencyData(prisma, companyId, agencyData) {
    const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { settings: true },
    });
    let currentSettings = {};
    try {
        currentSettings = typeof company?.settings === 'string' ? JSON.parse(company.settings) : (company?.settings || {});
    } catch (e) {
        currentSettings = {};
    }
    currentSettings.agencyData = agencyData;
    await prisma.company.update({
        where: { id: companyId },
        data: {
            settings: JSON.stringify(currentSettings),
        },
    });
}

// Pre-packaged CodeTreps Strategy Template
function createCodeTrepsTemplate(companyId) {
    const id = `prop_codetreps_${Date.now()}`;
    const shareToken = crypto.randomBytes(12).toString('hex');
    return {
        id,
        shareToken,
        slug: 'codetreps-growth-os',
        clientName: 'CodeTreps (كود تريبس)',
        clientBrand: 'CodeTreps Kids Academy',
        contactPerson: 'م. باسم فخري & م. فراس السويركي',
        phone: '01507766462',
        email: 'info@codetreps.com',
        website: 'https://codetreps.com',
        facebookUrl: 'https://www.facebook.com/codetreps',
        industry: 'أكاديميات تعليمية وتدريب أطفال (EdTech & Kids Academy)',
        title: 'خطة تشغيل ونمو أكاديمية كود تريبس (CodeTreps Academy OS & Growth Plan)',
        executiveSummary: 'خطة استراتيجية متكاملة لتحويل كود تريبس من إدارة يدوية تستنزف الوقت إلى نظام تشغيل ذكي يدمج بين حجز ورش العمل المؤتمتة، بوابة متابعة أولياء الأمور، وإدارة الحملات الإعلانية الموجهة لأولياء الأمور في الإسكندرية لتحقيق أقصى عائد واستقرار مالي.',
        status: 'READY', // DRAFT, READY, SENT, VIEWED, ACCEPTED
        currency: 'ج.م',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        viewsCount: 0,
        lastViewedAt: null,
        acceptedAt: null,
        acceptedPackageId: null,
        acceptanceNotes: '',
        
        // Audit & Diagnosis (Current Leaky Bucket)
        auditItems: [
            {
                id: 'aud_1',
                title: 'صفحات معطلة وروابط 404 في الموقع الحالي',
                severity: 'HIGH', // HIGH, MEDIUM, LOW
                finding: 'صفحات هامة مثل (What We Offer) والأسئلة الشائعة (FAQ) تظهر خطأ 404 Not Found مما يفقد ثقة ولي الأمر عند زيارة الموقع.',
                impact: 'خسارة أكثر من 30% من الزوار المهتمين قبل اتخاذ قرار الحجز.',
                solution: 'استبدال المسار بصفحات هبوط سريعة مهيأة للموبايل على MaxP تعرض المسارات الثلاثة (Coding, Business, Presentation) بشكل تفاعلي.'
            },
            {
                id: 'aud_2',
                title: 'نموذج التسجيل التقليدي واستنزاف الوقت في الاتصالات',
                severity: 'HIGH',
                finding: 'الاعتماد على فورم Request a Callback يدوي يجبر الإدارة على الاتصال بكل ولي أمر لتحديد الموعد والفرع وسن الطفل.',
                impact: 'تأخر الردود وتشتت البيانات وارتفاع معدل التغيب (No-show rate) لأكثر من 50%.',
                solution: 'تفعيل وكيل استقبال واتساب آلي (Parent Intake Agent) يسأل الأسئلة الـ 3 الأساسية ويحجز موعد جلسة التقييم فورياً برمز حجز رسمي.'
            },
            {
                id: 'aud_3',
                title: 'غياب بوابة متابعة رقمية لأولياء الأمور (Parent Portal)',
                severity: 'MEDIUM',
                finding: 'لا توجد شاشة لولي الأمر لمتابعة حضور وغياب طفله ومشاريعه البرمجية وتقييم المدرب الدوري.',
                impact: 'انخفاض معدل تجديد الاشتراكات (Retention Rate) بعد انتهاء المستوى الأول.',
                solution: 'توفير بوابة أولياء أمور بالاسم والشعار تظهر تقارير الإنجاز وتزيد فخر الأهل ورغبتهم في إكمال باقي المستويات.'
            },
            {
                id: 'aud_4',
                title: 'الدفع النقدي العشوائي وغياب الفواتير الآلية',
                severity: 'MEDIUM',
                finding: 'تحصيل الرسوم في المقر نقداً أو بتحويلات فودافون كاش دون فواتير إلكترونية وسندات استلام متزامنة.',
                impact: 'صعوبة حساب صافي الربح الشهري الحقيقي ومتابعة المتأخرات بدقة.',
                solution: 'ربط بوابات الدفع الإلكترونية (انستاباي، فيزا، ميزة) مع إصدار فواتير آلية وإشعارات تجديد دورية.'
            }
        ],

        // Proposed Solution Modules
        solutionModules: [
            {
                id: 'sol_1',
                category: 'نظام التشغيل (Platform OS)',
                title: 'بوابة كود تريبس الرقمية ونظام حجز جلسات التقييم',
                description: 'صفحة حجز سريعة لاختبارات تحديد المستوى المجانية والورش التفاعلية للأطفال من 7-14 سنة مع خريطة المقر بالإسكندرية.'
            },
            {
                id: 'sol_2',
                category: 'الذكاء الاصطناعي (AI Automation)',
                title: 'وكيل تأهيل أولياء الأمور وتأكيد الحضور (Intake & Show-up Agents)',
                description: 'تأكيد الحجز آلياً عبر واتساب، إرسال الموقع وفيديو تعريفي، وتذكيرات قبل الموعد بـ 24 ساعة و ساعتين بنظام تأكيد الحضور بنقرة زر.'
            },
            {
                id: 'sol_3',
                category: 'إدارة وتطوير التعليم (Academics & Retention)',
                title: 'بوابة أولياء الأمور وتقارير تقدم الطلاب الدورية',
                description: 'توليد تقارير إنجاز أسبوعية فخمة للطفل وإرسالها للأهالي لمضاعفة ولاء أولياء الأمور والتوصيات الشفهية.'
            },
            {
                id: 'sol_4',
                category: 'التسويق ونمو المبيعات (Growth Marketing)',
                title: 'إدارة الحملات الإعلانية المركزة (Hyper-local Meta Ads)',
                description: 'استهداف أولياء الأمور فئات A & B في أحياء الإسكندرية (فؤاد، سموحة، رشدي، لوران، كفر عبده) بزوايا إعلانية نفسية وفيديوهات واقعية.'
            }
        ],

        // Interactive Funnel Parameters
        funnelConfig: {
            defaultBudget: 15000,
            minBudget: 5000,
            maxBudget: 60000,
            stepBudget: 2500,
            costPerClick: 6.5, // Realistic Alexandria Class A/B Meta CPC (EGP)
            leadConversionRate: 0.045, // 4.5% conversion to qualified trial booking
            showUpRate: 0.60, // 60% show-up to physical session in Alexandria Fouad branch with WhatsApp Show-up Agent
            enrollmentRate: 0.35, // 35% of attendees enroll into paid courses
            averageCoursePrice: 2200, // EGP per level / month
            studentLtvMonths: 4, // Average student stays for 4 levels
            monthlyRetentionRate: 0.85
        },

        // 14-Day Execution Timeline
        timeline: [
            {
                phase: 'المرحلة 1: التأسيس والتجهيز التقني',
                days: 'الأيام 1 – 3',
                tasks: [
                    'إعداد مسار كود تريبس على منصة MaxP وإصلاح الروابط المعطلة.',
                    'ربط تتبع Meta CAPI وتيك توك بيكسل بدقة كاملة.',
                    'تجهيز صفحة حجز جلسة التقييم والورشة الاستكشافية المجانية.'
                ]
            },
            {
                phase: 'المرحلة 2: تفعيل الأتمتة وواتساب الأكاديمية',
                days: 'الأيام 4 – 6',
                tasks: [
                    'ربط رقم واتساب الأكاديمية الرسمي وتفعيل بوت الاستقبال الذكي.',
                    'ضبط مسار التذكير التلقائي (24h و 2h) مع لوكيشن فؤاد وزر تأكيد الحضور.',
                    'تدريب فريق الاستقبال والمبيعات على استقبال الحجوزات وإصدار الفواتير.'
                ]
            },
            {
                phase: 'المرحلة 3: إطلاق حملة الاستقطاب الأولى',
                days: 'الأيام 7 – 10',
                tasks: [
                    'إطلاق الإعلانات الممولة في الإسكندرية بزوايا (صناعة الألعاب vs إدمان الموبايل، ومهارات الإلقاء).',
                    'مراقبة أول 30 إلى 50 حجز جلسة تقييم وتدفق أولياء الأمور للمقر.'
                ]
            },
            {
                phase: 'المرحلة 4: إغلاق الاشتراكات والتقارير الأسبوعية',
                days: 'الأيام 11 – 14',
                tasks: [
                    'قياس نسبة الحضور الفعلي ونسبة تحويلهم لاشتراكات مدفوعة.',
                    'تفعيل بوابة أولياء الأمور لإصدار أول تقارير أداء للطلاب الجدد.',
                    'استخراج تقرير العائد المالي الصافي ومراجعة خطة التوسع للشهر القادم.'
                ]
            }
        ],

        // Packages / Pricing Options
        packages: [
            {
                id: 'pkg_growth',
                name: 'باقة إدارة النمو والتسويق (Growth Marketing)',
                tagline: 'الأفضل لملء المجموعات التدريبية وضخ أولياء أمور جدد للمقر',
                price: 7500,
                period: 'شهرياً',
                isPopular: false,
                features: [
                    'إدارة الحملات الإعلانية على فيسبوك وإنستجرام بالكامل',
                    'صياغة الزوايا الإعلانية وسيناريوهات الفيديوهات للأطفال',
                    'ربط التتبع المتقدم Meta CAPI لمنع فقدان البيانات',
                    'صفحة هبوط سريعة لحجز جلسات التقييم وتحديد المستوى',
                    'تقرير أداء أسبوعي موضح به تكلفة الليد والعائد المالي'
                ]
            },
            {
                id: 'pkg_full_os',
                name: 'باقة نظام التشغيل الكامل + إدارة النمو (Full Academy OS)',
                tagline: 'الحل الشامل لأتمتة الأكاديمية وتوفير 80% من المجهود الإداري ومضاعفة الإيرادات',
                price: 12500,
                period: 'شهرياً',
                isPopular: true,
                features: [
                    'كل ميزات باقة إدارة النمو والتسويق',
                    'تفعيل وكلاء الذكاء الاصطناعي (Intake Agent + Show-up Agent على واتساب)',
                    'بوابة متابعة أولياء الأمور وتقارير أداء الطلاب الدورية',
                    'نظام إصدار الفواتير وسندات القبض وبوابات الدفع الإلكتروني',
                    'صندوق الرسائل الموحد (Omnichannel Inbox) لكل محادثات الأكاديمية',
                    'شاشة مراقبة الأرباح الصافية ومتابعة تجديد الاشتراكات (MRR)',
                    'دعم فني واستشاري مخصص ذو أولوية طوال الشهر'
                ]
            }
        ]
    };
}

module.exports = {
    // List all proposals for current agency
    getProposals: async (req, res) => {
        try {
            const companyId = req.user?.companyId;
            const prisma = getSharedPrismaClient();
            let company = null;
            try {
                company = await prisma.company.findUnique({
                    where: { id: companyId },
                    select: { settings: true, name: true, logo: true, slug: true, customDomain: true },
                });
            } catch (e) {
                console.warn('⚠️ [AGENCY PROPOSAL] DB findUnique company failed:', e.message);
            }

            const agencyData = parseAgencyData(company?.settings);
            const subdomain = company?.slug || 'h2m';

            // Auto-seed CodeTreps if proposals is empty for current company
            if (!agencyData.proposals || agencyData.proposals.length === 0) {
                const autoTemplate = createCodeTrepsTemplate(companyId || 'h2m');
                agencyData.proposals = [autoTemplate];
                if (companyId) {
                    saveAgencyData(prisma, companyId, agencyData).catch(e => console.warn('Could not auto-save template:', e.message));
                }
            }
            
            return res.json({
                success: true,
                data: {
                    proposals: agencyData.proposals || [],
                    totalCount: (agencyData.proposals || []).length,
                    agencyInfo: {
                        name: company?.name || 'H2M Media Agency',
                        logo: company?.logo || null,
                        subdomain,
                        customDomain: company?.customDomain || null,
                    }
                }
            });
        } catch (error) {
            console.error('Error fetching proposals:', error);
            return res.status(500).json({ success: false, message: 'فشل جلب العروض والخطط', error: error.message });
        }
    },

    // Create a new proposal
    createProposal: async (req, res) => {
        try {
            const companyId = req.user?.companyId;
            const prisma = getSharedPrismaClient();
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { settings: true },
            });
            const agencyData = parseAgencyData(company?.settings);

            const payload = req.body || {};
            const id = payload.id || `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const shareToken = payload.shareToken || crypto.randomBytes(12).toString('hex');
            const slug = (payload.slug || payload.clientName || 'proposal')
                .toLowerCase()
                .trim()
                .replace(/[\s\W-]+/g, '-')
                .replace(/^-+|-+$/g, '') || `proposal-${Date.now()}`;

            const newProposal = {
                ...payload,
                id,
                shareToken,
                slug,
                companyId,
                status: payload.status || 'READY',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                viewsCount: 0,
                lastViewedAt: null,
            };

            agencyData.proposals = [newProposal, ...(agencyData.proposals || [])];
            await saveAgencyData(prisma, companyId, agencyData);

            return res.status(201).json({
                success: true,
                message: 'تم إنشاء الخطة بنجاح',
                data: newProposal,
            });
        } catch (error) {
            console.error('Error creating proposal:', error);
            return res.status(500).json({ success: false, message: 'فشل إنشاء الخطة', error: error.message });
        }
    },

    // Seed/Generate CodeTreps specific proposal
    generateCodeTrepsProposal: async (req, res) => {
        try {
            const companyId = req.user?.companyId;
            const prisma = getSharedPrismaClient();
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { settings: true },
            });
            const agencyData = parseAgencyData(company?.settings);

            // Check if already exists
            const existing = (agencyData.proposals || []).find(p => p.slug === 'codetreps-growth-os' || p.clientName?.includes('CodeTreps'));
            if (existing) {
                return res.json({
                    success: true,
                    message: 'خطة CodeTreps موجودة بالفعل!',
                    data: existing,
                });
            }

            const template = createCodeTrepsTemplate(companyId);
            agencyData.proposals = [template, ...(agencyData.proposals || [])];
            await saveAgencyData(prisma, companyId, agencyData);

            return res.status(201).json({
                success: true,
                message: 'تم توليد خطة كود تريبس التفاعلية بنجاح وبكافة الأرقام والمحاور التشغيلية',
                data: template,
            });
        } catch (error) {
            console.error('Error generating CodeTreps proposal:', error);
            return res.status(500).json({ success: false, message: 'فشل توليد خطة كود تريبس', error: error.message });
        }
    },

    // Get single proposal for edit
    getProposal: async (req, res) => {
        try {
            const companyId = req.user?.companyId;
            const { proposalId } = req.params;
            const prisma = getSharedPrismaClient();
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { settings: true },
            });
            const agencyData = parseAgencyData(company?.settings);
            const proposal = (agencyData.proposals || []).find(p => p.id === proposalId);

            if (!proposal) {
                return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
            }

            return res.json({ success: true, data: proposal });
        } catch (error) {
            console.error('Error getting proposal:', error);
            return res.status(500).json({ success: false, message: 'فشل جلب تفاصيل الخطة', error: error.message });
        }
    },

    // Update proposal
    updateProposal: async (req, res) => {
        try {
            const companyId = req.user?.companyId;
            const { proposalId } = req.params;
            const prisma = getSharedPrismaClient();
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { settings: true },
            });
            const agencyData = parseAgencyData(company?.settings);
            const index = (agencyData.proposals || []).findIndex(p => p.id === proposalId);

            if (index === -1) {
                return res.status(404).json({ success: false, message: 'الخطة غير موجودة' });
            }

            const updated = {
                ...agencyData.proposals[index],
                ...req.body,
                id: proposalId,
                updatedAt: new Date().toISOString(),
            };

            agencyData.proposals[index] = updated;
            await saveAgencyData(prisma, companyId, agencyData);

            return res.json({ success: true, message: 'تم تحديث الخطة بنجاح', data: updated });
        } catch (error) {
            console.error('Error updating proposal:', error);
            return res.status(500).json({ success: false, message: 'فشل تحديث الخطة', error: error.message });
        }
    },

    // Delete proposal
    deleteProposal: async (req, res) => {
        try {
            const companyId = req.user?.companyId;
            const { proposalId } = req.params;
            const prisma = getSharedPrismaClient();
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { settings: true },
            });
            const agencyData = parseAgencyData(company?.settings);

            agencyData.proposals = (agencyData.proposals || []).filter(p => p.id !== proposalId);
            await saveAgencyData(prisma, companyId, agencyData);

            return res.json({ success: true, message: 'تم حذف الخطة بنجاح' });
        } catch (error) {
            console.error('Error deleting proposal:', error);
            return res.status(500).json({ success: false, message: 'فشل حذف الخطة', error: error.message });
        }
    },

    // PUBLIC: Get proposal by slug or shareToken (No Auth Needed)
    getPublicProposal: async (req, res) => {
        try {
            const { slugOrToken } = req.params || {};
            const requestedSubdomain = req.company?.slug 
                || req.headers?.['x-company-subdomain'] 
                || req.headers?.['x-subdomain'] 
                || req.query?.subdomain 
                || req.query?.agency
                || null;

            let foundProposal = null;
            let agencyInfo = null;
            let matchedCompany = null;
            let prisma = null;

            try {
                prisma = getSharedPrismaClient();
            } catch (pErr) {
                console.warn('⚠️ [AGENCY PROPOSAL] DB client offline:', pErr.message);
            }

            // 1. Resolve company by subdomain first if available (e.g. h2m, h2m-1)
            if (req.company) {
                matchedCompany = req.company;
            } else if (requestedSubdomain && prisma) {
                try {
                    matchedCompany = await prisma.company.findFirst({
                        where: {
                            OR: [
                                { slug: { equals: requestedSubdomain, mode: 'insensitive' } },
                                { slug: { startsWith: requestedSubdomain, mode: 'insensitive' } },
                                { name: { contains: requestedSubdomain, mode: 'insensitive' } },
                            ],
                            isActive: true,
                        },
                        select: { id: true, name: true, logo: true, slug: true, settings: true, customDomain: true },
                    });
                } catch (e) {
                    console.warn('⚠️ [AGENCY PROPOSAL] DB find company by subdomain failed:', e.message);
                }
            }

            // 2. If matched company, check its proposals
            if (matchedCompany) {
                const agencyData = parseAgencyData(matchedCompany.settings);
                let match = (agencyData.proposals || []).find(
                    p => p.shareToken === slugOrToken || p.slug === slugOrToken || p.id === slugOrToken
                );

                // Auto-seed CodeTreps if requested and not yet saved in this company
                if (!match && (slugOrToken === 'codetreps-growth-os' || slugOrToken.includes('codetreps'))) {
                    match = createCodeTrepsTemplate(matchedCompany.id);
                    agencyData.proposals = [match, ...(agencyData.proposals || [])];
                    if (prisma) {
                        saveAgencyData(prisma, matchedCompany.id, agencyData).catch(e => console.warn('Could not auto-save:', e.message));
                    }
                }

                if (match) {
                    foundProposal = match;
                    agencyInfo = {
                        name: matchedCompany.name || 'H2M Media Agency',
                        logo: matchedCompany.logo || null,
                        subdomain: matchedCompany.slug || requestedSubdomain || 'h2m',
                        customDomain: matchedCompany.customDomain || null,
                    };
                }
            }

            // 3. If still not found, search companies containing this slug/token
            if (!foundProposal && prisma) {
                let companies = [];
                try {
                    companies = await prisma.company.findMany({
                        where: {
                            settings: {
                                contains: slugOrToken,
                            },
                        },
                        select: { id: true, name: true, logo: true, slug: true, settings: true, customDomain: true },
                        take: 5,
                    });
                } catch (dbErr) {
                    console.warn('⚠️ [AGENCY PROPOSAL] DB search companies failed:', dbErr.message);
                }

                for (const comp of companies) {
                    const agencyData = parseAgencyData(comp.settings);
                    const match = (agencyData.proposals || []).find(
                        p => p.shareToken === slugOrToken || p.slug === slugOrToken || p.id === slugOrToken
                    );
                    if (match) {
                        foundProposal = match;
                        matchedCompany = comp;
                        agencyInfo = {
                            name: comp.name || 'H2M Media Agency',
                            logo: comp.logo || null,
                            subdomain: comp.slug || 'h2m',
                            customDomain: comp.customDomain || null,
                        };
                        break;
                    }
                }
            }

            // 4. Default fallback to H2M Media Agency if offline or demo
            if (!foundProposal && (slugOrToken === 'codetreps-growth-os' || slugOrToken.includes('codetreps'))) {
                foundProposal = createCodeTrepsTemplate('h2m-agency');
                agencyInfo = {
                    name: 'H2M Media Agency',
                    logo: null,
                    subdomain: requestedSubdomain || 'h2m',
                    customDomain: null,
                };
            }

            if (!foundProposal) {
                return res.status(404).json({ success: false, message: 'رابط الخطة غير موجود أو منتهي الصلاحية' });
            }

            // Track view count asynchronously if matched in DB
            if (matchedCompany && foundProposal && prisma) {
                try {
                    const agencyData = parseAgencyData(matchedCompany.settings);
                    const propIndex = (agencyData.proposals || []).findIndex(p => p.id === foundProposal.id);
                    if (propIndex !== -1) {
                        agencyData.proposals[propIndex].viewsCount = (agencyData.proposals[propIndex].viewsCount || 0) + 1;
                        agencyData.proposals[propIndex].lastViewedAt = new Date().toISOString();
                        if (agencyData.proposals[propIndex].status === 'SENT' || agencyData.proposals[propIndex].status === 'READY') {
                            agencyData.proposals[propIndex].status = 'VIEWED';
                        }
                        saveAgencyData(prisma, matchedCompany.id, agencyData).catch(e => console.warn('Could not save view track:', e.message));
                    }
                } catch (e) {
                    console.error('Error tracking proposal view:', e);
                }
            }

            return res.json({
                success: true,
                data: {
                    proposal: foundProposal,
                    agencyInfo,
                }
            });
        } catch (error) {
            console.error('Error fetching public proposal:', error);
            return res.status(500).json({ success: false, message: 'فشل تحميل الخطة التفاعلية', error: error.message });
        }
    },

    // PUBLIC: Accept proposal by client (No Auth Needed)
    acceptPublicProposal: async (req, res) => {
        try {
            const { slugOrToken } = req.params;
            const { packageId, clientNotes, contactName, contactPhone } = req.body || {};
            let companies = [];

            try {
                const prisma = getSharedPrismaClient();
                companies = await prisma.company.findMany({
                    where: {
                        settings: {
                            contains: slugOrToken,
                        },
                    },
                    select: { id: true, name: true, settings: true },
                    take: 5,
                });
            } catch (dbErr) {
                console.warn('⚠️ [AGENCY PROPOSAL] DB query skipped/offline in accept:', dbErr.message);
            }

            let matchedCompany = null;
            let foundProposal = null;

            for (const comp of companies) {
                const agencyData = parseAgencyData(comp.settings);
                const match = (agencyData.proposals || []).find(
                    p => p.shareToken === slugOrToken || p.slug === slugOrToken || p.id === slugOrToken
                );
                if (match) {
                    foundProposal = match;
                    matchedCompany = comp;
                    break;
                }
            }

            if (!matchedCompany || !foundProposal) {
                // If demo template, return simulated success
                return res.json({
                    success: true,
                    message: 'تم استلام اعتماد الخطة بنجاح وسيتم التواصل لتفعيل الحساب والبدء فوراً!',
                    data: { status: 'ACCEPTED', acceptedAt: new Date().toISOString() }
                });
            }

            const agencyData = parseAgencyData(matchedCompany.settings);
            const propIndex = agencyData.proposals.findIndex(p => p.id === foundProposal.id);

            if (propIndex !== -1) {
                agencyData.proposals[propIndex].status = 'ACCEPTED';
                agencyData.proposals[propIndex].acceptedAt = new Date().toISOString();
                agencyData.proposals[propIndex].acceptedPackageId = packageId || null;
                agencyData.proposals[propIndex].acceptanceNotes = clientNotes || '';
                agencyData.proposals[propIndex].acceptorContact = {
                    name: contactName || foundProposal.contactPerson || '',
                    phone: contactPhone || foundProposal.phone || '',
                };

                // Automatically onboard as an agency client if not already added!
                const existingClient = (agencyData.clients || []).find(
                    c => c.name.toLowerCase() === foundProposal.clientName.toLowerCase()
                );

                if (!existingClient) {
                    const selectedPkg = (foundProposal.packages || []).find(p => p.id === packageId) || foundProposal.packages?.[0];
                    const newClient = {
                        id: `cl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                        name: foundProposal.clientName,
                        contactPerson: contactName || foundProposal.contactPerson || '',
                        phone: contactPhone || foundProposal.phone || '',
                        email: foundProposal.email || '',
                        status: 'active',
                        pricingModel: 'RETAINER',
                        baseRetainer: selectedPkg?.price || 10000,
                        monthlyBudget: foundProposal.funnelConfig?.defaultBudget || 15000,
                        createdAt: new Date().toISOString(),
                        notes: `تم تحويله تلقائياً من الخطة التفاعلية: ${foundProposal.title} (الباقة: ${selectedPkg?.name || 'مخصصة'})`,
                    };
                    agencyData.clients = [newClient, ...(agencyData.clients || [])];
                }

                await saveAgencyData(prisma, matchedCompany.id, agencyData);
            }

            return res.json({
                success: true,
                message: 'تم اعتماد الخطة بنجاح! تم تسجيل طلبكم وسيقوم فريق العمل بالتواصل فوراً لبدء خطوات التفعيل.',
                data: {
                    status: 'ACCEPTED',
                    acceptedAt: new Date().toISOString(),
                }
            });
        } catch (error) {
            console.error('Error accepting public proposal:', error);
            return res.status(500).json({ success: false, message: 'فشل اعتماد الخطة', error: error.message });
        }
    }
};
