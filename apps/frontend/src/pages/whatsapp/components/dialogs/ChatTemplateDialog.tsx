import React, { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button as UiButton } from '@/components/ui/button';
import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogDescription as UiDialogDescription,
  DialogFooter as UiDialogFooter,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
} from '@/components/ui/dialog';
import { Input as UiInput } from '@/components/ui/input';

interface ChatTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: any[];
  loadingTemplates: boolean;
  onSendTemplate: (template: any, variables: Record<string, string>) => void | Promise<void>;
  isSending?: boolean;
}

export const ChatTemplateDialog: React.FC<ChatTemplateDialogProps> = ({
  open,
  onOpenChange,
  templates,
  loadingTemplates,
  onSendTemplate,
  isSending = false,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    const vars: Record<string, string> = {};
    const bodyComp = template.components?.find((c: any) => c.type === 'BODY');
    if (bodyComp?.text) {
      const matches = bodyComp.text.match(/\{\{(\d+)\}\}/g);
      if (matches) {
        for (const match of matches) {
          vars[match] = '';
        }
      }
    }
    setTemplateVariables(vars);
  };

  const handleSend = async () => {
    if (!selectedTemplate) return;
    await onSendTemplate(selectedTemplate, templateVariables);
    setSelectedTemplate(null);
    setTemplateVariables({});
    onOpenChange(false);
  };

  const handleClose = () => {
    if (selectedTemplate) {
      setSelectedTemplate(null);
      setTemplateVariables({});
    } else {
      onOpenChange(false);
    }
  };

  return (
    <UiDialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) {
          setSelectedTemplate(null);
          setTemplateVariables({});
        }
      }}
    >
      <UiDialogContent
        showCloseButton={false}
        className="max-w-2xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <UiDialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <UiDialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
            <FileText className="size-5 text-[color:var(--color-primary)]" />
            <span>{selectedTemplate ? 'تعبئة متغيرات القالب' : 'إرسال قالب معتمد'}</span>
          </UiDialogTitle>
          <UiDialogDescription>
            {selectedTemplate
              ? `املأ المتغيرات للقالب: ${selectedTemplate.name}`
              : 'اختر قالباً معتمداً لإرساله إلى المحادثة الحالية'}
          </UiDialogDescription>
        </UiDialogHeader>

        <div className="max-h-[28rem] space-y-3 overflow-y-auto px-6 py-6">
          {loadingTemplates ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-[color:var(--color-muted-foreground)]" />
            </div>
          ) : !selectedTemplate ? (
            templates.length === 0 ? (
              <p className="py-8 text-center text-sm text-[color:var(--color-muted-foreground)]">
                لا توجد قوالب معتمدة متاحة
              </p>
            ) : (
              templates.map((tmpl: any) => (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl)}
                  className="flex w-full items-start gap-3 rounded-[20px] border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] p-4 text-right transition-all hover:border-[color:var(--color-primary)] hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[color:var(--color-foreground)]">
                      {tmpl.name}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                      {tmpl.language} · {tmpl.category}
                    </p>
                    {tmpl.components?.find((c: any) => c.type === 'BODY')?.text && (
                      <p className="mt-1 line-clamp-2 text-sm text-[color:var(--color-muted-foreground)]">
                        {tmpl.components.find((c: any) => c.type === 'BODY').text}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )
          ) : (
            <div className="space-y-4">
              <div className="rounded-[20px] border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] p-4">
                <p className="mb-2 text-sm font-semibold text-[color:var(--color-foreground)]">
                  {selectedTemplate.name}
                </p>
                {selectedTemplate.components?.map((comp: any, idx: number) => (
                  <div key={idx} className="mb-2 last:mb-0">
                    {comp.type === 'HEADER' && comp.text && (
                      <p className="text-sm font-medium text-[color:var(--color-primary)]">
                        {comp.text}
                      </p>
                    )}
                    {comp.type === 'BODY' && (
                      <p className="whitespace-pre-wrap text-sm leading-6 text-[color:var(--color-foreground)]">
                        {comp.text?.replace(/\{\{(\d+)\}\}/g, (_: string, num: string) =>
                          templateVariables[`{{${num}}}`] || `{{${num}}}`
                        )}
                      </p>
                    )}
                    {comp.type === 'FOOTER' && comp.text && (
                      <p className="mt-1 text-xs text-[color:var(--color-muted-foreground)]">
                        {comp.text}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {Object.keys(templateVariables).length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    المتغيرات
                  </p>
                  {Object.keys(templateVariables)
                    .sort((a, b) => {
                      const numA = parseInt(a.replace(/\D/g, '')) || 0;
                      const numB = parseInt(b.replace(/\D/g, '')) || 0;
                      return numA - numB;
                    })
                    .map((key) => (
                      <UiInput
                        key={key}
                        value={templateVariables[key]}
                        onChange={(e) =>
                          setTemplateVariables((prev) => ({ ...prev, [key]: e.target.value }))
                        }
                        className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
                        placeholder={`المتغير ${key}`}
                      />
                    ))}
                </div>
              )}

              {Object.keys(templateVariables).length === 0 && (
                <p className="text-sm text-[color:var(--color-muted-foreground)]">
                  هذا القالب لا يحتوي على متغيرات
                </p>
              )}
            </div>
          )}
        </div>

        <UiDialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)]">
          <UiButton variant="outline" onClick={handleClose}>
            {selectedTemplate ? 'رجوع' : 'إلغاء'}
          </UiButton>
          {selectedTemplate && (
            <UiButton
              onClick={handleSend}
              disabled={
                isSending ||
                (Object.keys(templateVariables).length > 0 &&
                  Object.values(templateVariables).some((v) => !v.trim()))
              }
            >
              {isSending ? <Loader2 className="size-4 animate-spin me-2" /> : null}
              <span>إرسال القالب</span>
            </UiButton>
          )}
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  );
};

export default ChatTemplateDialog;
