import { useCallback, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "../../../components/ui/button"

export function useActionModal({ onConfirm, confirmLabel, confirmIcon: ConfirmIcon }) {
  const [isExecuting, setIsExecuting] = useState(false)

  const execute = useCallback(
    async (...args) => {
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

  function renderFooter(onCancel, disabled = false) {
    return (
      <>
        <Button variant="outline" className="h-11 rounded-2xl" onClick={onCancel}>
          إلغاء
        </Button>
        <Button className="h-11 rounded-2xl" onClick={execute} disabled={isExecuting || disabled}>
          {isExecuting ? <Loader2 className="size-4 animate-spin" /> : <ConfirmIcon className="size-4" />}
          {confirmLabel}
        </Button>
      </>
    )
  }

  return { isExecuting, execute, renderFooter }
}
