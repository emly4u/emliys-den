"use client"

import { useState } from "react"
import { Check, Link2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CopyLink({ url, label = "Copy image link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Fallback for browsers without clipboard permissions
      const el = document.createElement("textarea")
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button onClick={handleCopy} variant={copied ? "secondary" : "default"} className="gap-2">
      {copied ? (
        <>
          <Check className="size-4" aria-hidden="true" />
          Copied!
        </>
      ) : (
        <>
          <Link2 className="size-4" aria-hidden="true" />
          {label}
        </>
      )}
    </Button>
  )
}
