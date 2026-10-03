"use client"

import { useEffect, useState } from "react"

export function CachedDriveImage({
  fileId,
  thumbnailUrl,
  alt,
  className,
}: {
  fileId: string
  thumbnailUrl: string
  alt: string
  className?: string
}) {
  const fullUrls = [
    `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}=w2000`,
    `https://drive.google.com/uc?export=view&id=${encodeURIComponent(fileId)}`,
  ]
  const [src, setSrc] = useState(thumbnailUrl)
  const [fullLoaded, setFullLoaded] = useState(false)

  useEffect(() => {
    let active = true
    let candidateIndex = 0
    const fullImage = new window.Image()
    fullImage.decoding = "async"
    fullImage.onload = () => {
      if (!active) return
      setSrc(fullImage.src)
      setFullLoaded(true)
    }
    fullImage.onerror = () => {
      candidateIndex += 1
      if (candidateIndex < fullUrls.length) {
        fullImage.src = fullUrls[candidateIndex]
      } else if (active) {
        setFullLoaded(true)
      }
    }
    fullImage.src = fullUrls[0]

    return () => {
      active = false
    }
  }, [fileId])

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="eager"
      decoding="async"
      fetchPriority="high"
      referrerPolicy="no-referrer"
      onError={() => {
        if (src !== thumbnailUrl) setSrc(thumbnailUrl)
      }}
      data-full-image-loaded={fullLoaded ? "true" : "false"}
    />
  )
}
