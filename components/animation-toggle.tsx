"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Sparkles } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"

const KEY = "emilys-den-motion"
const EVENT = "emilys-den-motion-change"

export function AnimationToggle() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY)
    const value = saved !== "off"
    setEnabled(value)
    document.documentElement.dataset.motion = value ? "on" : "off"
    const sync = () => setEnabled(document.documentElement.dataset.motion !== "off")
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])

  function toggle() {
    const next = !enabled
    setEnabled(next)
    window.localStorage.setItem(KEY, next ? "on" : "off")
    document.documentElement.dataset.motion = next ? "on" : "off"
    window.dispatchEvent(new Event(EVENT))
  }

  return <button type="button" onClick={toggle} aria-pressed={enabled} title={`${enabled ? "Disable" : "Enable"} image motion`} className={buttonVariants({ variant: "outline", size: "sm", className: "gap-2" })}><Sparkles className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">Motion {enabled ? "on" : "off"}</span></button>
}

export function ImageMotionButton() {
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    setEnabled(document.documentElement.dataset.motion !== "off")
    const sync = () => setEnabled(document.documentElement.dataset.motion !== "off")
    window.addEventListener(EVENT, sync)
    return () => window.removeEventListener(EVENT, sync)
  }, [])

  function toggle() {
    const next = !enabled
    setEnabled(next)
    window.localStorage.setItem(KEY, next ? "on" : "off")
    document.documentElement.dataset.motion = next ? "on" : "off"
    window.dispatchEvent(new Event(EVENT))
  }

  return <button type="button" onClick={toggle} aria-pressed={enabled} className={buttonVariants({ variant: "outline", size: "sm", className: "gap-2" })}><Sparkles className="size-4" aria-hidden="true" /> Motion {enabled ? "on" : "off"}</button>
}

export function MotionImage({ children }: { children: ReactNode }) {
  return <div className="image-motion" data-motion-image>{children}</div>
}

export const motionEventName = EVENT
export const motionStorageKey = KEY
