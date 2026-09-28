import axios from 'axios';
import { ExtensionAgent, TabContext, UserSession } from '../types/extension';
import { chromeStorage } from './chrome';

export const BUILTIN_AGENTS: ExtensionAgent[] = [
  {
    id: 'executive-assistant-agent',
    slug: 'executive-assistant-agent',
    name: 'ماكس — المساعد التنفيذي',
    role: 'EXECUTIVE_ASSISTANT',
    badge: 'المساعد التنفيذي',
    description: 'المتابعة التنفيذية الشاملة، مؤشرات الأداء، الأوردرات والمخزون، وتفويض المهام.',
    suggestedPrompts: [
      'أعطني ملخصاً تنفيذياً لحالة البيزنس والمبيعات اليوم',
      'ما هي أهم النواقص أو العمليات المعلقة التي تحتاج تدخلاً فوري؟',
      'فحص إعدادات المتجر وأدوات التحويل وطرق الدفع والشحن',
    ],
  },
  {
    id: 'support-agent',
    slug: 'support-agent',
    name: 'مساعد الدعم والاستفسارات',
    role: 'SUPPORT',
    badge: 'خدمة ودعم',
    description: 'الإجابة على استفسارات المنصة، حل المشاكل، وشرح الخطوات.',
    suggestedPrompts: [
      'كيف أضيف منتجاً جديداً بمتغيرات ومقاسات؟',
      'كيف أربط صفحة فيسبوك أو بيكسل الإعلانات؟',
      'ما هي خطوات إعداد بوليصة شحن بوسطة أو تيربو؟',
    ],
  },
  {
    id: 'order-confirmation-agent',
    slug: 'order-confirmation-agent',
    name: 'منى — تأكيد ومتابعة الطلبات',
    role: 'ORDER_CONFIRMATION',
    badge: 'الطلبات والشحن',
    description: 'متابعة أوردرات الدفع عند الاستلام COD ورفع نسب التسليم.',
    suggestedPrompts: [
      'عرض الأوردرات التي تحتاج لتأكيد فوري',
      'ما هو معدل تسليم الشحنات هذا الأسبوع؟',
      'افحص أرقام التتبع المعلقة مع شركة الشحن',
    ],
  },
  {
    id: 'inventory-pricing-agent',
    slug: 'inventory-pricing-agent',
    name: 'مساعد المخزون والتسعير',
    role: 'INVENTORY_PRICING',
    badge: 'المخزون والتسعير',
    description: 'مراقبة المستودعات، حساب هوامش الربح ونقاط التعادل.',
    suggestedPrompts: [
      'المنتجات التي تجاوزت حد إعادة الطلب',
      'حساب هامش الربح لمنتجات الفئة الرئيسية',
      'قائمة المنتجات الأكثر مبيعاً هذا الشهر',
    ],
  },
];

export const sendAgentMessage = async (
  prompt: string,
  options: {
    agentSlug?: string;
    tabContext?: TabContext | null;
  } = {}
): Promise<string> => {
  const settings = await chromeStorage.getSettings();
  const session = await chromeStorage.getSession();

  let serverUrl = settings.serverUrl.replace(/\/+$/, '');
  const agentSlug = options.agentSlug || settings.selectedAgentSlug;

  // Build contextual message
  let enrichedPrompt = prompt;
  if (options.tabContext && options.tabContext.url) {
    enrichedPrompt = `[سياق الصفحة الحالية المفتوحة في المتصفح:\nالعنوان: ${options.tabContext.title}\nالرابط: ${options.tabContext.url}]\n\n${prompt}`;
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }

  try {
    const response = await axios.post(
      `${serverUrl}/api/ai-agent-chat/message`,
      {
        message: enrichedPrompt,
        agentSlug: agentSlug,
      },
      {
        headers,
        timeout: 45000,
      }
    );

    const data = response.data;
    if (data?.reply) return data.reply;
    if (data?.message) return data.message;
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    const serverMessage = error.response?.data?.message || error.message;
    throw new Error(serverMessage || 'تعذر الاتصال بسيرفر MaxP');
  }
};

export const loginToMaxP = async (
  email: string,
  pass: string,
  serverUrl: string
): Promise<UserSession> => {
  const cleanUrl = serverUrl.replace(/\/+$/, '');
  const response = await axios.post(
    `${cleanUrl}/api/auth/login`,
    {
      email,
      password: pass,
    },
    { timeout: 15000 }
  );

  const data = response.data;
  if (!data?.token) {
    throw new Error('بيانات الدخول غير صحيحة أو لم يتم إرجاع رمز التوثيق');
  }

  const session: UserSession = {
    token: data.token,
    user: {
      id: data.user?.id || 'user_1',
      name: data.user?.name || email.split('@')[0],
      email: data.user?.email || email,
      role: data.user?.role || 'MERCHANT',
      companyId: data.user?.companyId,
    },
  };

  await chromeStorage.saveSession(session);
  return session;
};
