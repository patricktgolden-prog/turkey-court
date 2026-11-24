import type { CourtCase } from "@/lib/db"
import { DeleteButton } from "./delete-button"

export function CaseCard({ courtCase }: { courtCase: CourtCase }) {
  const note = courtCase.guardrail
  const redacted = Array.from(new Set([...(note.redacted ?? []), ...(note.outputRedacted ?? [])]))
  const pardoned = courtCase.ruling === "pardoned"

  return (
    <li className="relative flex flex-col gap-3 overflow-hidden rounded-card border-2 border-border bg-surface p-5 shadow-block">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="font-display text-xl font-extrabold leading-snug">{courtCase.turkey}</p>
          <p className="text-sm text-muted">
            Charged with: {courtCase.alleged_crime} · Pleads {courtCase.plea}
          </p>
        </div>
        <DeleteButton id={courtCase.id} />
      </div>

      <p className="border-l-4 border-border pl-3 italic leading-relaxed">“{courtCase.argument}”</p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <span
          className={`inline-block w-fit -rotate-3 rounded-md border-4 px-3 py-1 font-display text-2xl font-black uppercase tracking-widest ${
            pardoned ? "border-success text-success" : "border-primary text-primary"
          }`}
        >
          {pardoned ? "Pardoned" : "Dinner"}
        </span>
        <p className="leading-relaxed">{courtCase.reasoning}</p>
      </div>

      {(note.bribeDetected || redacted.length > 0) && (
        <p className="text-xs font-semibold text-success">
          {note.bribeDetected && "Guardrail flagged a bribe. "}
          {redacted.length > 0 && `Guardrail removed: ${redacted.join(", ")}.`}
        </p>
      )}
    </li>
  )
}
