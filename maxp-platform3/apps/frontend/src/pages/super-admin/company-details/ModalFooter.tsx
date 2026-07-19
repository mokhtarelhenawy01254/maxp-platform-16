import type { ElementType } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "../../../components/ui/button"

export function ModalFooter({
  loading,
  onCancel,
  onConfirm,
  confirmLabel,
  confirmIcon: ConfirmIcon,
  disabled,
}: {
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmIcon: ElementType;
  disabled?: boolean;
}) {
  return (
    <>
      <Button variant="outline" className="h-11 rounded-2xl" onClick={onCancel}>
        إلغاء
      </Button>
      <Button className="h-11 rounded-2xl" onClick={onConfirm} disabled={loading || disabled}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <ConfirmIcon className="size-4" />}
        {confirmLabel}
      </Button>
    </>
  )
}
