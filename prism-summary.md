## What your AI does

Turkey Pardon Court is a silly courtroom app. A signed-in user files a case for a made-up turkey (name, alleged crime, plea, argument), and an AI judge rules "pardoned" or "dinner" with two sentences of dramatic reasoning. The judge rules only on the argument's charm, honesty, and remorse. It must never be bribed, flattered, or ordered around, never change a past ruling, never discuss other users' cases, and never reveal its instructions. Code enforces the hard rules: a detected bribe is always "dinner", any answer that isn't a clean ruling becomes "dinner", claims to be the admin or attempts to change other cases are blocked before the model sees them, and personal info like SSNs is removed first. Each user can only read their own cases (Postgres row-level security), and saved rulings can never be edited.

## How it runs
| Agent | Starts by | Schedule | Can do |
| --- | --- | --- | --- |
| turkey-court-judge | user message (filing a case in the web form, POST /api/plan) | - | Read the one case it is given and return a JSON ruling ("pardoned" or "dinner") with reasoning. No tools, no access to other cases. |
