// Runs the PRISM setup checks from your own machine without ever printing your key.
// Run with: npm run prism:check
// 1. Can this machine reach PRISM?  2. Does the key work? (sends prism-summary.md)  3. Has a live trace arrived?
import { readFileSync } from "node:fs"

try {
  process.loadEnvFile?.(".env.local")
} catch {}

const host = process.env.PRISMTRACE_HOST ?? "https://api.prism.blockconvey.com"
const projectId = process.env.PRISMTRACE_PROJECT_ID ?? "7cc1c165-8324-4fa4-abe6-a20711624d16"
const key = process.env.PRISMTRACE_API_KEY

const health = await fetch(`${host}/health`, { signal: AbortSignal.timeout(10000) }).catch((e) => e)
if (!(health instanceof Response) || health.status !== 200) {
  console.log(`1. Reach PRISM: FAIL (${health instanceof Response ? health.status : health.message})`)
  process.exit(1)
}
console.log("1. Reach PRISM: OK")

if (!key) {
  console.log("2. Key: MISSING. Save it in .env.local as PRISMTRACE_API_KEY with the hidden-prompt command.")
  process.exit(1)
}

const handshake = await fetch(`${host}/api/setup-doctor/handshake`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-PRISMtrace-Key": key },
  body: JSON.stringify({
    project_id: projectId,
    send_test_trace: true,
    client: "claude_code",
    summary: readFileSync("prism-summary.md", "utf8"),
  }),
})
const handshakeText = (await handshake.text()).replaceAll(key, "[key]").slice(0, 300)
console.log(handshake.status === 200 ? "2. Key: CREDENTIAL OK" : `2. Key: CREDENTIAL FAIL (${handshake.status}) ${handshakeText}`)
if (handshake.status !== 200) process.exit(1)

const doctor = await fetch(`${host}/api/setup-doctor?project_id=${projectId}`, {
  headers: { "X-PRISMtrace-Key": key },
})
const report = await doctor.json().catch(() => ({}))
if (report.live_connected) console.log("3. Live: LIVE CONNECTED")
else console.log(`3. Live: not yet (${report.blocked_step ?? doctor.status}). File one case in the app, then run this again.`)
