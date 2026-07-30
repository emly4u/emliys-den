"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { triggerSync } from "@/app/actions/gallery"

export function SyncButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)

  function handleSync() {
    setMessage(null)
    setIsError(false)
    startTransition(async () => {
      try {
        const result = await triggerSync()
        if (result.error) {
          setIsError(true)
          setMessage(result.error)
        } else if (result.imported > 0) {
          setMessage(`Imported ${result.imported} new`)
          router.refresh()
        } else {
          setMessage("Up to date")
          router.refresh()
        }
      } catch {
        setIsError(true)
        setMessage("Sync failed. Please try again.")
      }
      setTimeout(() => setMessage(null), isError ? 8000 : 4000)
    })
  }

  return (
    <div className="flex items-center gap-3">
      {message && (
        <span
          className={`max-w-xs text-sm ${isError ? "text-destructive" : "text-muted-foreground"} hidden sm:inline`}
          aria-live="polite"
        >
          {message}
        </span>
      )}
      <Button onClick={handleSync} disabled={isPending} variant="secondary" size="sm">
        <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} aria-hidden="true" />
        {isPending ? "Syncing" : "Sync now"}
      </Button>
    </div>
  )
}
