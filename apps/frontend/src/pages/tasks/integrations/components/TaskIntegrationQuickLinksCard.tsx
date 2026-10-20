import React from 'react';
import {
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import {
  TASK_SCOPE_OPTIONS,
  TASK_WEBHOOK_EVENTS,
} from '../utils/taskIntegrationConstants';

interface TaskIntegrationQuickLinksCardProps {
  externalApiBaseUrl: string;
  integrationPageUrl: string;
  listTasksSnippet: string;
  createTaskSnippet: string;
  updateTaskSnippet: string;
  updateStatusSnippet: string;
  onCopySecret: (value: string, message: string) => void;
}

export const TaskIntegrationQuickLinksCard: React.FC<
  TaskIntegrationQuickLinksCardProps
> = ({
  externalApiBaseUrl,
  integrationPageUrl,
  listTasksSnippet,
  createTaskSnippet,
  updateTaskSnippet,
  updateStatusSnippet,
  onCopySecret,
}) => {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      {/* Quick Links */}
      <div className="rounded-[24px] border border-border/70 bg-card/64 p-3.5 shadow-[0_18px_52px_-44px_rgba(15,27,45,0.18)]">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            روابط العمل السريعة
          </h3>
          <p className="text-xs leading-5 text-muted-foreground">
            الحد الأدنى الذي تحتاجه لبدء الربط.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-[20px] border border-border/60 bg-background/72 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-foreground">
                Base URL
              </div>
              <button
                type="button"
                onClick={() => onCopySecret(externalApiBaseUrl, 'تم نسخ Base URL')}
                className="inline-flex items-center rounded-xl border border-border/60 bg-background/75 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-background"
              >
                <DocumentDuplicateIcon className="ml-1 h-3.5 w-3.5" />
                نسخ
              </button>
            </div>
            <code className="block break-all text-xs leading-6 text-primary font-mono tabular-nums">
              {externalApiBaseUrl}
            </code>
          </div>

          <div className="rounded-[20px] border border-border/60 bg-background/72 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-foreground">
                رابط الصفحة
              </div>
              <button
                type="button"
                onClick={() =>
                  onCopySecret(integrationPageUrl, 'تم نسخ رابط صفحة التكاملات')
                }
                className="inline-flex items-center rounded-xl border border-border/60 bg-background/75 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-background"
              >
                <DocumentDuplicateIcon className="ml-1 h-3.5 w-3.5" />
                نسخ
              </button>
            </div>
            <code className="block break-all text-xs leading-6 text-foreground font-mono tabular-nums">
              {integrationPageUrl}
            </code>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {TASK_SCOPE_OPTIONS.map((scope) => (
            <span
              key={scope.value}
              className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-semibold text-primary font-mono"
            >
              {scope.value}
            </span>
          ))}
        </div>
      </div>

      {/* Developer Reference Collapsible */}
      <details className="rounded-[26px] border border-border/70 bg-card/68 shadow-[0_18px_52px_-44px_rgba(15,27,45,0.2)] [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex cursor-pointer list-none flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-foreground">
              مرجع المطور
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              أمثلة الطلبات وملاحظات الأمان متاحة هنا عندما تحتاجها فقط.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-border/60 bg-background/75 px-3 py-1.5 text-xs font-medium text-muted-foreground tabular-nums font-mono">
              4 أمثلة جاهزة
            </span>
            <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
          </div>
        </summary>

        <div className="border-t border-border/60 px-4 pb-4 pt-4">
          <div className="rounded-[22px] border border-border/60 bg-background/72 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-background p-2 text-foreground">
                <ShieldCheckIcon className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-foreground">
                  ملاحظات الأمان وقواعد الصلاحيات
                </h4>
                <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                  <li>
                    نقطة <code className="font-mono text-xs">PATCH /api/v1/external/tasks/:id</code> تدعم تحديث
                    العنوان، الوصف، الأولوية، الموعد، الوسوم، والمسؤول، وترسل إشعارًا فوريًا للمكلف بالمهمة.
                  </li>
                  <li>
                    لا يمكن الوصول أو تعديل مهام أي شركة أخرى عبر التكامل الخارجي (تُرفض بـ 404 Not Found).
                  </li>
                  <li>
                    صلاحيات <code className="font-mono text-xs">tasks:write</code> و <code className="font-mono text-xs">tasks:update</code> تحتاج مستخدم تنفيذ افتراضي نشط داخل نفس الشركة.
                  </li>
                  <li>
                    احتفظ بالـ API key أو signing secret في النظام الخارجي فور إنشائها، ويمكنك تدويرها عند الحاجة بأمان.
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {TASK_WEBHOOK_EVENTS.map((eventItem) => (
              <span
                key={eventItem.value}
                className="inline-flex items-center rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-xs font-semibold text-secondary font-mono"
              >
                {eventItem.value}
              </span>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {[
              { title: 'قراءة المهام', value: listTasksSnippet },
              { title: 'إنشاء مهمة', value: createTaskSnippet },
              { title: 'تعديل بيانات المهمة', value: updateTaskSnippet },
              { title: 'تحديث الحالة', value: updateStatusSnippet },
            ].map((snippet) => (
              <div
                key={snippet.title}
                className="rounded-[22px] border border-border/60 bg-background/72 p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-foreground">
                    {snippet.title}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onCopySecret(
                        snippet.value,
                        `تم نسخ مثال ${snippet.title}`,
                      )
                    }
                    className="inline-flex items-center rounded-xl border border-border/60 bg-background/75 px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-background"
                  >
                    <DocumentDuplicateIcon className="ml-1 h-3.5 w-3.5" />
                    نسخ
                  </button>
                </div>
                <pre className="overflow-auto whitespace-pre-wrap break-words rounded-[18px] border border-border/60 bg-foreground/[0.94] p-3 text-xs leading-6 text-background font-mono">
                  {snippet.value}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
};
