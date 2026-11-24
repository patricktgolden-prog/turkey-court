"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { LIMITS, PLEAS } from "@/lib/judge"
import { SAMPLE_CASES } from "@/lib/sample-cases"

const EMPTY = { turkey: "", alleged_crime: "", plea: "not guilty", argument: "" }

const inputClass =
  "rounded-card border-2 border-border bg-surface px-4 py-3 text-base shadow-block outline-none focus-visible:ring-2 focus-visible:ring-primary"

export function CaseForm() {
  const router = useRouter()
  const [fields, setFields] = useState(EMPTY)
  const [sampleIndex, setSampleIndex] = useState(0)
  const [sampleNote, setSampleNote] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState<{ tone: "error" | "blocked"; text: string } | null>(null)

  const set = (key: keyof typeof EMPTY) => (value: string) => setFields((f) => ({ ...f, [key]: value }))

  function loadSample() {
    const sample = SAMPLE_CASES[sampleIndex % SAMPLE_CASES.length]
    setFields({
      turkey: sample.turkey,
      alleged_crime: sample.alleged_crime,
      plea: sample.plea,
      argument: sample.argument,
    })
    setSampleNote(sample.note === "none" ? null : sample.note)
    setSampleIndex((i) => i + 1)
    setMessage(null)
  }

  async function submit() {
    if (pending) return
    setPending(true)
    setMessage(null)
    const response = await fetch("/api/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(fields),
    })
    const data = (await response.json().catch(() => ({}))) as { error?: string; guardrail?: string }
    setPending(false)

    if (!response.ok) {
      setMessage({
        tone: data.guardrail === "blocked" ? "blocked" : "error",
        text: data.error ?? "Something went wrong.",
      })
      return
    }
    setFields(EMPTY)
    setSampleNote(null)
    router.refresh()
  }

  const ready = fields.turkey.trim() && fields.alleged_crime.trim() && fields.argument.trim()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          Turkey's name
          <input
            value={fields.turkey}
            onChange={(e) => set("turkey")(e.target.value)}
            maxLength={LIMITS.turkey}
            placeholder="e.g. Gerald"
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-bold">
          Plea
          <select value={fields.plea} onChange={(e) => set("plea")(e.target.value)} className={inputClass}>
            {PLEAS.map((plea) => (
              <option key={plea} value={plea}>
                {plea}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-bold">
        Alleged crime
        <input
          value={fields.alleged_crime}
          onChange={(e) => set("alleged_crime")(e.target.value)}
          maxLength={LIMITS.alleged_crime}
          placeholder="e.g. gobbled during the speech"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-bold">
        <span className="flex justify-between">
          Argument
          <span className="font-normal text-muted">
            {fields.argument.length}/{LIMITS.argument}
          </span>
        </span>
        <textarea
          value={fields.argument}
          onChange={(e) => set("argument")(e.target.value)}
          rows={4}
          maxLength={LIMITS.argument}
          placeholder="Your honor, it was a sneeze."
          className={`resize-none leading-relaxed ${inputClass}`}
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={loadSample}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-surface"
        >
          Load a sample case
        </button>
        <button
          type="submit"
          disabled={pending || !ready}
          className="rounded-full border-2 border-border bg-primary px-5 py-2.5 font-bold text-primary-foreground shadow-block transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {pending ? "The judge is deliberating..." : "File the case"}
        </button>
      </div>

      {sampleNote && (
        <p className="text-xs font-semibold text-muted">
          Heads up, this sample is a test: {sampleNote.replace(/^trap: /, "")}.
        </p>
      )}

      {message && (
        <p
          role="alert"
          className={`rounded-card border-2 border-border px-4 py-3 text-sm font-semibold ${
            message.tone === "blocked" ? "bg-foreground text-surface" : "bg-surface text-primary"
          }`}
        >
          {message.tone === "blocked" && <span className="mr-2 uppercase tracking-wider">Guardrail:</span>}
          {message.text}
        </p>
      )}
    </form>
  )
}
