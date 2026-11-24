import { redirect } from "next/navigation"
import { CaseCard } from "@/components/case-card"
import { CaseForm } from "@/components/case-form"
import { SignOutButton } from "@/components/sign-out-button"
import { asUser, type CourtCase } from "@/lib/db"
import { getSession } from "@/lib/session"

export default async function AppPage() {
  const session = await getSession()
  if (!session) redirect("/")

  // No WHERE clause on purpose: the row rule already limits this to your cases.
  const { rows } = await asUser(session.user.id, (db) =>
    db.query<CourtCase>(
      `select id, turkey, alleged_crime, plea, argument, ruling, reasoning, guardrail, created_at
       from cases order by created_at desc limit 50`,
    ),
  )

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-6 py-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Turkey Pardon Court</p>
          <p className="truncate text-sm text-muted">Signed in as {session.user.email}</p>
        </div>
        <SignOutButton />
      </header>

      <main className="flex flex-col gap-8">
        <section className="flex flex-col gap-4">
          <h1 className="font-display text-3xl font-extrabold text-balance">File a case for your turkey</h1>
          <p className="text-muted">
            The judge rules on charm, honesty, and remorse. The judge cannot be bought. Don't try.
          </p>
          <CaseForm />
        </section>

        <section className="flex flex-col gap-4" aria-labelledby="docket-heading">
          <h2 id="docket-heading" className="font-display text-xl font-bold">
            Your docket
          </h2>
          {rows.length === 0 ? (
            <p className="rounded-card border-2 border-dashed border-border p-6 text-center text-muted">
              No cases yet. Your rulings show up here, and only you can see them.
            </p>
          ) : (
            <ul className="flex flex-col gap-4">
              {rows.map((courtCase) => (
                <CaseCard key={courtCase.id} courtCase={courtCase} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
