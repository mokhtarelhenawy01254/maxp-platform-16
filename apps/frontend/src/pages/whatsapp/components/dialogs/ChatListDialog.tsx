import React, { useState } from 'react';
import { List as ListIcon, PlusCircle, Trash2, X } from 'lucide-react';
import { Button as UiButton } from '@/components/ui/button';
import {
  Dialog as UiDialog,
  DialogContent as UiDialogContent,
  DialogFooter as UiDialogFooter,
  DialogHeader as UiDialogHeader,
  DialogTitle as UiDialogTitle,
} from '@/components/ui/dialog';
import { Input as UiInput } from '@/components/ui/input';
import { Textarea as UiTextarea } from '@/components/ui/textarea';
import type { ListData, ListSection } from '../../chat/types/whatsappChatTypes';

interface ChatListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendList: (listData: ListData) => void | Promise<void>;
}

export const ChatListDialog: React.FC<ChatListDialogProps> = ({
  open,
  onOpenChange,
  onSendList,
}) => {
  const [listData, setListData] = useState<ListData>({
    text: '',
    buttonText: 'اختر',
    title: '',
    sections: [{ title: 'القسم 1', rows: [{ id: '1', title: '', description: '' }] }],
  });

  const handleSend = async () => {
    await onSendList(listData);
    setListData({
      text: '',
      buttonText: 'اختر',
      title: '',
      sections: [{ title: 'القسم 1', rows: [{ id: '1', title: '', description: '' }] }],
    });
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <UiDialog open={open} onOpenChange={onOpenChange}>
      <UiDialogContent
        showCloseButton={false}
        className="max-w-4xl gap-0 rounded-[28px] border border-[color:var(--shell-control-border)] bg-[var(--app-panel-bg)] p-0"
      >
        <UiDialogHeader className="border-b border-[color:var(--shell-control-border)] px-6 py-5">
          <UiDialogTitle className="flex items-center gap-2 text-lg text-[color:var(--color-foreground)]">
            <ListIcon className="size-5 text-[color:var(--color-primary)]" />
            <span>إرسال رسالة بقائمة</span>
          </UiDialogTitle>
        </UiDialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
              نص الرسالة
            </label>
            <UiTextarea
              rows={3}
              value={listData.text}
              placeholder="اكتب نص الرسالة الرئيسي هنا..."
              onChange={(e) => setListData((prev) => ({ ...prev, text: e.target.value }))}
              className="rounded-[20px] bg-[var(--whatsapp-surface-strong)]"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
                عنوان القائمة
              </label>
              <UiInput
                value={listData.title}
                placeholder="عنوان القائمة"
                onChange={(e) => setListData((prev) => ({ ...prev, title: e.target.value }))}
                className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-[color:var(--color-foreground)]">
                نص الزر
              </label>
              <UiInput
                value={listData.buttonText}
                placeholder="مثال: اختر من القائمة"
                onChange={(e) => setListData((prev) => ({ ...prev, buttonText: e.target.value }))}
                className="h-11 rounded-[18px] bg-[var(--whatsapp-surface-strong)]"
              />
            </div>
          </div>

          <div className="space-y-3">
            {listData.sections.map((section, sIndex) => (
              <div
                key={`${section.title}-${sIndex}`}
                className="space-y-3 rounded-[24px] border border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface)] p-4"
              >
                <div className="flex items-center gap-2">
                  <UiInput
                    value={section.title}
                    onChange={(e) => {
                      const newSections = [...listData.sections];
                      newSections[sIndex] = { ...section, title: e.target.value };
                      setListData((prev) => ({ ...prev, sections: newSections }));
                    }}
                    className="h-10 rounded-[16px] bg-[var(--whatsapp-surface-elevated)]"
                    placeholder="عنوان القسم"
                  />
                  {listData.sections.length > 1 ? (
                    <UiButton
                      variant="ghost"
                      size="icon-sm"
                      className="rounded-full text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                      onClick={() =>
                        setListData((prev) => ({
                          ...prev,
                          sections: prev.sections.filter((_, itemIndex) => itemIndex !== sIndex),
                        }))
                      }
                      aria-label="حذف القسم"
                    >
                      <Trash2 className="size-4" />
                    </UiButton>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {section.rows.map((row, rIndex) => (
                    <div key={row.id} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                      <UiInput
                        value={row.title}
                        placeholder="العنوان"
                        onChange={(e) => {
                          const newSections = [...listData.sections];
                          if (newSections[sIndex]?.rows[rIndex]) {
                            newSections[sIndex]!.rows[rIndex] = { ...row, title: e.target.value };
                            setListData((prev) => ({ ...prev, sections: newSections }));
                          }
                        }}
                        className="h-10 rounded-[16px] bg-[var(--whatsapp-surface-elevated)]"
                      />
                      <UiInput
                        value={row.description}
                        placeholder="الوصف"
                        onChange={(e) => {
                          const newSections = [...listData.sections];
                          if (newSections[sIndex]?.rows[rIndex]) {
                            newSections[sIndex]!.rows[rIndex] = { ...row, description: e.target.value };
                            setListData((prev) => ({ ...prev, sections: newSections }));
                          }
                        }}
                        className="h-10 rounded-[16px] bg-[var(--whatsapp-surface-elevated)]"
                      />
                      {section.rows.length > 1 ? (
                        <UiButton
                          variant="ghost"
                          size="icon-sm"
                          className="rounded-full text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                          onClick={() => {
                            const newSections = [...listData.sections];
                            if (newSections[sIndex]) {
                              newSections[sIndex]!.rows = section.rows.filter((_, itemIndex) => itemIndex !== rIndex);
                              setListData((prev) => ({ ...prev, sections: newSections }));
                            }
                          }}
                          aria-label="حذف العنصر"
                        >
                          <X className="size-4" />
                        </UiButton>
                      ) : null}
                    </div>
                  ))}
                  <UiButton
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newSections = [...listData.sections];
                      if (newSections[sIndex]) {
                        newSections[sIndex]!.rows.push({
                          id: String(section.rows.length + 1),
                          title: '',
                          description: '',
                        });
                        setListData((prev) => ({ ...prev, sections: newSections }));
                      }
                    }}
                  >
                    <PlusCircle className="size-4" />
                    <span>إضافة عنصر</span>
                  </UiButton>
                </div>
              </div>
            ))}
          </div>

          {listData.sections.length < 10 ? (
            <UiButton
              variant="outline"
              onClick={() =>
                setListData((prev) => ({
                  ...prev,
                  sections: [
                    ...prev.sections,
                    {
                      title: `القسم ${prev.sections.length + 1}`,
                      rows: [{ id: '1', title: '', description: '' }],
                    },
                  ],
                }))
              }
            >
              <PlusCircle className="size-4" />
              <span>إضافة قسم</span>
            </UiButton>
          ) : null}
        </div>

        <UiDialogFooter className="border-t border-[color:var(--shell-control-border)] bg-[var(--whatsapp-surface-overlay)]">
          <UiButton variant="outline" onClick={handleClose}>
            إلغاء
          </UiButton>
          <UiButton onClick={handleSend} disabled={!listData.text.trim()}>
            إرسال
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialog>
  );
};

export default ChatListDialog;
