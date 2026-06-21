import type { ElementType, ReactNode } from "react"
import { useCallback, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "../../../components/ui/button"

export function useActionModal<TArgs extends Array<unknown> = Array<unknown>>({ onConfirm, confirmLabel, confirmIcon: ConfirmIcon }: {
  onConfirm: (...args: TArgs) => Promise<void> | void;
  confirmLabel: string;
  confirmIcon: ElementType;
}): { isExecuting: boolean; execute: (...args: TArgs) => Promise<void>; renderFooter: (onCancel: () => void, disabled?: boolean) => ReactNode } {
  const [isExecuting, setIsExecuting] = useState(false)

  const execute = useCallback(
    async (...args: TArgs) => {
      if (isExecuting) return
      setIsExecuting(true)
      try {
        await onConfirm(...args)
      } finally {
        setIsExecuting(false)
      }
    },
    [onConfirm, isExecuting],
  )

  function renderFooter(onCancel: () => void, disabled = false): ReactNode {
    return (
      <>
        <Button variant="outline" className="h-11 rounded-2xl" onClick={onCancel}>
          إلغاء
        </Button>
        <Button className="h-11 rounded-2xl" onClick={() => void (execute as (...args: unknown[]) => Promise<void>)()} disabled={isExecuting || disabled}>
          {isExecuting ? <Loader2 className="size-4 animate-spin" /> : <ConfirmIcon className="size-4" />}
          {confirmLabel}
        </Button>
      </>
    )
  }

  return { isExecuting, execute, renderFooter }
}
