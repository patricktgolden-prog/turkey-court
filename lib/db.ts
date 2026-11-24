import { Pool, type PoolClient } from "pg"

const globalForDb = globalThis as unknown as { pool?: Pool }

export const pool =
  globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL })

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool

/**
 * Runs queries as the signed-in user. Inside `run`, the database itself only
 * returns and changes that user's rows, even if your query forgets a WHERE.
 */
export async function asUser<T>(userId: string, run: (db: PoolClient) => Promise<T>) {
  const client = await pool.connect()
  try {
    await client.query("begin")
    await client.query("set local role app_user")
    await client.query("select set_config('app.user_id', $1, true)", [userId])
    const result = await run(client)
    await client.query("commit")
    return result
  } catch (error) {
    await client.query("rollback")
    throw error
  } finally {
    client.release()
  }
}

export type Suggestion = {
  id: string
  goal: string
  answer: string
  guardrail: GuardrailNote
  created_at: string
}

export type GuardrailNote = {
  redacted?: string[]
  outputRedacted?: string[]
}

export type CourtCase = {
  id: string
  turkey: string
  alleged_crime: string
  plea: string
  argument: string
  ruling: "pardoned" | "dinner" | null
  reasoning: string | null
  guardrail: CaseGuardrailNote
  created_at: string
}

export type CaseGuardrailNote = GuardrailNote & {
  bribeDetected?: boolean
  overruled?: boolean
  confused?: boolean
}
