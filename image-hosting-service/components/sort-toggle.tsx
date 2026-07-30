"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { Clock, Flame } from "lucide-react"
import type { ImageSort } from "@/lib/images"

const OPTIONS: { value: ImageSort; label: string; icon: typeof Clock }[] = [
  { value: "new", label: "New", icon: Clock },
  { value: "popular", label: "Popular", icon: Flame },
]

export function SortToggle({ current }: { current: ImageSort }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  function select(value: ImageSort) {
    if (value === current) return
    const params = new URLSearchParams(searchParams.toString())
    if (value === "new") params.delete("sort")
    else params.set("sort", value)
    const query = params.toString()
    startTransition(() => {
      router.push(query ? `/?${query}` : "/", { scroll: false })
    })
  }

  return (
    <div
      role="group"
      aria-label="Sort images"
      className={`inline-flex items-center gap-1 rounded-full border border-border/60 bg-card p-1 ${
        isPending ? "opacity-70" : ""
      }`}
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = value === current
        return (
          <button
            key={value}
            type="button"
            onClick={() => select(value)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
