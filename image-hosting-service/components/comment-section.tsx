"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { ArrowBigDown, ArrowBigUp, MessageCircle, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addComment, voteComment } from "@/app/actions/gallery"
import type { CommentRow } from "@/lib/db/schema"

type Vote = "up" | "down"

function timeAgo(date: Date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  const units: [number, string][] = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [4.35, "w"],
    [12, "mo"],
    [Number.POSITIVE_INFINITY, "y"],
  ]
  let value = seconds
  let unit = "s"
  let acc = 1
  for (let i = 0; i < units.length; i++) {
    const [size, label] = units[i]
    if (value < size) {
      unit = label
      break
    }
    acc *= size
    value = seconds / acc
    unit = label
  }
  return `${Math.max(1, Math.floor(value))}${unit} ago`
}

export function CommentSection({
  imageId,
  initialComments,
}: {
  imageId: number
  initialComments: CommentRow[]
}) {
  const [comments, setComments] = useState(initialComments)
  const [votes, setVotes] = useState<Record<number, Vote>>({})
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  // Load previously cast votes from localStorage (anonymous, per-browser).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("emilys-den-votes")
      if (raw) setVotes(JSON.parse(raw))
    } catch {
      // ignore
    }
  }, [])

  function persistVotes(next: Record<number, Vote>) {
    setVotes(next)
    try {
      localStorage.setItem("emilys-den-votes", JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  function handleVote(commentId: number, direction: Vote) {
    const current = votes[commentId]
    if (current === direction) return // already voted this way

    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c
        let { upvotes, downvotes } = c
        // remove the opposite vote if switching
        if (current === "up") upvotes -= 1
        if (current === "down") downvotes -= 1
        if (direction === "up") upvotes += 1
        else downvotes += 1
        return { ...c, upvotes, downvotes }
      }),
    )
    persistVotes({ ...votes, [commentId]: direction })

    startTransition(async () => {
      // Apply the new vote. When switching, also counter the old one.
      await voteComment(commentId, imageId, direction)
      if (current === "up") await voteComment(commentId, imageId, "down")
      if (current === "down") await voteComment(commentId, imageId, "up")
    })
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    const body = String(formData.get("body") ?? "").trim()
    const author = String(formData.get("author") ?? "").trim()
    if (!body) {
      setError("Comment cannot be empty.")
      return
    }

    // Optimistic insert
    const optimistic: CommentRow = {
      id: -Date.now(),
      imageId,
      author: author || null,
      body,
      upvotes: 0,
      downvotes: 0,
      createdAt: new Date(),
    }
    setComments((prev) => [optimistic, ...prev])
    formRef.current?.reset()

    startTransition(async () => {
      const res = await addComment(imageId, formData)
      if (res?.error) {
        setError(res.error)
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id))
      }
    })
  }

  const sorted = [...comments].sort(
    (a, b) => b.upvotes - b.downvotes - (a.upvotes - a.downvotes),
  )

  return (
    <section aria-label="Comments" className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="size-5 text-primary" aria-hidden="true" />
        <h2 className="font-serif text-xl font-semibold">
          {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
        </h2>
      </div>

      <form
        ref={formRef}
        action={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4"
      >
        <input
          name="author"
          placeholder="Your name (optional)"
          maxLength={60}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <textarea
          name="body"
          placeholder="Share a thought..."
          rows={3}
          maxLength={2000}
          className="w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              (e.metaKey || e.ctrlKey) &&
              !e.nativeEvent.isComposing &&
              e.keyCode !== 229
            ) {
              e.preventDefault()
              if (formRef.current) handleSubmit(new FormData(formRef.current))
            }
          }}
        />
        <div className="flex items-center justify-between gap-3">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Press ⌘/Ctrl + Enter to post</p>
          )}
          <Button type="submit" disabled={isPending} className="gap-2">
            <Send className="size-4" aria-hidden="true" />
            Post
          </Button>
        </div>
      </form>

      <ul className="flex flex-col gap-3">
        {sorted.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            No comments yet. Be the first to say something nice.
          </li>
        )}
        {sorted.map((comment) => {
          const score = comment.upvotes - comment.downvotes
          const myVote = votes[comment.id]
          return (
            <li
              key={comment.id}
              className="flex gap-3 rounded-2xl border border-border/60 bg-card p-4"
            >
              <div className="flex flex-col items-center gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleVote(comment.id, "up")}
                  aria-label="Upvote"
                  aria-pressed={myVote === "up"}
                  className={`rounded-md p-1 transition-colors hover:bg-accent ${
                    myVote === "up" ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <ArrowBigUp className="size-5" fill={myVote === "up" ? "currentColor" : "none"} />
                </button>
                <span
                  className={`min-w-6 text-center text-sm font-semibold tabular-nums ${
                    score > 0
                      ? "text-primary"
                      : score < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                  }`}
                >
                  {score}
                </span>
                <button
                  type="button"
                  onClick={() => handleVote(comment.id, "down")}
                  aria-label="Downvote"
                  aria-pressed={myVote === "down"}
                  className={`rounded-md p-1 transition-colors hover:bg-accent ${
                    myVote === "down" ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  <ArrowBigDown
                    className="size-5"
                    fill={myVote === "down" ? "currentColor" : "none"}
                  />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-foreground">
                    {comment.author || "Anonymous"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(new Date(comment.createdAt))}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-pretty leading-relaxed text-foreground/90">
                  {comment.body}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
