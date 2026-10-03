import Link from "next/link"
import { Home, Library } from "lucide-react"
import { SyncButton } from "./sync-button"
import { ThemeToggle } from "./theme-toggle"
import { AnimationToggle } from "./animation-toggle"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8 md:py-5">
        <Link href="/" className="group flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-6">
            <Home className="size-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-serif text-xl font-semibold tracking-tight text-foreground">Emily&apos;s Den</span>
            <span className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><Library className="size-3" aria-hidden="true" /> Image archive</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <AnimationToggle />
          <SyncButton />
        </div>
      </div>
    </header>
  )
}
