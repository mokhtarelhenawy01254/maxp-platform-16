import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuthSimple';
import type { ExecutiveContext, QuickPrompt } from './types';

export function useExecutiveContext(): {
  context: ExecutiveContext;
  quickPrompts: QuickPrompt[];
} {
  const location = useLocation();
  const { user } = useAuth();

  const currentCompany = useMemo(() => {
    return (user?.companies ?? []).find((c) => c.isCurrent) || user?.company;
  }, [user]);

  const activeApps = useMemo(() => {
    if (Array.isArray(currentCompany?.activeApps)) {
      return currentCompany.activeApps;
    }
    return [];
  }, [currentCompany]);

  const businessType = useMemo(() => {
    if (currentCompany?.businessSpecialty?.slug) {
      return currentCompany.businessSpecialty.slug;
    }
    try {
      const s = typeof user?.settings === 'string' ? JSON.parse(user.settings) : user?.settings;
      if (s?.businessType) return s.businessType;
    } catch {
      // ignore parse error
    }
    return 'general';
  }, [currentCompany, user]);

  const { entityId, entityType } = useMemo(() => {
    const p = location.pathname;
    const parts = p.split('/').filter(Boolean);

    if (p.startsWith('/orders/')) {
      return { entityId: parts[1] || null, entityType: 'order' };
    }
    if (p.startsWith('/products/')) {
      return { entityId: parts[1] || null, entityType: 'product' };
    }
    if (p.startsWith('/customers/')) {
      return { entityId: parts[1] || null, entityType: 'customer' };
    }
    if (p.startsWith('/marketing') || p.startsWith('/facebook-ads')) {
      return { entityId: null, entityType: 'campaign' };
    }
    if (p.startsWith('/inventory')) {
      return { entityId: null, entityType: 'inventory' };
    }
    if (p.startsWith('/dental-lab')) {
      return { entityId: parts[1] || null, entityType: 'dental_case' };
    }
    if (p.startsWith('/cafe') || p.startsWith('/restaurant')) {
      return { entityId: null, entityType: 'pos_shift' };
    }
    if (p.startsWith('/hr')) {
      return { entityId: null, entityType: 'hr_payroll' };
    }
    return { entityId: null, entityType: null };
  }, [location.pathname]);

  const context: ExecutiveContext = useMemo(() => {
    return {
      pathname: location.pathname,
      pageTitle: typeof document !== 'undefined' ? document.title : '',
      businessType,
      activeApps,
      entityId,
      entityType,
      userRole: user?.role || null,
      companyId: currentCompany?.id ? String(currentCompany.id) : null,
      companyName: currentCompany?.name || null,
      currency: currentCompany?.currency || 'EGP',
    };
  }, [location.pathname, businessType, activeApps, entityId, entityType, user?.role, currentCompany]);

  const quickPrompts: QuickPrompt[] = useMemo(() => {
    const p = location.pathname;

    if (p.startsWith('/orders')) {
      return [
        {
          id: 'orders-pending-cod',
          label: 'أوردرات COD المعلقة للتأكيد',
          prompt: 'لخص لي كل أوردرات الدفع عند الاستلام المعلقة اليوم والتي تحتاج تأكيد شحن فوري.',
        },
        {
          id: 'orders-yesterday-summary',
          label: 'ملخص طلبات الأمس والإيرادات',
          prompt: 'اعرض ملخصاً تفصيلياً لطلبات وإيرادات الأمس ونسبة التأكيد ومعدل الإلغاء.',
        },
        {
          id: 'orders-shipping-tracking',
          label: 'متابعة بوالص الشحن المتأخرة',
          prompt: 'افحص بوالص الشحن المتأخرة لدى شركات الشحن وقارن سرعة التوصيل.',
        },
      ];
    }

    if (p.startsWith('/products') || p.startsWith('/inventory')) {
      return [
        {
          id: 'inv-low-stock',
          label: 'نواقص المخزون الأكثر طلباً',
          prompt: 'ما هي المنتجات التي أوشكت على النفاد في المخزن وتؤثر مباشرة على المبيعات؟',
        },
        {
          id: 'inv-margins',
          label: 'فحص هوامش الربح ونقاط التعادل',
          prompt: 'احسب لي هوامش الربح ونقاط التعادل للمنتجات الأكثر حركة هذا الأسبوع.',
        },
        {
          id: 'prod-top-selling',
          label: 'المنتجات الأعلى مبيعاً',
          prompt: 'اعرض قائمة بأعلى 5 منتجات مبيعاً وأكثر الألوان والمقاسات طلباً.',
        },
      ];
    }

    if (p.startsWith('/marketing') || p.startsWith('/facebook-ads')) {
      return [
        {
          id: 'mkt-scale-kill',
          label: 'قرارات SCALE و KILL للحملات',
          prompt: 'افحص كل الحملات الإعلانية النشطة وقارن تكلفة الاكتساب CPA بهامش الربح واقترح قرارات SCALE أو KILL.',
        },
        {
          id: 'mkt-ad-angles',
          label: 'صياغة زوايا إعلانية للمنتج الرابح',
          prompt: 'اقترح 3 زوايا بيع وهوكات إعلانية جديدة للمنتج الأكثر مبيعاً في المتجر.',
        },
        {
          id: 'mkt-video-ideas',
          label: 'أفكار فيديو ريلز 9:16 مع Veo',
          prompt: 'اقترح سيناريو فيديو ترويجي 9:16 احترافي يصلح لتوليده بأداة Veo 3.1.',
        },
      ];
    }

    if (p.startsWith('/dental-lab')) {
      return [
        {
          id: 'dental-delayed-cases',
          label: 'الحالات المتأخرة في المعمل',
          prompt: 'افحص الحالات التي اقترب موعد تسليمها للأطباء وما زالت في مراحل التصنيع.',
        },
        {
          id: 'dental-today-delivery',
          label: 'تقرير تسليمات اليوم للأطباء',
          prompt: 'ما هي حالات التركيبات الجاهزة للتسليم للعيادات اليوم وقيمتها المالية؟',
        },
      ];
    }

    if (p.startsWith('/cafe') || p.startsWith('/restaurant')) {
      return [
        {
          id: 'pos-daily-sales',
          label: 'مبيعات الكاشير والشيفت الحالي',
          prompt: 'اعرض ملخص مبيعات نقطة البيع POS والطلبات المفتوحة وشيفت اليوم.',
        },
        {
          id: 'menu-popular',
          label: 'الأصناف الأكثر طلباً اليوم',
          prompt: 'ما هي الأصناف الأكثر طلباً في المنيو اليوم ونواقص الخامات في المطبخ؟',
        },
      ];
    }

    if (p.startsWith('/hr')) {
      return [
        {
          id: 'hr-attendance',
          label: 'تقرير حضور الموظفين اليوم',
          prompt: 'اعرض ملخص حضور وغياب وتأخيرات الموظفين المسجلة اليوم.',
        },
        {
          id: 'hr-payroll-summary',
          label: 'ملخص مسير الرواتب والسلف',
          prompt: 'اعرض مسودة إجمالي رواتب الشهر والسلفيات والخصومات المسجلة.',
        },
      ];
    }

    return [
      {
        id: 'gen-daily-pulse',
        label: 'ملخص أداء البيزنس اليوم',
        prompt: 'أعطني ملخصاً تنفيذياً سريعاً لأداء النشاط اليوم: المبيعات، الطلبات المعلقة، والمهام العاجلة.',
      },
      {
        id: 'gen-urgent-attention',
        label: 'مهام تحتاج تدخلي العاجل',
        prompt: 'ما هي أهم 3 أمور في النظام حالياً تحتاج تدخلي كصاحب بيزنس؟',
      },
      {
        id: 'gen-growth-advice',
        label: 'اقتراحات زيادة الإيراد',
        prompt: 'بناءً على أرقام وحركات المنشأة، ما أفضل خطوة تشغيلية لزيادة الإيراد هذا الأسبوع؟',
      },
    ];
  }, [location.pathname]);

  return { context, quickPrompts };
}
