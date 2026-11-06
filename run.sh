#!/usr/bin/env bash
# What permissions a brand-new table gets, and what a stranger can do with it.
#
#   ./run.sh
#
# Needs Docker and Node 22. The backend is destroyed and rebuilt every run, so
# nothing here touches anything of yours.
set -euo pipefail
cd "$(dirname "$0")"

# Fail here rather than three minutes from now with an empty result.
docker info >/dev/null 2>&1 || {
  echo ""
  echo "  Docker is not running. Start Docker Desktop (or your daemon) and run this again."
  echo ""
  exit 1
}

echo ""
echo "  [1/4] a backend arriving the way a generated app arrives"
docker compose down -v >/dev/null 2>&1 || true
docker compose up -d >/dev/null
docker compose restart parse >/dev/null          # it races mongo on a cold volume
node seed.mjs

echo ""
echo "  [2/4] WHAT A NEW TABLE ALLOWS, BEFORE ANYONE CHOOSES ANYTHING"
echo ""
node measure.mjs

echo "  [3/4] closing it: deny everything, then open only what is needed"
node harden.mjs
# client class creation is a server flag, not a database setting
docker compose stop parse >/dev/null
PARSE_SERVER_ALLOW_CLIENT_CLASS_CREATION=false docker compose up -d parse >/dev/null
for _ in $(seq 1 120); do
  curl -sf -o /dev/null -H 'X-Parse-Application-Id: open-db' \
    'http://127.0.0.1:1341/parse/classes/Patient?limit=0' && break
  sleep 0.5
done

echo ""
echo "  [4/4] THE SAME QUESTIONS, ASKED AGAIN"
echo ""
node measure.mjs
