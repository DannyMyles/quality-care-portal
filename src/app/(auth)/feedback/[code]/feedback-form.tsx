"use client"

import { useState, useTransition } from "react"
import { CheckCircle2 } from "@/components/icons"
import { LoadingButton } from "@/components/shared/loading-button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { submitFeedback } from "@/lib/actions"

const QUESTIONS = [
  { field: "overall", label: "Overall, how was the training?", required: true },
  { field: "instructor", label: "The instructor" },
  { field: "content", label: "What was taught" },
  { field: "venue", label: "The venue and equipment" },
] as const
const WORDS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"]

function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={`size-8 ${filled ? "fill-[#F5B400] stroke-[#E0A200]" : "fill-none stroke-[#B9BCD3]"}`} strokeWidth={1.5} strokeLinejoin="round">
      <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" />
    </svg>
  )
}

/** One question's 1 to 5 rating: a radio group, so it works by keyboard and with a screen reader. */
function Rating({ field, label, required, value, onChange }: { field: string; label: string; required?: boolean; value: number; onChange: (value: number) => void }) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-sm font-medium text-[#12133D]">
        {label}
        {required && <span aria-hidden className="text-[#B5152A]"> *</span>}
      </legend>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((score) => (
          <label key={score} className="cursor-pointer rounded-md p-0.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#2E3094]">
            <input type="radio" name={field} value={score} checked={value === score} onChange={() => onChange(score)} className="sr-only" />
            <span className="sr-only">{score} out of 5, {WORDS[score]}</span>
            <Star filled={value >= score} />
          </label>
        ))}
        <span className="ml-2 text-sm text-[#6A6C8C]" aria-hidden>{WORDS[value]}</span>
      </div>
    </fieldset>
  )
}

export function FeedbackForm({ code }: { code: string }) {
  const [contact, setContact] = useState("")
  const [ratings, setRatings] = useState<Record<string, number>>({ overall: 0, instructor: 0, content: 0, venue: 0 })
  const [recommend, setRecommend] = useState("")
  const [liked, setLiked] = useState("")
  const [improve, setImprove] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [pending, start] = useTransition()

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-xl bg-[#0AC6A2]/15 px-4 py-6 text-center text-[#056D59]">
        <CheckCircle2 className="size-8" />
        <p className="font-semibold">Thank you for your feedback</p>
        <p className="text-sm">It helps us make the next class better.</p>
      </div>
    )
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!contact.trim()) return setError("Enter the phone number or email you registered with.")
    if (!ratings.overall) return setError("Please give the training an overall rating.")
    setError(null)
    start(async () => {
      const result = await submitFeedback(code, { contact: contact.trim(), ...Object.fromEntries(Object.entries(ratings).map(([key, value]) => [key, value || null])), recommend: recommend || null, liked, improve })
      if (result.ok) setSent(true)
      else setError(result.error)
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="contact">Your phone number or email<span aria-hidden className="text-[#B5152A]"> *</span></Label>
        <Input id="contact" value={contact} autoComplete="tel" placeholder="The one you registered with" onChange={(event) => { setContact(event.target.value); setError(null) }} />
        <p className="text-xs text-[#6A6C8C]">So we know you were on this class. Your trainer sees your answers.</p>
      </div>
      {QUESTIONS.map((question) => (
        <Rating key={question.field} field={question.field} label={question.label} required={"required" in question} value={ratings[question.field]} onChange={(value) => setRatings((current) => ({ ...current, [question.field]: value }))} />
      ))}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-[#12133D]">Would you recommend us to a colleague?</legend>
        <div className="flex gap-2">
          {["Yes", "No"].map((answer) => (
            <label key={answer} className={`flex h-10 cursor-pointer items-center rounded-lg border px-4 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#2E3094] ${recommend === answer ? "border-[#2E3094] bg-[#2E3094] text-white" : "border-[#E3E5F1] bg-white"}`}>
              <input type="radio" name="recommend" value={answer} checked={recommend === answer} onChange={() => setRecommend(answer)} className="sr-only" />
              {answer}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="liked">What went well?</Label>
        <Textarea id="liked" value={liked} maxLength={2000} onChange={(event) => setLiked(event.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="improve">What could we do better?</Label>
        <Textarea id="improve" value={improve} maxLength={2000} onChange={(event) => setImprove(event.target.value)} />
      </div>
      {error && <p role="alert" className="rounded-lg bg-[#EB2239]/10 px-3 py-2 text-sm text-[#87000A]">{error}</p>}
      <LoadingButton type="submit" loading={pending} loadingText="Sending" className="h-11">Send feedback</LoadingButton>
    </form>
  )
}
