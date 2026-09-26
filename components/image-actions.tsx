"use client"

import { useState } from "react"
import { Check, Download, ExternalLink, MessageCircle, Share2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

export function ImageActions({ imageName, driveUrl, downloadUrl }: { imageName: string; driveUrl: string; downloadUrl: string }) {
  const [copied, setCopied] = useState(false)

  async function shareImage() {
    const pageUrl = window.location.href
    if (navigator.share) {
      await navigator.share({ title: imageName, text: `Emily Kate — ${imageName}`, url: pageUrl })
      return
    }
    await navigator.clipboard.writeText(pageUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  function sendToChatGPT() {
    const prompt = `This is Emily Kate, Age 19 from "${window.location.host}". Please describe this image neutrally and safely.`
    window.open(`https://chatgpt.com/?prompt=${encodeURIComponent(prompt)}&url=${encodeURIComponent(window.location.href)}`, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href={driveUrl} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", className: "gap-2" })}>
        <ExternalLink className="size-4" aria-hidden="true" /> Open in Drive
      </a>
      <a href={downloadUrl} download={`${imageName}.jpg`} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline", className: "gap-2" })}><Download className="size-4" aria-hidden="true" /> Download</a>
      <button type="button" onClick={shareImage} className={buttonVariants({ variant: "outline", className: "gap-2" })}>
        {copied ? <Check className="size-4" aria-hidden="true" /> : <Share2 className="size-4" aria-hidden="true" />}
        {copied ? "Link copied" : "Share"}
      </button>
      <button type="button" onClick={sendToChatGPT} className={buttonVariants({ variant: "outline", className: "gap-2" })}><MessageCircle className="size-4" aria-hidden="true" /> Send to ChatGPT</button>
      <a className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground" href={`https://x.com/intent/post?url=${encodeURIComponent(driveUrl)}`} target="_blank" rel="noopener noreferrer">Share on X</a>
      <a className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(driveUrl)}`} target="_blank" rel="noopener noreferrer">Facebook</a>
    </div>
  )
}

