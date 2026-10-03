"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

// Adsterra units. The keys and URLs are public (they appear in page markup).
type BannerUnit = { key: string; width: number; height: number }

const LEADERBOARD: BannerUnit = { key: "5886a3f0b13b2c7376c81f54cbb661a2", width: 728, height: 90 }
const MOBILE_BANNER: BannerUnit = { key: "57d230052a69423ff827502434658d5f", width: 320, height: 50 }
const RECTANGLE: BannerUnit = { key: "a8ed7b64e96d0837a4df314ce4fe16da", width: 300, height: 250 }
const INLINE_BANNER: BannerUnit = { key: "b31adbd3f6d6aae627a673e5f40c03d8", width: 468, height: 60 }
const SKYSCRAPER: BannerUnit = { key: "c56cee194a4d1b24830b09af20d13091", width: 160, height: 600 }
const HALF_SKYSCRAPER: BannerUnit = { key: "6dc2c7111cf540e9cc06fa69bda599e4", width: 160, height: 300 }

const SPONSORED_URL = "https://asiaso.org/4/08d731bbb2685e0aac1f63b9c40e9689"

/** Tracks a media query on the client. Null until the first measurement, so no unit loads for the wrong size. */
function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null)

  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener("change", update)
    return () => list.removeEventListener("change", update)
  }, [query])

  return matches
}

// Adsterra's invoke.js writes its iframe with document.write, which only works in a
// parser-inserted script. A sandboxed srcDoc frame provides that and keeps the
// third-party script isolated from this site (no allow-same-origin).
function BannerFrame({ unit }: { unit: BannerUnit }) {
  const { key, width, height } = unit
  const srcDoc = `<!doctype html><html><body style="margin:0;overflow:hidden;background:transparent"><script>atOptions={'key':'${key}','format':'iframe','height':${height},'width':${width},'params':{}};</script><script src="https://brijmohan.org/22/${key}"></script></body></html>`

  return (
    <iframe
      title="Advertisement"
      srcDoc={srcDoc}
      width={width}
      height={height}
      scrolling="no"
      loading="lazy"
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
      // The page declares a dark color scheme, so a light srcDoc frame gets an opaque white
      // backdrop. Matching the frame's scheme to its (light) document keeps empty slots transparent.
      className="mx-auto block max-w-full border-0 [color-scheme:light]"
    />
  )
}

function AdWrapper({ unit, className }: { unit: BannerUnit; className?: string }) {
  return (
    <div className={className} aria-label="Advertisement">
      <BannerFrame unit={unit} />
    </div>
  )
}

export function RectangleAd({ className }: { className?: string }) {
  return <AdWrapper unit={RECTANGLE} className={className} />
}

/** 728x90 on desktop, 320x50 on small screens. Only the matching unit is loaded. */
export function ResponsiveBannerAd({ className }: { className?: string }) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  if (isDesktop === null) return null
  return <AdWrapper unit={isDesktop ? LEADERBOARD : MOBILE_BANNER} className={className} />
}

/** 468x60, shown only where it fits (sm and up). */
export function InlineBannerAd({ className }: { className?: string }) {
  const fits = useMediaQuery("(min-width: 640px)")
  if (!fits) return null
  return <AdWrapper unit={INLINE_BANNER} className={className} />
}

/** 160px rails in the side margins of very wide screens. */
export function SideRails() {
  const wide = useMediaQuery("(min-width: 1700px)")
  if (!wide) return null

  return (
    <>
      <div className="fixed left-4 top-28 z-10" aria-label="Advertisement">
        <BannerFrame unit={SKYSCRAPER} />
      </div>
      <div className="fixed right-4 top-28 z-10" aria-label="Advertisement">
        <BannerFrame unit={HALF_SKYSCRAPER} />
      </div>
    </>
  )
}

// Click-triggered pop ads (Adsterra). They load for only a fraction of visits.
const POP_SCRIPTS = [
  "https://ahuramazda.org/1/c5bd1cbe2c53b72ddde17d3a14862897",
  "https://brijmohan.org/14/be17538ff39bbb3b5032c3dc9b449c9b",
]
const POP_CHANCE = 0.3

let popInjected = false

/**
 * Rolls on every page load and every in-site navigation. On a hit, injects the pop
 * scripts (once; a script that has loaded cannot be unloaded until the next full
 * page load). Renders nothing.
 */
export function PopAds() {
  const pathname = usePathname()

  useEffect(() => {
    if (popInjected || Math.random() >= POP_CHANCE) return
    popInjected = true

    for (const src of POP_SCRIPTS) {
      const script = document.createElement("script")
      script.async = true
      script.dataset.cfasync = "false"
      script.src = src
      document.body.appendChild(script)
    }
  }, [pathname])

  return null
}

export function SponsoredLink({ className }: { className?: string }) {
  return (
    <p className={className}>
      <a
        href={SPONSORED_URL}
        target="_blank"
        rel="sponsored noopener noreferrer"
        className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Sponsored link
      </a>
    </p>
  )
}
