import React, { useState } from 'react';
import { AlertTriangle, Check, X, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  type?: 'danger' | 'warning' | 'info';
  itemName?: string;
  itemDetails?: string;
  consequences?: string[];
  requireTyping?: boolean;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText = 'تأكيد',
  type = 'danger',
  itemName,
  itemDetails,
  consequences = [],
  requireTyping = false,
  loading = false,
}) => {
  const [typedText, setTypedText] = useState('');
  const requiredText = 'حذف';

  const handleConfirm = () => {
    if (requireTyping && typedText !== requiredText) {
      return;
    }
    onConfirm();
    setTypedText('');
  };

  const handleClose = () => {
    setTypedText('');
    onOpenChange(false);
  };

  const colorConfig = {
    danger: {
      bg: 'bg-destructive/10',
      border: 'border-destructive/20',
      text: 'text-destructive',
      title: 'text-destructive',
      icon: 'text-destructive',
      button: 'destructive' as const,
    },
    warning: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-600 dark:text-amber-400',
      title: 'text-amber-600 dark:text-amber-400',
      icon: 'text-amber-500',
      button: 'default' as const,
    },
    info: {
      bg: 'bg-primary/10',
      border: 'border-primary/20',
      text: 'text-primary',
      title: 'text-primary',
      icon: 'text-primary',
      button: 'default' as const,
    },
  }[type];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-card border-border/80 text-foreground" dir="rtl">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 text-sm sm:text-base font-bold ${colorConfig.title}`}>
            <AlertTriangle className={`h-4.5 w-4.5 shrink-0 ${colorConfig.icon}`} />
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3.5 py-1">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>

          {itemName && (
            <div className={`p-3.5 ${colorConfig.bg} border ${colorConfig.border} rounded-xl text-xs space-y-1`}>
              <p className={`font-semibold ${colorConfig.text}`}>{itemName}</p>
              {itemDetails && (
                <p className="text-muted-foreground leading-relaxed">{itemDetails}</p>
              )}
            </div>
          )}

          {consequences.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>تحذير: هذا الإجراء سيؤدي إلى:</span>
              </div>
              <ul className="text-xs text-amber-700/90 dark:text-amber-300/90 space-y-1 list-disc list-inside">
                {consequences.map((consequence, index) => (
                  <li key={index} className="leading-relaxed">{consequence}</li>
                ))}
              </ul>
            </div>
          )}

          {requireTyping && (
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs text-foreground font-medium">
                اكتب "<strong>{requiredText}</strong>" للتأكيد:
              </Label>
              <Input
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder={requiredText}
                className="text-center font-bold text-xs bg-muted/40 border-border/70 focus:ring-primary/40 text-foreground"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="text-xs cursor-pointer border-border/70 hover:bg-muted"
          >
            <X className="h-3.5 w-3.5 ml-1.5" />
            <span>إلغاء</span>
          </Button>
          <Button
            type="button"
            variant={colorConfig.button}
            onClick={handleConfirm}
            disabled={
              loading || (requireTyping && typedText !== requiredText)
            }
            className="text-xs cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 ml-1.5 animate-spin" />
                <span>جاري المعالجة...</span>
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5 ml-1.5" />
                <span>{confirmText}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConfirmDialog;
