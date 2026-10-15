import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { tToast } from "../../utils/i18n-toast";
import orderConfirmationService, {
  type OrderConfirmationSettings as OrderConfirmationSettingsType,
  type OrderConfirmationProduct,
  type OrderConfirmationUser
} from '../../services/orderConfirmationService';
import { EGYPT_GOVERNORATES } from '../../constants/egyptGovernorates';

const SOURCE_OPTIONS = [
  { value: 'ai_conversation', label: 'محادثة تلقائية' },
  { value: 'manual', label: 'يدوي' },
  { value: 'storefront', label: 'المتجر' },
  { value: 'woocommerce', label: 'WooCommerce' },
  { value: 'pos', label: 'POS' },
  { value: 'api', label: 'API' },
  { value: 'import', label: 'استيراد' },
  { value: 'unknown', label: 'غير معروف' }
];

const REQUIRE_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'جديد / قيد الانتظار' },
  { value: 'PROCESSING', label: 'قيد المعالجة المبدئية' }
];

const CONFIRM_TARGET_STATUS_OPTIONS = [
  { value: 'CONFIRMED', label: 'مؤكد (الافتراضي للمستودع)' },
  { value: 'PROCESSING', label: 'قيد التجهيز بالمستودع' },
  { value: 'READY_TO_SHIP', label: 'جاهز للشحن' }
];

const MATCH_MODE_OPTIONS = [
  {
    value: 'any',
    label: 'مطابقة أي شرط (OR)',
    description: 'يكفي أن يطابق الطلب مصدرًا أو حالةً واحدة.'
  },
  {
    value: 'all',
    label: 'مطابقة كل الشروط (AND)',
    description: 'يجب أن يطابق الطلب المصدر والحالة معًا.'
  }
];

const ROLE_OPTIONS = [
  { value: 'OWNER', label: 'المالك' },
  { value: 'COMPANY_ADMIN', label: 'مدير الشركة' },
  { value: 'MANAGER', label: 'مدير' },
  { value: 'AGENT', label: 'موظف' }
];

const ROLE_LABELS = ROLE_OPTIONS.reduce<Record<string, string>>((acc, role) => {
  acc[role.value] = role.label;
  return acc;
}, {});

const AVAILABILITY_LABELS: Record<string, string> = {
  available: 'متاح',
  busy: 'مشغول',
  away: 'بعيد',
  offline: 'غير متصل'
};

type MultiRuleEntry = { keys: string[]; userIds: string[] };
type ValueRuleEntry = { minTotal: string; maxTotal: string; userIds: string[] };
type MultiSelectOption = { value: string; label: string; description?: string };

const OrderConfirmationSettings: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<OrderConfirmationSettingsType | null>(null);
  const [eligibleUsers, setEligibleUsers] = useState<OrderConfirmationUser[]>([]);
  const [products, setProducts] = useState<OrderConfirmationProduct[]>([]);
  const [eligibleUserSearch, setEligibleUserSearch] = useState('');
  const [regionRules, setRegionRules] = useState<MultiRuleEntry[]>([]);
  const [productRules, setProductRules] = useState<MultiRuleEntry[]>([]);
  const [orderValueRules, setOrderValueRules] = useState<ValueRuleEntry[]>([]);

  const formatUserLabel = (user: OrderConfirmationUser) =>
    `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.id;

  const formatRoleLabel = (role?: string | null) => (role ? ROLE_LABELS[role] || role : 'بدون دور');
  const formatAvailabilityLabel = (availability?: string | null) =>
    availability ? AVAILABILITY_LABELS[availability] || availability : 'غير محدد';

  const toRuleEntries = (rules: Record<string, string[]>): MultiRuleEntry[] =>
    Object.entries(rules || {}).map(([key, userIds]) => ({
      keys: [key],
      userIds: Array.isArray(userIds) ? userIds : []
    }));

  const toValueRuleEntries = (rules: OrderConfirmationSettingsType['orderValueRules'] = []): ValueRuleEntry[] =>
    (Array.isArray(rules) ? rules : []).map((rule) => ({
      minTotal: rule.minTotal === null || rule.minTotal === undefined ? '' : String(rule.minTotal),
      maxTotal: rule.maxTotal === null || rule.maxTotal === undefined ? '' : String(rule.maxTotal),
      userIds: Array.isArray(rule.userIds) ? rule.userIds : []
    }));

  const buildRulesPayload = (rules: MultiRuleEntry[]) =>
    rules.reduce<Record<string, string[]>>((acc, rule) => {
      const ids = Array.from(new Set(rule.userIds.filter(Boolean)));
      if (!ids.length) return acc;
      Array.from(new Set(rule.keys.map((key) => key.trim()).filter(Boolean))).forEach((key) => {
        acc[key] = ids;
      });
      return acc;
    }, {});

  const buildValueRulesPayload = (rules: ValueRuleEntry[]) =>
    rules
      .map((rule) => {
        const minTotal = rule.minTotal.trim() === '' ? null : Number(rule.minTotal);
        const maxTotal = rule.maxTotal.trim() === '' ? null : Number(rule.maxTotal);
        return {
          minTotal: Number.isFinite(minTotal) ? minTotal : null,
          maxTotal: Number.isFinite(maxTotal) ? maxTotal : null,
          userIds: Array.from(new Set(rule.userIds.filter(Boolean)))
        };
      })
      .filter((rule) => rule.userIds.length && (rule.minTotal !== null || rule.maxTotal !== null));

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await orderConfirmationService.getSettings();
      setSettings(res.data);
      setRegionRules(toRuleEntries(res.data.regionRules || {}));
      setProductRules(toRuleEntries(res.data.specialtyRules || {}));
      setOrderValueRules(toValueRuleEntries(res.data.orderValueRules || []));
    } catch (error: any) {
      toast.error(error?.message || 'تعذر تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  };

  const loadEligibleUsers = async () => {
    try {
      const res = await orderConfirmationService.getEligibleUsers({ includeAll: true });
      setEligibleUsers(res.data || []);
    } catch (error: any) {
      toast.error(error?.message || 'تعذر تحميل مستخدمي التوزيع');
    }
  };

  const loadProducts = async () => {
    try {
      const res = await orderConfirmationService.getProducts({ limit: 200, sortBy: 'name', sortOrder: 'asc' });
      setProducts(res.data || []);
    } catch (error: any) {
      toast.error(error?.message || 'تعذر تحميل المنتجات لقواعد التخصيص');
    }
  };

  useEffect(() => {
    loadSettings();
    loadEligibleUsers();
    loadProducts();
  }, []);

  const toggleArrayValue = (key: keyof OrderConfirmationSettingsType, value: string) => {
    if (!settings) return;
    const list = new Set(settings[key] as string[]);
    if (list.has(value)) list.delete(value);
    else list.add(value);
    setSettings({ ...settings, [key]: Array.from(list) } as OrderConfirmationSettingsType);
  };

  const applyEligibleUserIds = (userIds: string[]) => {
    if (!settings) return;
    const nextUserIds = Array.from(new Set(userIds));
    setSettings({ ...settings, eligibleUserIds: nextUserIds });

    if (!nextUserIds.length) return;

    const allowedIds = new Set(nextUserIds);
    setRegionRules((prev) =>
      prev.map((rule) => ({ ...rule, userIds: rule.userIds.filter((id) => allowedIds.has(id)) }))
    );
    setProductRules((prev) =>
      prev.map((rule) => ({ ...rule, userIds: rule.userIds.filter((id) => allowedIds.has(id)) }))
    );
    setOrderValueRules((prev) =>
      prev.map((rule) => ({ ...rule, userIds: rule.userIds.filter((id) => allowedIds.has(id)) }))
    );
  };

  const toggleEligibleUser = (userId: string) => {
    if (!settings) return;
    const nextIds = new Set(settings.eligibleUserIds || []);
    if (!nextIds.size) {
      applyEligibleUserIds(eligibleUsers.map((user) => user.id).filter((id) => id !== userId));
      return;
    }

    if (nextIds.has(userId)) {
      nextIds.delete(userId);
    } else {
      nextIds.add(userId);
    }

    applyEligibleUserIds(Array.from(nextIds));
  };

  const selectFilteredEligibleUsers = () => {
    const filteredIds = filteredEligibleUsers.map((user) => user.id);
    applyEligibleUserIds(Array.from(new Set([...(settings?.eligibleUserIds || []), ...filteredIds])));
  };

  const allowAllEligibleUsers = () => {
    applyEligibleUserIds([]);
  };

  const removeHiddenEligibleUsers = () => {
    const visibleIds = new Set(eligibleUsers.map((user) => user.id));
    applyEligibleUserIds((settings?.eligibleUserIds || []).filter((id) => visibleIds.has(id)));
  };

  const handleSave = async () => {
    if (!settings) return;
    try {
      setSaving(true);
      const payload: Partial<OrderConfirmationSettingsType> = {
        ...settings,
        regionRules: buildRulesPayload(regionRules),
        specialtyRules: buildRulesPayload(productRules),
        orderValueRules: buildValueRulesPayload(orderValueRules)
      };
      const res = await orderConfirmationService.updateSettings(payload);
      setSettings(res.data);
      await loadEligibleUsers();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('order-confirmation-settings-updated', { detail: res.data }));
        try {
          window.localStorage.setItem('order-confirmation-settings-updated-at', Date.now().toString());
        } catch {}
      }
      tToast.success("OrderConfirmationSettings.success_save_8804");
    } catch (error: any) {
      toast.error(error?.message || 'فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const updateRegionRule = (index: number, patch: Partial<MultiRuleEntry>) => {
    setRegionRules((prev) => prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  };

  const removeRegionRule = (index: number) => {
    setRegionRules((prev) => prev.filter((_, i) => i !== index));
  };

  const updateProductRule = (index: number, patch: Partial<MultiRuleEntry>) => {
    setProductRules((prev) => prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  };

  const removeProductRule = (index: number) => {
    setProductRules((prev) => prev.filter((_, i) => i !== index));
  };

  const updateValueRule = (index: number, patch: Partial<ValueRuleEntry>) => {
    setOrderValueRules((prev) => prev.map((rule, i) => (i === index ? { ...rule, ...patch } : rule)));
  };

  const removeValueRule = (index: number) => {
    setOrderValueRules((prev) => prev.filter((_, i) => i !== index));
  };

  if (loading) {
    return <div className="p-6">جاري التحميل...</div>;
  }

  if (!settings) {
    return <div className="p-6">تعذر تحميل الإعدادات</div>;
  }

  const selectedEligibleIds = new Set(settings.eligibleUserIds || []);
  const visibleEligibleIds = new Set(eligibleUsers.map((user) => user.id));
  const hiddenEligibleUserIds = (settings.eligibleUserIds || []).filter((id) => !visibleEligibleIds.has(id));
  const selectedDistributionUsers = eligibleUsers.filter((user) => selectedEligibleIds.has(user.id));
  const ruleUserOptions = settings.eligibleUserIds.length > 0 ? selectedDistributionUsers : eligibleUsers;
  const isRestrictedToSpecificUsers = settings.eligibleUserIds.length > 0;
  const searchTerm = eligibleUserSearch.trim().toLowerCase();
  const filteredEligibleUsers = searchTerm
    ? eligibleUsers.filter((user) =>
      [
        formatUserLabel(user),
        user.email || '',
        formatRoleLabel(user.role),
        formatAvailabilityLabel(user.availability)
      ].join(' ').toLowerCase().includes(searchTerm)
    )
    : eligibleUsers;
  const visuallyIncludedUserIds = new Set(
    isRestrictedToSpecificUsers ? settings.eligibleUserIds : eligibleUsers.map((user) => user.id)
  );
  const userOptions: MultiSelectOption[] = ruleUserOptions.map((user) => ({
    value: user.id,
    label: formatUserLabel(user),
    description: `${formatRoleLabel(user.role)} • ${formatAvailabilityLabel(user.availability)}`
  }));
  const baseRegionOptions: MultiSelectOption[] = EGYPT_GOVERNORATES.map((gov) => ({
    value: gov.nameAr,
    label: gov.nameAr,
    description: gov.regionNameAr
  }));
  const customRegionKeys = regionRules.flatMap((rule) => rule.keys).filter(
    (key) => key && !baseRegionOptions.some((option) => option.value === key)
  );
  const regionOptions = [
    ...baseRegionOptions,
    ...Array.from(new Set(customRegionKeys)).map((key) => ({ value: key, label: key, description: 'قيمة محفوظة' }))
  ];
  const baseProductOptions: MultiSelectOption[] = products.map((product) => ({
    value: product.id,
    label: product.name,
    description: product.sku ? `SKU: ${product.sku}` : undefined
  }));
  const customProductKeys = productRules.flatMap((rule) => rule.keys).filter(
    (key) => key && !baseProductOptions.some((option) => option.value === key)
  );
  const productOptions = [
    ...baseProductOptions,
    ...Array.from(new Set(customProductKeys)).map((key) => ({ value: key, label: key, description: 'قيمة محفوظة أو كود منتج' }))
  ];

  const renderMultiSelectDropdown = ({
    options,
    selectedValues,
    onChange,
    placeholder,
    emptyText
  }: {
    options: MultiSelectOption[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder: string;
    emptyText: string;
  }) => {
    const selectedSet = new Set(selectedValues);
    const selectedLabels = options.filter((option) => selectedSet.has(option.value)).map((option) => option.label);

    return (
      <details className="relative">
        <summary className="cursor-pointer list-none rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm">
          <span className="block text-gray-900 dark:text-white">
            {selectedLabels.length ? selectedLabels.join('، ') : placeholder}
          </span>
          <span className="block text-[11px] text-gray-500 mt-1">
            {selectedLabels.length ? `${selectedLabels.length} اختيار` : 'اضغط لاختيار أكثر من عنصر'}
          </span>
        </summary>
        <div className="absolute z-20 mt-2 max-h-64 w-full min-w-[260px] overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 shadow-lg">
          {options.length === 0 ? (
            <div className="px-2 py-3 text-xs text-gray-500">{emptyText}</div>
          ) : (
            options.map((option) => {
              const checked = selectedSet.has(option.value);
              return (
                <label key={option.value} className="flex items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = new Set(selectedValues);
                      if (checked) next.delete(option.value);
                      else next.add(option.value);
                      onChange(Array.from(next));
                    }}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-gray-900 dark:text-white">{option.label}</span>
                    {option.description && (
                      <span className="block text-xs text-gray-500">{option.description}</span>
                    )}
                  </span>
                </label>
              );
            })
          )}
        </div>
      </details>
    );
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">إعدادات التأكيد والتوزيع</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          تحكم في قواعد التأكيد الآلي وتوزيع الطلبات على الفريق.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">تفعيل التأكيد</h3>
            <p className="text-xs text-gray-500">عند التفعيل سيتم إظهار الطلبات التي تطابق القواعد أدناه.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.enabled}
            onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 ${settings.enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div>
          <h4 className="font-medium mb-2">مصادر تحتاج تأكيد</h4>
          <div className="flex flex-wrap gap-2">
            {SOURCE_OPTIONS.map((source) => (
              <label key={source.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.requireSourceTypes.includes(source.value)}
                  onChange={() => toggleArrayValue('requireSourceTypes', source.value)}
                />
                {source.label}
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-2">حالات تحتاج تأكيد (طابور التأكيد)</h4>
          <div className="flex flex-wrap gap-2">
            {REQUIRE_STATUS_OPTIONS.map((status) => (
              <label key={status.value} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.requireStatuses.includes(status.value)}
                  onChange={() => toggleArrayValue('requireStatuses', status.value)}
                />
                {status.label}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">
            الطلبات التي ما زالت في مرحلة التأكيد فقط (يُستبعد تلقائيًا أي طلب تم شحنه أو تسليمه أو إلغاؤه).
          </p>
        </div>

        <div>
          <h4 className="font-medium mb-2">طريقة المطابقة</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {MATCH_MODE_OPTIONS.map((mode) => (
              <label
                key={mode.value}
                className="flex items-start gap-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 text-sm"
              >
                <input
                  type="radio"
                  name="matchMode"
                  checked={(settings.requireMatchMode || 'any') === mode.value}
                  onChange={() => setSettings({ ...settings, requireMatchMode: mode.value })}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{mode.label}</div>
                  <div className="text-xs text-gray-500">{mode.description}</div>
                </div>
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            اختر {`"مطابقة أي شرط"`} لعرض الطلبات التي تطابق المصدر أو الحالة، أو {`"مطابقة كل الشروط"`} لفرض تطابق الاثنين معًا.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">الحالة بعد التأكيد</label>
            <select
              value={settings.confirmStatus}
              onChange={(e) => setSettings({ ...settings, confirmStatus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
            >
              {CONFIRM_TARGET_STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
              {!CONFIRM_TARGET_STATUS_OPTIONS.some((status) => status.value === settings.confirmStatus) && (
                <option value={settings.confirmStatus}>{settings.confirmStatus}</option>
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">تفعيل التوزيع التلقائي</h3>
            <p className="text-xs text-gray-500">عند التفعيل سيتم توزيع الطلبات المؤكدة تلقائياً.</p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, distributionEnabled: !settings.distributionEnabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full ${settings.distributionEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.distributionEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">طريقة التوزيع</label>
            <select
              value={settings.distributionStrategy}
              onChange={(e) => setSettings({ ...settings, distributionStrategy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
            >
              <option value="round_robin">توزيع متساوي</option>
              <option value="by_region">حسب المنطقة</option>
              <option value="by_specialty">حسب المنتج</option>
              <option value="by_order_value">حسب قيمة الأوردر</option>
              <option value="by_workload">حسب العبء الحالي</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الأدوار المسموحة بالتوزيع</label>
            <div className="flex flex-wrap gap-2">
              {ROLE_OPTIONS.map((role) => (
                <label key={role.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.eligibleRoles.includes(role.value)}
                    onChange={() => toggleArrayValue('eligibleRoles', role.value)}
                  />
                  {role.label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/20 p-4 space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <h4 className="font-semibold text-gray-900 dark:text-white">الموظفون المؤهلون للتوزيع</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                هذه القائمة هي بوابة التوزيع النهائية. اختر كل المؤهلين، أو قيّد التوزيع على أسماء محددة فقط.
              </p>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
              isRestrictedToSpecificUsers
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-indigo-700 border border-indigo-200 dark:bg-gray-900 dark:text-indigo-300 dark:border-indigo-800'
            }`}>
              {isRestrictedToSpecificUsers
                ? `التوزيع محدود على ${settings.eligibleUserIds.length} موظف`
                : `التوزيع مفتوح لكل المؤهلين (${eligibleUsers.length})`}
            </div>
          </div>

          {!settings.distributionEnabled && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              التوزيع التلقائي غير مفعل حالياً. يمكنك تجهيز القائمة الآن، لكنها لن تُستخدم إلا بعد تفعيل التوزيع.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={allowAllEligibleUsers}
              className={`rounded-xl border p-3 text-right transition-colors ${
                !isRestrictedToSpecificUsers
                  ? 'border-indigo-300 bg-white shadow-sm dark:bg-gray-900'
                  : 'border-gray-200 bg-white/60 hover:bg-white dark:border-gray-700 dark:bg-gray-900/50'
              }`}
            >
              <span className="block text-sm font-semibold text-gray-900 dark:text-white">كل المؤهلين حسب الدور</span>
              <span className="block text-xs text-gray-500 mt-1">أي مدير أو موظف ضمن الأدوار المختارة يدخل في التوزيع.</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isRestrictedToSpecificUsers && eligibleUsers.length) {
                  applyEligibleUserIds([eligibleUsers[0].id]);
                }
              }}
              className={`rounded-xl border p-3 text-right transition-colors ${
                isRestrictedToSpecificUsers
                  ? 'border-indigo-300 bg-white shadow-sm dark:bg-gray-900'
                  : 'border-gray-200 bg-white/60 hover:bg-white dark:border-gray-700 dark:bg-gray-900/50'
              }`}
            >
              <span className="block text-sm font-semibold text-gray-900 dark:text-white">موظفون محددون فقط</span>
              <span className="block text-xs text-gray-500 mt-1">الأسماء المحددة هنا فقط هي التي ستدخل في الاختيار الآلي.</span>
            </button>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <input
              value={eligibleUserSearch}
              onChange={(e) => setEligibleUserSearch(e.target.value)}
              placeholder="ابحث باسم الموظف، البريد، الدور، أو الحالة"
              className="w-full lg:max-w-md px-3 py-2 border border-indigo-100 dark:border-indigo-900/60 rounded-lg bg-white dark:bg-gray-900 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={selectFilteredEligibleUsers}
                disabled={filteredEligibleUsers.length === 0}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs disabled:opacity-50"
              >
                تحديد نتائج البحث
              </button>
              {hiddenEligibleUserIds.length > 0 && (
                <button
                  type="button"
                  onClick={removeHiddenEligibleUsers}
                  className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs"
                >
                  إزالة {hiddenEligibleUserIds.length} اختيار غير ظاهر
                </button>
              )}
            </div>
          </div>

          {isRestrictedToSpecificUsers && (
            <div className="flex flex-wrap gap-2">
              {selectedDistributionUsers.length === 0 ? (
                <span className="text-xs text-amber-700 dark:text-amber-300">
                  يوجد اختيارات محفوظة لكنها غير ظاهرة ضمن الأدوار الحالية.
                </span>
              ) : (
                selectedDistributionUsers.map((user) => (
                  <span key={user.id} className="rounded-full bg-white px-3 py-1 text-xs text-indigo-700 border border-indigo-100 dark:bg-gray-900 dark:text-indigo-300 dark:border-indigo-900">
                    {formatUserLabel(user)}
                  </span>
                ))
              )}
            </div>
          )}

          {eligibleUsers.length === 0 ? (
            <div className="text-xs text-gray-500">
              لا يوجد مستخدمون متاحون ضمن الأدوار المختارة حالياً. جرّب إضافة دور من الأدوار المسموحة ثم احفظ.
            </div>
          ) : filteredEligibleUsers.length === 0 ? (
            <div className="text-xs text-gray-500">لا توجد نتائج مطابقة للبحث الحالي.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
              {filteredEligibleUsers.map((user) => (
                <label
                  key={user.id}
                  className={`flex items-start gap-2 rounded-lg border p-3 text-sm transition-colors ${visuallyIncludedUserIds.has(user.id)
                    ? 'border-indigo-300 bg-white dark:bg-gray-900'
                    : 'border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/60'
                    }`}
                >
                  <input
                    type="checkbox"
                    checked={visuallyIncludedUserIds.has(user.id)}
                    onChange={() => toggleEligibleUser(user.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium text-gray-900 dark:text-white">
                      {formatUserLabel(user)}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {formatRoleLabel(user.role)} • {formatAvailabilityLabel(user.availability)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">قواعد المناطق</label>
              <p className="text-xs text-gray-500">اختر محافظة أو أكثر من قائمة منسدلة، ثم حدد فريق التوزيع لها.</p>
            </div>
            {regionRules.length === 0 ? (
              <div className="text-xs text-gray-500">لا توجد قواعد مناطق بعد.</div>
            ) : (
              regionRules.map((rule, index) => (
                <div
                  key={`region-${index}`}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2"
                >
                  <div className="space-y-2">
                    {renderMultiSelectDropdown({
                      options: regionOptions,
                      selectedValues: rule.keys,
                      onChange: (keys) => updateRegionRule(index, { keys }),
                      placeholder: 'اختر المحافظات',
                      emptyText: 'لا توجد محافظات متاحة'
                    })}
                    {renderMultiSelectDropdown({
                      options: userOptions,
                      selectedValues: rule.userIds,
                      onChange: (userIds) => updateRegionRule(index, { userIds }),
                      placeholder: 'اختر الموظفين',
                      emptyText: 'لا يوجد موظفون متاحون'
                    })}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => removeRegionRule(index)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))
            )}
            <button
              onClick={() => setRegionRules((prev) => [...prev, { keys: [], userIds: [] }])}
              className="text-xs text-indigo-600 hover:underline"
            >
              إضافة قاعدة منطقة
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">قواعد التخصيص حسب المنتج</label>
              <p className="text-xs text-gray-500">اختر منتج أو أكثر وحدد الموظفين المسؤولين عنهم.</p>
            </div>
            {productRules.length === 0 ? (
              <div className="text-xs text-gray-500">لا توجد قواعد منتجات بعد.</div>
            ) : (
              productRules.map((rule, index) => (
                <div
                  key={`product-${index}`}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2"
                >
                  <div className="space-y-2">
                    {renderMultiSelectDropdown({
                      options: productOptions,
                      selectedValues: rule.keys,
                      onChange: (keys) => updateProductRule(index, { keys }),
                      placeholder: products.length ? 'اختر المنتجات' : 'لا توجد منتجات محملة',
                      emptyText: 'لا توجد منتجات متاحة'
                    })}
                    {renderMultiSelectDropdown({
                      options: userOptions,
                      selectedValues: rule.userIds,
                      onChange: (userIds) => updateProductRule(index, { userIds }),
                      placeholder: 'اختر الموظفين',
                      emptyText: 'لا يوجد موظفون متاحون'
                    })}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => removeProductRule(index)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))
            )}
            <button
              onClick={() => setProductRules((prev) => [...prev, { keys: [], userIds: [] }])}
              className="text-xs text-indigo-600 hover:underline"
            >
              إضافة قاعدة منتج
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">قواعد التخصيص حسب قيمة الأوردر</label>
              <p className="text-xs text-gray-500">حدد مدى قيمة الطلب، ثم الموظفين المناسبين له.</p>
            </div>
            {orderValueRules.length === 0 ? (
              <div className="text-xs text-gray-500">لا توجد قواعد لقيمة الأوردر بعد.</div>
            ) : (
              orderValueRules.map((rule, index) => (
                <div
                  key={`value-${index}`}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={rule.minTotal}
                      onChange={(e) => updateValueRule(index, { minTotal: e.target.value })}
                      inputMode="decimal"
                      placeholder="من قيمة"
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
                    />
                    <input
                      value={rule.maxTotal}
                      onChange={(e) => updateValueRule(index, { maxTotal: e.target.value })}
                      inputMode="decimal"
                      placeholder="إلى قيمة"
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
                    />
                  </div>
                  {renderMultiSelectDropdown({
                    options: userOptions,
                    selectedValues: rule.userIds,
                    onChange: (userIds) => updateValueRule(index, { userIds }),
                    placeholder: 'اختر الموظفين',
                    emptyText: 'لا يوجد موظفون متاحون'
                  })}
                  <div className="flex justify-end">
                    <button
                      onClick={() => removeValueRule(index)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))
            )}
            <button
              onClick={() => setOrderValueRules((prev) => [...prev, { minTotal: '', maxTotal: '', userIds: [] }])}
              className="text-xs text-indigo-600 hover:underline"
            >
              إضافة قاعدة قيمة
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 space-y-4">
        <div>
          <h3 className="font-semibold">دورة مكالمات التأكيد</h3>
          <p className="text-xs text-gray-500">تحكم في عدد محاولات الاتصال والوقت بين المحاولات لطلبات "لا يوجد رد".</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">أقصى عدد محاولات بدون رد</label>
            <input
              type="number"
              min={0}
              value={settings.maxCallsNoAnswer ?? 3}
              onChange={(e) => setSettings({ ...settings, maxCallsNoAnswer: Math.max(0, Math.floor(Number(e.target.value))) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">بعد هذا العدد يتوقف عرض زر "لا رد" لهذا الطلب. صفر = غير محدود.</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">الوقت بين محاولات الاتصال (بالدقائق)</label>
            <input
              type="number"
              min={0}
              value={settings.intervalMinutes ?? 30}
              onChange={(e) => setSettings({ ...settings, intervalMinutes: Math.max(0, Math.floor(Number(e.target.value))) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">يمنع تسجيل محاولة جديدة قبل مرور هذه المدة. صفر = بدون انتظار.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold disabled:opacity-60"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>
    </div>
  );
};

export default OrderConfirmationSettings;
