const {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} = require('date-fns');

const { getSharedPrismaClient } = require('../services/sharedDatabase');

const ADMIN_ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'OWNER', 'MANAGER'];
const FORM_CADENCES = ['DAILY', 'WEEKLY', 'MONTHLY'];
const FIELD_SOURCE_TYPES = ['SYSTEM', 'MANUAL', 'CALCULATED'];
const FIELD_DATA_TYPES = ['TEXT', 'LONG_TEXT', 'NUMBER', 'PERCENT', 'SELECT'];
const SYSTEM_FIELD_CATALOG = {
  CURRENT_USER_NAME: { dataType: 'TEXT' },
  CURRENT_USER_EMAIL: { dataType: 'TEXT' },
  REPORT_DATE: { dataType: 'TEXT' },
  REPLIED_MESSAGES_COUNT: { dataType: 'NUMBER' },
  REPLIED_CONVERSATIONS_COUNT: { dataType: 'NUMBER' },
  CREATED_ORDERS_COUNT: { dataType: 'NUMBER' },
};

const toNullableString = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length ? normalized : null;
};

const safeJsonArray = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const decimalToNumber = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    return toNumberOrNull(value);
  }

  if (typeof value?.toNumber === 'function') {
    try {
      return value.toNumber();
    } catch (error) {
      return toNumberOrNull(String(value));
    }
  }

  return toNumberOrNull(String(value));
};

const buildDisplayName = (user) => {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return fullName || user?.email || 'موظف';
};

const normalizeFieldKey = (value, fallbackIndex = 0) => {
  const candidate = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_{2,}/g, '_');

  return candidate || `field_${fallbackIndex + 1}`;
};

const ensureValidDate = (value) => {
  if (!value) {
    return startOfDay(new Date());
  }

  const parsed = value instanceof Date ? value : parseISO(String(value));
  return Number.isNaN(parsed.getTime()) ? startOfDay(new Date()) : startOfDay(parsed);
};

const buildPeriod = (cadence, reportDateInput) => {
  const reportDate = ensureValidDate(reportDateInput);
  const normalizedCadence = FORM_CADENCES.includes(cadence) ? cadence : 'DAILY';

  if (normalizedCadence === 'WEEKLY') {
    const periodStart = startOfWeek(reportDate, { weekStartsOn: 1 });
    const periodEnd = endOfWeek(reportDate, { weekStartsOn: 1 });

    return {
      cadence: normalizedCadence,
      reportDate,
      periodStart,
      periodEnd,
      periodKey: `${format(periodStart, 'yyyy-MM-dd')}_${format(periodEnd, 'yyyy-MM-dd')}`,
      label: `${format(periodStart, 'yyyy/MM/dd')} - ${format(periodEnd, 'yyyy/MM/dd')}`,
    };
  }

  if (normalizedCadence === 'MONTHLY') {
    const periodStart = startOfMonth(reportDate);
    const periodEnd = endOfMonth(reportDate);

    return {
      cadence: normalizedCadence,
      reportDate,
      periodStart,
      periodEnd,
      periodKey: format(periodStart, 'yyyy-MM'),
      label: format(periodStart, 'yyyy/MM'),
    };
  }

  const periodStart = startOfDay(reportDate);
  const periodEnd = endOfDay(reportDate);

  return {
    cadence: 'DAILY',
    reportDate,
    periodStart,
    periodEnd,
    periodKey: format(periodStart, 'yyyy-MM-dd'),
    label: format(periodStart, 'yyyy/MM/dd'),
  };
};

const isNumericField = (field) => ['NUMBER', 'PERCENT'].includes(field.dataType);

const formatStoredValue = (field, storedValue) => {
  const numericValue = decimalToNumber(storedValue?.valueNumber);
  const textValue = storedValue?.valueText ?? null;
  const jsonValue = storedValue?.valueJson ?? null;

  let displayValue = textValue || '';

  if (numericValue !== null) {
    displayValue = field.dataType === 'PERCENT' ? `${numericValue.toFixed(2)}%` : `${numericValue}`;
  }

  if (Array.isArray(jsonValue) && jsonValue.length) {
    displayValue = jsonValue.join('، ');
  }

  return {
    valueText: textValue,
    valueNumber: numericValue,
    valueJson: jsonValue,
    displayValue,
  };
};

const serializeField = (field) => ({
  id: field.id,
  key: field.key,
  label: field.label,
  helpText: field.helpText,
  sourceType: field.sourceType,
  dataType: field.dataType,
  isRequired: field.isRequired,
  isVisible: field.isVisible,
  placeholder: field.placeholder,
  orderIndex: field.orderIndex,
  systemKey: field.systemKey,
  formula: field.formula,
  options: safeJsonArray(field.options),
});

const serializeForm = (form) => ({
  id: form.id,
  title: form.title,
  description: form.description,
  cadence: form.cadence,
  isActive: form.isActive,
  allowMultipleSubmissions: form.allowMultipleSubmissions,
  createdAt: form.createdAt,
  updatedAt: form.updatedAt,
  fields: (form.fields || []).sort((left, right) => left.orderIndex - right.orderIndex).map(serializeField),
});

const getFormulaContextValue = (field, storedValue) => {
  if (!storedValue) {
    return null;
  }

  if (isNumericField(field)) {
    return decimalToNumber(storedValue.valueNumber);
  }

  if (Array.isArray(storedValue.valueJson)) {
    return storedValue.valueJson.length;
  }

  return toNumberOrNull(storedValue.valueText);
};

const evaluateFormula = (formula, numericContext = {}) => {
  if (!formula) {
    return null;
  }

  const expression = String(formula).replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (token) => {
    if (!Object.prototype.hasOwnProperty.call(numericContext, token)) {
      return token;
    }

    const value = numericContext[token];
    return Number.isFinite(value) ? String(value) : '0';
  });

  if (/[^0-9+\-*/().\s]/.test(expression)) {
    throw new Error('صيغة المعادلة تحتوي على رموز غير مدعومة');
  }

  const result = evaluateSafeMath(expression);
  return Number.isFinite(result) ? Number(result.toFixed(4)) : null;
};

function evaluateSafeMath(expr) {
  let pos = 0;
  const peek = () => expr[pos];
  const next = () => expr[pos++];
  const eat = (c) => { while (peek() === ' ') next(); if (peek() === c) { next(); return true; } return false; };
  const parseNumber = () => {
    while (peek() === ' ') next();
    let num = '';
    while (/[0-9.]/.test(peek())) num += next();
    return num ? parseFloat(num) : null;
  };
  const parseFactor = () => {
    if (eat('(')) { const v = parseExpr(); eat(')'); return v; }
    const n = parseNumber();
    if (n === null) throw new Error('Invalid expression');
    return n;
  };
  const parseTerm = () => {
    let v = parseFactor();
    while (peek() === '*' || peek() === '/') {
      const op = next();
      const r = parseFactor();
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  const parseExpr = () => {
    let v = peek() === '-' ? (next(), -parseFactor()) : parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = next();
      const r = parseTerm();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  const result = parseExpr();
  validateRemainingInput();
  return result;
  function validateRemainingInput() { while (peek() === ' ') next(); if (peek()) throw new Error('Unexpected characters after expression'); }
};

const normalizeFieldDefinition = (field, index) => {
  const sourceType = FIELD_SOURCE_TYPES.includes(field?.sourceType) ? field.sourceType : 'MANUAL';
  const systemKey = sourceType === 'SYSTEM' ? String(field?.systemKey || '').trim().toUpperCase() : null;
  const defaultDataType = systemKey && SYSTEM_FIELD_CATALOG[systemKey]
    ? SYSTEM_FIELD_CATALOG[systemKey].dataType
    : 'TEXT';
  const dataType = FIELD_DATA_TYPES.includes(field?.dataType) ? field.dataType : defaultDataType;

  return {
    key: normalizeFieldKey(field?.key || field?.label, index),
    label: String(field?.label || '').trim(),
    helpText: toNullableString(field?.helpText),
    sourceType,
    dataType,
    isRequired: Boolean(field?.isRequired),
    isVisible: field?.isVisible !== false,
    placeholder: toNullableString(field?.placeholder),
    orderIndex: Number.isFinite(Number(field?.orderIndex)) ? Number(field.orderIndex) : index,
    systemKey,
    formula: sourceType === 'CALCULATED' ? toNullableString(field?.formula) : null,
    options: dataType === 'SELECT' ? safeJsonArray(field?.options) : [],
  };
};

const validateFormPayload = (payload) => {
  if (!payload.title) {
    throw new Error('عنوان الفورم مطلوب');
  }

  if (!Array.isArray(payload.fields) || payload.fields.length === 0) {
    throw new Error('أضف حقلًا واحدًا على الأقل قبل الحفظ');
  }

  const seenKeys = new Set();

  payload.fields.forEach((field) => {
    if (!field.label) {
      throw new Error('كل حقل يحتاج اسمًا واضحًا');
    }

    if (seenKeys.has(field.key)) {
      throw new Error('مفاتيح الحقول يجب أن تكون فريدة');
    }

    seenKeys.add(field.key);

    if (field.sourceType === 'SYSTEM' && !SYSTEM_FIELD_CATALOG[field.systemKey]) {
      throw new Error(`مصدر النظام "${field.systemKey || 'غير محدد'}" غير مدعوم`);
    }

    if (field.sourceType === 'CALCULATED' && !field.formula) {
      throw new Error(`الحقل "${field.label}" يحتاج معادلة حسابية`);
    }

    if (field.dataType === 'SELECT' && (!Array.isArray(field.options) || field.options.length === 0)) {
      throw new Error(`الحقل "${field.label}" يحتاج خيارات للاختيار`);
    }
  });
};

const resolveSystemFieldValue = async (field, context) => {
  const { companyId, periodStart, periodEnd, prisma, user } = context;
  const rangeEndExclusive = addDays(periodEnd, 1);

  switch (field.systemKey) {
    case 'CURRENT_USER_NAME':
      return { valueText: buildDisplayName(user), valueNumber: null, valueJson: null };
    case 'CURRENT_USER_EMAIL':
      return { valueText: user.email || null, valueNumber: null, valueJson: null };
    case 'REPORT_DATE':
      return { valueText: format(periodStart, 'yyyy-MM-dd'), valueNumber: null, valueJson: null };
    case 'REPLIED_MESSAGES_COUNT': {
      const total = await prisma.message.count({
        where: {
          senderId: user.id,
          isFromCustomer: false,
          createdAt: { gte: periodStart, lt: rangeEndExclusive },
          conversation: {
            companyId,
          },
        },
      });

      return { valueText: String(total), valueNumber: total, valueJson: null };
    }
    case 'REPLIED_CONVERSATIONS_COUNT': {
      const conversations = await prisma.message.findMany({
        where: {
          senderId: user.id,
          isFromCustomer: false,
          createdAt: { gte: periodStart, lt: rangeEndExclusive },
          conversation: {
            companyId,
          },
        },
        select: { conversationId: true },
        distinct: ['conversationId'],
      });

      return {
        valueText: String(conversations.length),
        valueNumber: conversations.length,
        valueJson: null,
      };
    }
    case 'CREATED_ORDERS_COUNT': {
      const total = await prisma.order.count({
        where: {
          companyId,
          createdBy: user.id,
          createdAt: { gte: periodStart, lt: rangeEndExclusive },
        },
      });

      return { valueText: String(total), valueNumber: total, valueJson: null };
    }
    default:
      return { valueText: null, valueNumber: null, valueJson: null };
  }
};

const coerceManualFieldValue = (field, inputValue) => {
  const raw = inputValue || {};

  if (field.dataType === 'SELECT') {
    const options = safeJsonArray(raw.valueJson || raw.valueText || raw);
    return {
      valueText: options.length ? options.join('، ') : null,
      valueNumber: null,
      valueJson: options.length ? options : null,
    };
  }

  if (isNumericField(field)) {
    const numericValue = toNumberOrNull(raw.valueNumber ?? raw.valueText ?? raw);
    return {
      valueText: numericValue === null ? null : String(numericValue),
      valueNumber: numericValue,
      valueJson: null,
    };
  }

  return {
    valueText: toNullableString(raw.valueText ?? raw),
    valueNumber: null,
    valueJson: null,
  };
};

const getSubmittedValueForField = (submittedValues, field) => {
  if (!submittedValues) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(submittedValues, field.id)) {
    return submittedValues[field.id];
  }

  if (Object.prototype.hasOwnProperty.call(submittedValues, field.key)) {
    return submittedValues[field.key];
  }

  return null;
};

const assertRequiredFieldValue = (field, storedValue) => {
  if (!field.isRequired) {
    return;
  }

  const hasText = Boolean(toNullableString(storedValue?.valueText));
  const hasNumber = storedValue?.valueNumber !== null && storedValue?.valueNumber !== undefined;
  const hasJson = Array.isArray(storedValue?.valueJson) ? storedValue.valueJson.length > 0 : Boolean(storedValue?.valueJson);

  if (!hasText && !hasNumber && !hasJson) {
    throw new Error(`الحقل "${field.label}" مطلوب`);
  }
};

const buildSubmissionValuePayload = (field, storedValue) => ({
  fieldId: field.id,
  valueText: storedValue?.valueText ?? null,
  valueNumber: storedValue?.valueNumber ?? null,
  valueJson: storedValue?.valueJson ?? null,
});

const fetchFormForCompany = (companyId, formId) =>
  getSharedPrismaClient().workReportForm.findFirst({
    where: { id: formId, companyId },
    include: {
      fields: { orderBy: { orderIndex: 'asc' } },
    },
  });

const buildValueMaps = (form, submission) => {
  const valueByFieldId = {};
  const valueByFieldKey = {};
  const valueIndex = new Map((submission?.values || []).map((value) => [value.fieldId, value]));

  (form.fields || []).forEach((field) => {
    const normalized = formatStoredValue(field, valueIndex.get(field.id) || null);
    valueByFieldId[field.id] = normalized;
    valueByFieldKey[field.key] = normalized;
  });

  return { valueByFieldId, valueByFieldKey };
};

const buildAnalytics = (form, records) => {
  const fields = (form.fields || []).filter((field) => field.isVisible);
  const numericFields = fields.filter(isNumericField);
  const metricCards = numericFields.map((field) => {
    const values = records
      .map((record) => record.valuesByFieldKey[field.key]?.valueNumber)
      .filter((value) => value !== null && value !== undefined);

    const total = values.reduce((sum, value) => sum + Number(value || 0), 0);
    const average = values.length ? total / values.length : 0;

    return {
      key: field.key,
      label: field.label,
      dataType: field.dataType,
      total: Number(total.toFixed(2)),
      average: Number(average.toFixed(2)),
      max: values.length ? Number(Math.max(...values).toFixed(2)) : 0,
      min: values.length ? Number(Math.min(...values).toFixed(2)) : 0,
    };
  });

  const peopleMap = new Map();

  records.forEach((record) => {
    if (!peopleMap.has(record.userId)) {
      peopleMap.set(record.userId, {
        userId: record.userId,
        userDisplayName: record.userDisplayName,
        submissionsCount: 0,
        lastSubmittedAt: record.submittedAt,
        metrics: {},
      });
    }

    const row = peopleMap.get(record.userId);
    row.submissionsCount += 1;

    if (!row.lastSubmittedAt || new Date(record.submittedAt).getTime() > new Date(row.lastSubmittedAt).getTime()) {
      row.lastSubmittedAt = record.submittedAt;
    }

    metricCards.forEach((metric) => {
      const value = record.valuesByFieldKey[metric.key]?.valueNumber;
      if (value === null || value === undefined) {
        return;
      }

      if (!row.metrics[metric.key]) {
        row.metrics[metric.key] = { total: 0, count: 0 };
      }

      row.metrics[metric.key].total += Number(value);
      row.metrics[metric.key].count += 1;
    });
  });

  const employeeBreakdown = Array.from(peopleMap.values()).map((row) => ({
    userId: row.userId,
    userDisplayName: row.userDisplayName,
    submissionsCount: row.submissionsCount,
    lastSubmittedAt: row.lastSubmittedAt,
    metrics: metricCards.map((metric) => {
      const snapshot = row.metrics[metric.key] || { total: 0, count: 0 };
      return {
        key: metric.key,
        label: metric.label,
        total: Number(snapshot.total.toFixed(2)),
        average: snapshot.count ? Number((snapshot.total / snapshot.count).toFixed(2)) : 0,
      };
    }),
  }));

  const trendMap = new Map();

  records.forEach((record) => {
    const dateKey = format(new Date(record.reportDate), 'yyyy-MM-dd');

    if (!trendMap.has(dateKey)) {
      trendMap.set(dateKey, { date: dateKey, submissions: 0, metrics: {} });
    }

    const row = trendMap.get(dateKey);
    row.submissions += 1;

    metricCards.forEach((metric) => {
      const value = record.valuesByFieldKey[metric.key]?.valueNumber;
      if (value === null || value === undefined) {
        return;
      }

      row.metrics[metric.key] = Number((row.metrics[metric.key] || 0) + Number(value)).toFixed(2);
    });
  });

  return {
    summary: {
      totalSubmissions: records.length,
      uniqueEmployees: new Set(records.map((record) => record.userId)).size,
    },
    metricCards,
    employeeBreakdown,
    dailyTrend: Array.from(trendMap.values()).sort((left, right) => left.date.localeCompare(right.date)),
  };
};

exports.getForms = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const search = String(req.query.search || '').trim();

    const forms = await getSharedPrismaClient().workReportForm.findMany({
      where: {
        companyId,
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        fields: {
          orderBy: { orderIndex: 'asc' },
        },
        submissions: {
          orderBy: { submittedAt: 'desc' },
          take: 1,
          select: { submittedAt: true },
        },
        _count: {
          select: {
            fields: true,
            submissions: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({
      success: true,
      data: forms.map((form) => ({
        id: form.id,
        title: form.title,
        description: form.description,
        cadence: form.cadence,
        isActive: form.isActive,
        allowMultipleSubmissions: form.allowMultipleSubmissions,
        fieldsCount: form._count.fields,
        submissionsCount: form._count.submissions,
        lastSubmittedAt: form.submissions[0]?.submittedAt || null,
        createdAt: form.createdAt,
        updatedAt: form.updatedAt,
        fields: form.fields.map(serializeField),
      })),
    });
  } catch (error) {
    console.error('Error fetching work report forms:', error);
    res.status(500).json({ success: false, message: error.message || 'فشل تحميل الفورمات' });
  }
};

exports.getFormById = async (req, res) => {
  try {
    const form = await fetchFormForCompany(req.user.companyId, req.params.id);

    if (!form) {
      return res.status(404).json({ success: false, message: 'الفورم غير موجود' });
    }

    res.json({ success: true, data: serializeForm(form) });
  } catch (error) {
    console.error('Error fetching work report form:', error);
    res.status(500).json({ success: false, message: error.message || 'فشل تحميل الفورم' });
  }
};

exports.createForm = async (req, res) => {
  try {
    const payload = {
      title: String(req.body.title || '').trim(),
      description: toNullableString(req.body.description),
      cadence: FORM_CADENCES.includes(req.body.cadence) ? req.body.cadence : 'DAILY',
      isActive: req.body.isActive !== false,
      allowMultipleSubmissions: Boolean(req.body.allowMultipleSubmissions),
      fields: Array.isArray(req.body.fields)
        ? req.body.fields.map((field, index) => normalizeFieldDefinition(field, index))
        : [],
    };

    validateFormPayload(payload);

    const createdForm = await getSharedPrismaClient().workReportForm.create({
      data: {
        companyId: req.user.companyId,
        title: payload.title,
        description: payload.description,
        cadence: payload.cadence,
        isActive: payload.isActive,
        allowMultipleSubmissions: payload.allowMultipleSubmissions,
        createdBy: req.user.id,
        updatedBy: req.user.id,
        fields: {
          create: payload.fields.map((field) => ({
            key: field.key,
            label: field.label,
            helpText: field.helpText,
            sourceType: field.sourceType,
            dataType: field.dataType,
            isRequired: field.isRequired,
            isVisible: field.isVisible,
            placeholder: field.placeholder,
            orderIndex: field.orderIndex,
            systemKey: field.systemKey,
            formula: field.formula,
            options: field.options,
          })),
        },
      },
      include: {
        fields: { orderBy: { orderIndex: 'asc' } },
      },
    });

    res.status(201).json({ success: true, data: serializeForm(createdForm) });
  } catch (error) {
    console.error('Error creating work report form:', error);
    res.status(400).json({ success: false, message: error.message || 'فشل إنشاء الفورم' });
  }
};

exports.updateForm = async (req, res) => {
  try {
    const existingForm = await fetchFormForCompany(req.user.companyId, req.params.id);

    if (!existingForm) {
      return res.status(404).json({ success: false, message: 'الفورم غير موجود' });
    }

    const payload = {
      title: String(req.body.title || '').trim(),
      description: toNullableString(req.body.description),
      cadence: FORM_CADENCES.includes(req.body.cadence) ? req.body.cadence : existingForm.cadence,
      isActive: req.body.isActive !== false,
      allowMultipleSubmissions: Boolean(req.body.allowMultipleSubmissions),
      fields: Array.isArray(req.body.fields)
        ? req.body.fields.map((field, index) => normalizeFieldDefinition(field, index))
        : [],
    };

    validateFormPayload(payload);

    const updatedForm = await getSharedPrismaClient().$transaction(async (prisma) => {
      await prisma.workReportFormField.deleteMany({ where: { formId: existingForm.id } });

      return prisma.workReportForm.update({
        where: { id: existingForm.id },
        data: {
          title: payload.title,
          description: payload.description,
          cadence: payload.cadence,
          isActive: payload.isActive,
          allowMultipleSubmissions: payload.allowMultipleSubmissions,
          updatedBy: req.user.id,
          fields: {
            create: payload.fields.map((field) => ({
              key: field.key,
              label: field.label,
              helpText: field.helpText,
              sourceType: field.sourceType,
              dataType: field.dataType,
              isRequired: field.isRequired,
              isVisible: field.isVisible,
              placeholder: field.placeholder,
              orderIndex: field.orderIndex,
              systemKey: field.systemKey,
              formula: field.formula,
              options: field.options,
            })),
          },
        },
        include: {
          fields: { orderBy: { orderIndex: 'asc' } },
        },
      });
    });

    res.json({ success: true, data: serializeForm(updatedForm) });
  } catch (error) {
    console.error('Error updating work report form:', error);
    res.status(400).json({ success: false, message: error.message || 'فشل تحديث الفورم' });
  }
};

exports.deleteForm = async (req, res) => {
  try {
    const existingForm = await fetchFormForCompany(req.user.companyId, req.params.id);

    if (!existingForm) {
      return res.status(404).json({ success: false, message: 'الفورم غير موجود' });
    }

    await getSharedPrismaClient().workReportForm.delete({ where: { id: existingForm.id } });

    res.json({ success: true, message: 'تم حذف الفورم بنجاح' });
  } catch (error) {
    console.error('Error deleting work report form:', error);
    res.status(500).json({ success: false, message: error.message || 'فشل حذف الفورم' });
  }
};

exports.getFillContext = async (req, res) => {
  try {
    const form = await fetchFormForCompany(req.user.companyId, req.params.id);

    if (!form) {
      return res.status(404).json({ success: false, message: 'الفورم غير موجود' });
    }

    if (!form.isActive && !ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'هذا الفورم غير مفعل حاليًا' });
    }

    const period = buildPeriod(form.cadence, req.query.date);
    const submission = await getSharedPrismaClient().workReportSubmission.findUnique({
      where: {
        formId_userId_periodKey: {
          formId: form.id,
          userId: req.user.id,
          periodKey: period.periodKey,
        },
      },
      include: {
        values: true,
      },
    });

    if (submission) {
      const maps = buildValueMaps(form, submission);

      return res.json({
        success: true,
        data: {
          form: serializeForm(form),
          period: {
            cadence: period.cadence,
            periodKey: period.periodKey,
            label: period.label,
            reportDate: format(period.reportDate, 'yyyy-MM-dd'),
            periodStart: period.periodStart,
            periodEnd: period.periodEnd,
          },
          values: {
            byFieldId: maps.valueByFieldId,
            byFieldKey: maps.valueByFieldKey,
          },
          existingSubmission: {
            id: submission.id,
            submittedAt: submission.submittedAt,
            status: submission.status,
          },
        },
      });
    }

    const prisma = getSharedPrismaClient();
    const valueSnapshots = {};

    for (const field of form.fields) {
      if (field.sourceType === 'SYSTEM') {
        valueSnapshots[field.key] = await resolveSystemFieldValue(field, {
          prisma,
          user: req.user,
          companyId: req.user.companyId,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
        });
      } else if (field.sourceType === 'MANUAL') {
        valueSnapshots[field.key] = { valueText: null, valueNumber: null, valueJson: null };
      }
    }

    const numericContext = {};
    form.fields.forEach((field) => {
      const value = getFormulaContextValue(field, valueSnapshots[field.key]);
      if (value !== null) {
        numericContext[field.key] = value;
      }
    });

    form.fields
      .filter((field) => field.sourceType === 'CALCULATED')
      .forEach((field) => {
        const numericValue = evaluateFormula(field.formula, numericContext);
        valueSnapshots[field.key] = {
          valueText: numericValue === null ? null : String(numericValue),
          valueNumber: numericValue,
          valueJson: null,
        };

        if (numericValue !== null) {
          numericContext[field.key] = numericValue;
        }
      });

    const byFieldId = {};
    const byFieldKey = {};

    form.fields.forEach((field) => {
      const normalized = formatStoredValue(field, valueSnapshots[field.key]);
      byFieldId[field.id] = normalized;
      byFieldKey[field.key] = normalized;
    });

    res.json({
      success: true,
      data: {
        form: serializeForm(form),
        period: {
          cadence: period.cadence,
          periodKey: period.periodKey,
          label: period.label,
          reportDate: format(period.reportDate, 'yyyy-MM-dd'),
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
        },
        values: { byFieldId, byFieldKey },
        existingSubmission: null,
      },
    });
  } catch (error) {
    console.error('Error building fill context:', error);
    res.status(500).json({ success: false, message: error.message || 'فشل تجهيز الفورم' });
  }
};

exports.submitForm = async (req, res) => {
  try {
    const form = await fetchFormForCompany(req.user.companyId, req.params.id);

    if (!form) {
      return res.status(404).json({ success: false, message: 'الفورم غير موجود' });
    }

    if (!form.isActive && !ADMIN_ROLES.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'هذا الفورم غير مفعل حاليًا' });
    }

    const period = buildPeriod(form.cadence, req.body.reportDate);
    const submittedValues = typeof req.body.values === 'object' && req.body.values !== null ? req.body.values : {};
    const prisma = getSharedPrismaClient();
    const valueSnapshots = {};

    for (const field of form.fields) {
      if (field.sourceType === 'SYSTEM') {
        valueSnapshots[field.key] = await resolveSystemFieldValue(field, {
          prisma,
          user: req.user,
          companyId: req.user.companyId,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
        });
      } else if (field.sourceType === 'MANUAL') {
        valueSnapshots[field.key] = coerceManualFieldValue(
          field,
          getSubmittedValueForField(submittedValues, field),
        );
      }

      if (field.sourceType !== 'CALCULATED') {
        assertRequiredFieldValue(field, valueSnapshots[field.key]);
      }
    }

    const numericContext = {};
    form.fields.forEach((field) => {
      const value = getFormulaContextValue(field, valueSnapshots[field.key]);
      if (value !== null) {
        numericContext[field.key] = value;
      }
    });

    form.fields
      .filter((field) => field.sourceType === 'CALCULATED')
      .forEach((field) => {
        const numericValue = evaluateFormula(field.formula, numericContext);
        valueSnapshots[field.key] = {
          valueText: numericValue === null ? null : String(numericValue),
          valueNumber: numericValue,
          valueJson: null,
        };
        assertRequiredFieldValue(field, valueSnapshots[field.key]);

        if (numericValue !== null) {
          numericContext[field.key] = numericValue;
        }
      });

    const payloadValues = form.fields.map((field) => buildSubmissionValuePayload(field, valueSnapshots[field.key]));

    const savedSubmission = await getSharedPrismaClient().$transaction(async (transaction) => {
      const existingSubmission = await transaction.workReportSubmission.findUnique({
        where: {
          formId_userId_periodKey: {
            formId: form.id,
            userId: req.user.id,
            periodKey: period.periodKey,
          },
        },
      });

      if (existingSubmission && !form.allowMultipleSubmissions) {
        await transaction.workReportSubmissionValue.deleteMany({
          where: { submissionId: existingSubmission.id },
        });

        return transaction.workReportSubmission.update({
          where: { id: existingSubmission.id },
          data: {
            employeeId: req.user.employeeId || null,
            userDisplayName: buildDisplayName(req.user),
            periodStart: period.periodStart,
            periodEnd: period.periodEnd,
            reportDate: period.reportDate,
            status: 'SUBMITTED',
            submittedAt: new Date(),
            values: {
              create: payloadValues,
            },
          },
          include: {
            values: true,
          },
        });
      }

      return transaction.workReportSubmission.create({
        data: {
          formId: form.id,
          companyId: req.user.companyId,
          userId: req.user.id,
          employeeId: req.user.employeeId || null,
          userDisplayName: buildDisplayName(req.user),
          periodKey: period.periodKey,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          reportDate: period.reportDate,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          values: {
            create: payloadValues,
          },
        },
        include: {
          values: true,
        },
      });
    });

    const maps = buildValueMaps(form, savedSubmission);

    res.status(201).json({
      success: true,
      message: 'تم حفظ التقرير بنجاح',
      data: {
        id: savedSubmission.id,
        submittedAt: savedSubmission.submittedAt,
        reportDate: savedSubmission.reportDate,
        values: maps.valueByFieldKey,
      },
    });
  } catch (error) {
    console.error('Error submitting work report:', error);
    res.status(400).json({ success: false, message: error.message || 'فشل إرسال التقرير' });
  }
};

exports.getFormRecords = async (req, res) => {
  try {
    const form = await fetchFormForCompany(req.user.companyId, req.params.id);

    if (!form) {
      return res.status(404).json({ success: false, message: 'الفورم غير موجود' });
    }

    const startDate = req.query.startDate ? startOfDay(ensureValidDate(req.query.startDate)) : undefined;
    const endDate = req.query.endDate ? endOfDay(ensureValidDate(req.query.endDate)) : undefined;
    const userId = toNullableString(req.query.userId);

    const submissions = await getSharedPrismaClient().workReportSubmission.findMany({
      where: {
        formId: form.id,
        companyId: req.user.companyId,
        userId: userId || undefined,
        reportDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        values: true,
      },
      orderBy: [{ reportDate: 'desc' }, { submittedAt: 'desc' }],
    });

    const records = submissions.map((submission) => {
      const maps = buildValueMaps(form, submission);
      return {
        id: submission.id,
        userId: submission.userId,
        userDisplayName: submission.userDisplayName,
        employeeId: submission.employeeId,
        reportDate: submission.reportDate,
        submittedAt: submission.submittedAt,
        status: submission.status,
        valuesByFieldKey: maps.valueByFieldKey,
      };
    });

    res.json({
      success: true,
      data: {
        form: serializeForm(form),
        records,
        analytics: buildAnalytics(form, records),
      },
    });
  } catch (error) {
    console.error('Error fetching work report records:', error);
    res.status(500).json({ success: false, message: error.message || 'فشل تحميل السجلات' });
  }
};
