export interface ExternalApiCredential {
  id: string;
  name: string;
  label: string | null;
  description: string | null;
  scopes: string[];
  allowedIps: string[];
  isActive: boolean;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  keyPrefixMasked: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  requestCount: number;
  expiresAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  companyId: string | null;
  companyName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalApiAuditLog {
  id: string;
  credentialId: string;
  credentialName: string;
  keyPrefixMasked: string;
  companyId: string | null;
  path: string;
  method: string;
  statusCode: number;
  ip: string | null;
  userAgent: string | null;
  responseTimeMs: number | null;
  createdAt: string;
}

export interface CreateCredentialInput {
  name: string;
  label?: string;
  description?: string;
  scopes: string[];
  expiresAt: string;
  allowedIps?: string;
  companyId?: string;
}

export interface TenantCompany {
  id: string;
  name: string;
  slug: string;
}

export const AVAILABLE_SCOPES: { value: string; label: string; description: string; isHighPrivilege?: boolean }[] = [
  {
    value: 'analytics:read',
    label: 'قراءة التحليلات (Analytics)',
    description: 'إحصائيات المبيعات، الإيرادات، والمصادر'
  },
  {
    value: 'orders:read',
    label: 'قراءة إجماليات الطلبات (Orders)',
    description: 'أعداد وتوزيع الطلبات ومصادرها (بدون بيانات شخصية)'
  },
  {
    value: 'products:read',
    label: 'قراءة المنتجات الأكثر مبيعًا (Top Products)',
    description: 'أفضل المنتجات أداءً والكميات المباعة'
  },
  {
    value: 'subscriptions:read',
    label: 'قراءة الاشتراكات (Subscriptions)',
    description: 'إحصائيات MRR، الاشتراكات النشطة والتجديدات'
  },
  {
    value: 'landing:read',
    label: 'صفحات الهبوط (Landing Pages)',
    description: 'معدلات التحويل، الزيارات والطلبات لكل صفحة'
  },
  {
    value: 'leads:read',
    label: 'إجماليات العملاء المحتملين (Leads)',
    description: 'تصنيف وجودة الليدز وقنوات الاكتساب'
  },
  {
    value: 'customers:read',
    label: 'إجماليات العملاء (Customers Aggregate)',
    description: 'إحصائيات عامة فقط بدون أي بيانات شخصية'
  },
  {
    value: 'ads:read',
    label: 'تحليلات الإعلانات (Ads & Meta)',
    description: 'بيانات الحملات والميزانيات المستهلكة'
  },
  {
    value: 'tasks:read',
    label: 'قراءة المهام (Tasks Read)',
    description: 'استعلام عن مشاريع ومهام النظام'
  },
  {
    value: 'tasks:write',
    label: 'إنشاء وتحديث المهام (Tasks Write)',
    description: 'إنشاء وتحديث حالات مهام النظام'
  },
  {
    value: 'platform:read',
    label: 'قراءة على مستوى المنصة كلها (Platform-Wide)',
    description: 'قراءة إحصائيات كل الشركات في المنصة (صلاحية مالك)',
    isHighPrivilege: true
  },
  {
    value: '*',
    label: 'صلاحية كاملة لكل المسارات (*)',
    description: 'وصول كامل لجميع المسارات الخارجية مع سجل تدقيق مشدد',
    isHighPrivilege: true
  }
];
