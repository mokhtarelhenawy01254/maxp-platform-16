import {
  WorkReportCadence,
  WorkReportField,
  WorkReportFieldDataType,
  WorkReportFieldSourceType,
  WorkReportTemplateDraft,
} from "./types";

export const CADENCE_OPTIONS: Array<{
  value: WorkReportCadence;
  label: string;
  description: string;
}> = [
  {
    value: "DAILY",
    label: "يومي",
    description: "تقرير واحد لكل موظف في اليوم.",
  },
  {
    value: "WEEKLY",
    label: "أسبوعي",
    description: "مناسب للفرق التي تراجع النتائج كل أسبوع.",
  },
  {
    value: "MONTHLY",
    label: "شهري",
    description: "للملخصات الكبيرة أو تقارير الإدارة.",
  },
];

export const FIELD_SOURCE_OPTIONS: Array<{
  value: WorkReportFieldSourceType;
  label: string;
  hint: string;
}> = [
  {
    value: "SYSTEM",
    label: "من النظام",
    hint: "يتسحب تلقائيًا وقت تعبئة التقرير.",
  },
  {
    value: "MANUAL",
    label: "إدخال يدوي",
    hint: "الموظف يكتبه أو يختاره بنفسه.",
  },
  {
    value: "CALCULATED",
    label: "حسابي",
    hint: "يتحسب من معادلة تعتمد على حقول أخرى.",
  },
];

export const DATA_TYPE_OPTIONS: Array<{
  value: WorkReportFieldDataType;
  label: string;
}> = [
  { value: "TEXT", label: "نص قصير" },
  { value: "LONG_TEXT", label: "نص طويل" },
  { value: "NUMBER", label: "رقم" },
  { value: "PERCENT", label: "نسبة مئوية" },
  { value: "SELECT", label: "اختيار من قائمة" },
];

export const SYSTEM_FIELD_OPTIONS: Array<{
  key: string;
  label: string;
  description: string;
  dataType: WorkReportFieldDataType;
}> = [
  {
    key: "CURRENT_USER_NAME",
    label: "اسم الموظف الحالي",
    description: "يسحب الاسم من المستخدم المسجل دخوله.",
    dataType: "TEXT",
  },
  {
    key: "CURRENT_USER_EMAIL",
    label: "بريد الموظف",
    description: "يفيد في الربط أو التحقق عند الحاجة.",
    dataType: "TEXT",
  },
  {
    key: "REPORT_DATE",
    label: "تاريخ التقرير",
    description: "يعكس التاريخ المختار للتقرير.",
    dataType: "TEXT",
  },
  {
    key: "REPLIED_MESSAGES_COUNT",
    label: "عدد الرسائل المردود عليها",
    description: "يعتمد على الرسائل الخارجة من الموظف في نفس الفترة.",
    dataType: "NUMBER",
  },
  {
    key: "REPLIED_CONVERSATIONS_COUNT",
    label: "عدد المحادثات المردود عليها",
    description: "عدد المحادثات المختلفة التي رد فيها الموظف.",
    dataType: "NUMBER",
  },
  {
    key: "CREATED_ORDERS_COUNT",
    label: "عدد الأوردرات",
    description: "عدد الأوردرات التي أنشأها الموظف في نفس الفترة.",
    dataType: "NUMBER",
  },
];

const buildField = (field: Partial<WorkReportField>, index: number): WorkReportField => ({
  key: field.key || `field_${index + 1}`,
  label: field.label || `حقل ${index + 1}`,
  helpText: field.helpText || "",
  sourceType: field.sourceType || "MANUAL",
  dataType: field.dataType || "TEXT",
  isRequired: field.isRequired ?? false,
  isVisible: field.isVisible ?? true,
  placeholder: field.placeholder || "",
  orderIndex: index,
  systemKey: field.systemKey || null,
  formula: field.formula || null,
  options: field.options || [],
});

export const buildMessagingPreset = (): WorkReportTemplateDraft => {
  const fields = [
    buildField(
      {
        key: "employee_name",
        label: "اسم الموظف",
        sourceType: "SYSTEM",
        dataType: "TEXT",
        systemKey: "CURRENT_USER_NAME",
        isRequired: true,
        isVisible: false,
        helpText: "يتحدد تلقائيًا ويمكن إخفاؤه من شاشة الموظف.",
      },
      0,
    ),
    buildField(
      {
        key: "messages_count",
        label: "عدد الرسائل المردود عليها",
        sourceType: "SYSTEM",
        dataType: "NUMBER",
        systemKey: "REPLIED_MESSAGES_COUNT",
        isRequired: true,
      },
      1,
    ),
    buildField(
      {
        key: "replied_conversations_count",
        label: "عدد المحادثات المردود عليها",
        sourceType: "SYSTEM",
        dataType: "NUMBER",
        systemKey: "REPLIED_CONVERSATIONS_COUNT",
        isRequired: true,
      },
      2,
    ),
    buildField(
      {
        key: "orders_count",
        label: "عدد الأوردرات",
        sourceType: "SYSTEM",
        dataType: "NUMBER",
        systemKey: "CREATED_ORDERS_COUNT",
        isRequired: true,
      },
      3,
    ),
    buildField(
      {
        key: "conversion_rate",
        label: "نسبة التحويل",
        sourceType: "CALCULATED",
        dataType: "PERCENT",
        formula: "(orders_count / replied_conversations_count) * 100",
        helpText: "المعادلة تعتمد على عدد الأوردرات وعدد المحادثات المردود عليها.",
      },
      4,
    ),
    buildField(
      {
        key: "achievements",
        label: "أنجزت إيه؟",
        sourceType: "MANUAL",
        dataType: "LONG_TEXT",
        isRequired: true,
        placeholder: "اكتب الإنجازات أو الحالات المهمة التي أنهيتها اليوم.",
      },
      5,
    ),
    buildField(
      {
        key: "blockers",
        label: "المعوقات",
        sourceType: "MANUAL",
        dataType: "LONG_TEXT",
        placeholder: "اذكر ما الذي عطلك أو يحتاج تدخل من الإدارة.",
      },
      6,
    ),
    buildField(
      {
        key: "next_target",
        label: "تارجت الغد",
        sourceType: "MANUAL",
        dataType: "TEXT",
        isRequired: true,
        placeholder: "هدف الفترة القادمة أو أولويتك القادمة.",
      },
      7,
    ),
  ];

  return {
    title: "تقرير يومي - فريق الرد على الرسائل",
    description:
      "فورم يومي يجمع الإنجاز، المعوقات، التارجت، والمؤشرات التلقائية الخاصة بفريق الرد.",
    cadence: "DAILY",
    isActive: true,
    allowMultipleSubmissions: false,
    fields,
  };
};
