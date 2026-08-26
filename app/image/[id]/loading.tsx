import { LoaderCircle } from "lucide-react"
import { SiteHeader } from "@/components/site-header"

export default function ImageLoading() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 md:px-6 md:py-10">
        <div className="h-5 w-32 rounded-md bg-muted" />
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="flex min-h-[55vh] items-center justify-center rounded-2xl border border-border/60 bg-card text-muted-foreground">
            <span className="flex items-center gap-2 text-sm" role="status">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Opening image
            </span>
          </div>
          <div className="hidden min-h-80 rounded-2xl border border-border/60 bg-card lg:block" />
        </div>
      </main>
    </div>
  )
}
