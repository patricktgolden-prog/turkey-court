import { createHash } from "node:crypto"

/**
 * Sends one trace per judge ruling to PRISM by Block Convey. Server only: the key never reaches the browser.
 * No key set means tracing is off, and the app works the same.
 */

const PRISMTRACE_HOST = process.env.PRISMTRACE_HOST ?? "https://api.prism.blockconvey.com"
const PRISMTRACE_PROJECT_ID = process.env.PRISMTRACE_PROJECT_ID ?? "7cc1c165-8324-4fa4-abe6-a20711624d16"

/** A stable, non-reversible id for one sign-in session, so a person's filings group into one trajectory. */
export function traceSessionId(authSessionId: string) {
  return `court-${createHash("sha256").update(authSessionId).digest("hex").slice(0, 24)}`
}

export async function emitTrace(
  input: string,
  output: string,
  opts: { model: string; latencyMs: number; sessionId: string; instructions: string },
) {
  const key = process.env.PRISMTRACE_API_KEY
  if (!key) return

  try {
    const res = await fetch(`${PRISMTRACE_HOST}/api/traces`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PRISMtrace-Key": key },
      body: JSON.stringify({
        project_id: PRISMTRACE_PROJECT_ID,
        model: opts.model,
        input_messages: [
          { role: "system", content: opts.instructions },
          { role: "user", content: input },
        ],
        output_message: output,
        latency_ms: opts.latencyMs,
        session_id: opts.sessionId,
        agent_id: "turkey-court-judge",
      }),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) console.error(`PRISM ingest ${res.status}: ${(await res.text()).slice(0, 200)}`)
  } catch (error) {
    // Tracing must never break a ruling.
    console.error("PRISM trace failed:", error instanceof Error ? error.message : error)
  }
}
