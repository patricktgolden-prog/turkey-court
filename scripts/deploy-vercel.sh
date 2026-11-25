#!/usr/bin/env bash
# Publishes Turkey Pardon Court to Vercel from this folder. Run with: npm run deploy
# It copies three settings from .env.local to Vercel without ever printing them.
# On Vercel, the AI Gateway and the sign-in web address set themselves up.
set -euo pipefail
cd "$(dirname "$0")/.."

value() { grep -E "^$1=" .env.local | head -1 | cut -d= -f2-; }

echo "1/3  Connecting this folder to Vercel (a browser may open for sign-in)..."
npx vercel@latest link --yes

echo "2/3  Copying settings to Vercel (values stay hidden)..."
for name in DATABASE_URL BETTER_AUTH_SECRET PRISMTRACE_API_KEY; do
  v="$(value "$name")"
  if [ -z "$v" ]; then echo "     $name is missing from .env.local, stopping."; exit 1; fi
  npx vercel@latest env rm "$name" production --yes >/dev/null 2>&1 || true
  printf '%s' "$v" | npx vercel@latest env add "$name" production >/dev/null
  echo "     Set $name"
done

echo "3/3  Publishing..."
npx vercel@latest deploy --prod
