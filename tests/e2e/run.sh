#!/usr/bin/env bash
# Runs inside `firebase emulators:exec`: serves the app against the
# emulators, then drives it with tests/e2e/flow.mjs.
set -euo pipefail
export VITE_USE_EMULATORS=true VITE_FIREBASE_PROJECT_ID=demo-teamup VITE_FIREBASE_API_KEY=demo-key \
  VITE_FIREBASE_AUTH_DOMAIN=localhost VITE_FIREBASE_STORAGE_BUCKET=demo-teamup.appspot.com \
  VITE_FIREBASE_MESSAGING_SENDER_ID=0 VITE_FIREBASE_APP_ID=demo
npx vite --port 5174 --strictPort > /tmp/e2e-vite.log 2>&1 &
VITE_PID=$!
trap 'kill $VITE_PID' EXIT
for _ in $(seq 1 60); do curl -sf http://localhost:5174/ >/dev/null && break; sleep 1; done
node tests/e2e/flow.mjs
