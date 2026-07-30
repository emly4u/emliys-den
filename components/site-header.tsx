import Link from "next/link"
import { Home } from "lucide-react"
import { SyncButton } from "./sync-button"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Home className="size-5" aria-hidden="true" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-serif text-xl font-semibold tracking-tight text-foreground">
              Emily&apos;s Den
            </span>
            <span className="text-xs text-muted-foreground">A cozy image gallery</span>
          </span>
        </Link>
        <SyncButton />
      </div>
    </header>
  )
}
