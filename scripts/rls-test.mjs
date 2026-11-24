// Proves the row rule works: user B can never read, change, or delete user A's rows.
// Run with: npm run test:rls   (needs DATABASE_URL, and npm run db:setup first)
import pg from "pg"

// Next.js reads .env.local on its own, but plain node scripts do not.
try {
  process.loadEnvFile?.(".env.local")
} catch {}

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL is not set. See .env.example.")
  process.exit(1)
}

const pool = new pg.Pool({ connectionString: url, max: 1 })
const A = "rls-test-user-a"
const B = "rls-test-user-b"
let failures = 0

async function asUser(userId, query, params = []) {
  const client = await pool.connect()
  try {
    await client.query("begin")
    await client.query("set local role app_user")
    if (userId) await client.query("select set_config('app.user_id', $1, true)", [userId])
    const result = await client.query(query, params)
    await client.query("commit")
    return result
  } catch (error) {
    await client.query("rollback")
    throw error
  } finally {
    client.release()
  }
}

function check(label, pass) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label}`)
  if (!pass) failures++
}

try {
  await pool.query(
    `insert into "user" (id, name, email) values ($1, 'Test A', 'a@rls.test'), ($2, 'Test B', 'b@rls.test')
     on conflict (id) do nothing`,
    [A, B],
  )

  const saved = await asUser(
    A,
    "insert into suggestions (goal, answer) values ('Learn SQL', '1. Read 2. Try 3. Ship') returning id",
  )
  const rowId = saved.rows[0].id
  check("User A can save a row", Boolean(rowId))

  const aSees = await asUser(A, "select count(*)::int as n from suggestions")
  check("User A sees their own row", aSees.rows[0].n === 1)

  const bSees = await asUser(B, "select count(*)::int as n from suggestions")
  check("User B sees zero of A's rows", bSees.rows[0].n === 0)

  const bById = await asUser(B, "select * from suggestions where id = $1", [rowId])
  check("User B cannot fetch A's row even with its exact id", bById.rowCount === 0)

  const bUpdate = await asUser(B, "update suggestions set answer = 'hacked' where id = $1", [rowId])
  check("User B cannot edit A's row", bUpdate.rowCount === 0)

  const bDelete = await asUser(B, "delete from suggestions where id = $1", [rowId])
  check("User B cannot delete A's row", bDelete.rowCount === 0)

  let spoofBlocked = false
  try {
    await asUser(B, "insert into suggestions (user_id, goal, answer) values ($1, 'x', 'y')", [A])
  } catch {
    spoofBlocked = true
  }
  check("User B cannot save a row in A's name", spoofBlocked)

  const nobody = await asUser(null, "select count(*)::int as n from suggestions")
  check("No signed-in user sees nothing", nobody.rows[0].n === 0)

  // Turkey Pardon Court: the same rules for cases, plus "a ruling can never change".
  const filed = await asUser(
    A,
    `insert into cases (turkey, alleged_crime, plea, argument, ruling, reasoning)
     values ('Marker Turkey A', 'test', 'guilty', 'test', 'dinner', 'test') returning id`,
  )
  const caseId = filed.rows[0].id
  check("User A can file a case", Boolean(caseId))

  const bCases = await asUser(B, "select count(*)::int as n from cases")
  check("User B sees zero of A's cases", bCases.rows[0].n === 0)

  const bCaseById = await asUser(B, "select * from cases where id = $1", [caseId])
  check("User B cannot fetch A's case even with its exact id", bCaseById.rowCount === 0)

  let bRulingBlocked = false
  try {
    const r = await asUser(B, "update cases set ruling = 'pardoned' where id = $1", [caseId])
    bRulingBlocked = r.rowCount === 0
  } catch {
    bRulingBlocked = true
  }
  check("User B cannot change A's ruling", bRulingBlocked)

  let aRulingBlocked = false
  try {
    await asUser(A, "update cases set ruling = 'pardoned' where id = $1", [caseId])
  } catch {
    aRulingBlocked = true
  }
  check("User A cannot change their own past ruling either", aRulingBlocked)

  const bCaseDelete = await asUser(B, "delete from cases where id = $1", [caseId])
  check("User B cannot delete A's case", bCaseDelete.rowCount === 0)

  let caseSpoofBlocked = false
  try {
    await asUser(
      B,
      `insert into cases (user_id, turkey, alleged_crime, plea, argument) values ($1, 'x', 'x', 'guilty', 'x')`,
      [A],
    )
  } catch {
    caseSpoofBlocked = true
  }
  check("User B cannot file a case in A's name", caseSpoofBlocked)

  let badRulingBlocked = false
  try {
    await asUser(
      A,
      `insert into cases (turkey, alleged_crime, plea, argument, ruling) values ('x', 'x', 'guilty', 'x', 'freedom')`,
    )
  } catch {
    badRulingBlocked = true
  }
  check("The database only accepts 'pardoned' or 'dinner'", badRulingBlocked)

  const nobodyCases = await asUser(null, "select count(*)::int as n from cases")
  check("No signed-in user sees no cases", nobodyCases.rows[0].n === 0)
} catch (error) {
  console.error("Test crashed:", error.message)
  failures++
} finally {
  await pool.query(`delete from "user" where id in ($1, $2)`, [A, B])
  await pool.end()
}

console.log(failures === 0 ? "\nAll row rules hold." : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
