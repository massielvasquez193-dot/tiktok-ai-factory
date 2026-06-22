#!/usr/bin/env bash
# ── BullMQ Queue Integration Test ────────────────────────────────────────
#
# Prerequisites:
#   - Server running locally (npm run dev -w apps/server)
#   - Redis accessible via REDIS_URL
#
# This script:
#   1. Enqueues a health-check test job
#   2. Polls until completed or failed (max 10 attempts, 1s apart)
#   3. Outputs final state + result
#   4. Cleans up (the worker auto-removes completed jobs after 1h)
#
# Usage:
#   chmod +x scripts/test-queue.sh
#   scripts/test-queue.sh
# ----------------------------------------------------------------------------

set -euo pipefail

API_BASE="${QUEUE_TEST_API_URL:-http://localhost:4000}"
PASS=0
FAIL=0

green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
red()   { printf '\033[0;31m%s\033[0m\n' "$1"; }
cyan()  { printf '\033[0;36m%s\033[0m\n' "$1"; }

# ── Test 1: POST /api/queue/test ─────────────────────────────────────────

echo ""
cyan "=== Test 1: Enqueue health-check test job ==="
RESP=$(curl -sf -X POST "$API_BASE/api/queue/test" 2>&1) || {
  red "FAIL: Could not reach $API_BASE/api/queue/test — is the server running?"
  exit 1
}
echo "$RESP"

JOB_ID=$(echo "$RESP" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
QUEUE_NAME=$(echo "$RESP" | grep -o '"queueName":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
  red "FAIL: No jobId in response"
  ((FAIL++))
else
  green "PASS: Got jobId=$JOB_ID, queueName=$QUEUE_NAME"
  ((PASS++))
fi

# ── Test 2: Invalid queue name → 400 ─────────────────────────────────────

echo ""
cyan "=== Test 2: Invalid queue name → 400 ==="
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API_BASE/api/queue/invalid-queue/abc123" 2>&1 || echo "000")
if [ "$HTTP_CODE" = "400" ]; then
  green "PASS: Got $HTTP_CODE for invalid queue name"
  ((PASS++))
else
  red "FAIL: Expected 400, got $HTTP_CODE"
  ((FAIL++))
fi

# ── Test 3: Missing job → 404 ────────────────────────────────────────────

echo ""
cyan "=== Test 3: Missing job → 404 ==="
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API_BASE/api/queue/video-generation/nonexistent-job-id" 2>&1 || echo "000")
if [ "$HTTP_CODE" = "404" ]; then
  green "PASS: Got $HTTP_CODE for missing job"
  ((PASS++))
else
  red "FAIL: Expected 404, got $HTTP_CODE"
  ((FAIL++))
fi

# ── Test 4: Poll for job completion ──────────────────────────────────────

if [ -n "$JOB_ID" ] && [ -n "$QUEUE_NAME" ]; then
  echo ""
  cyan "=== Test 4: Poll $QUEUE_NAME/$JOB_ID until completed ==="

  MAX_ATTEMPTS=15
  ATTEMPT=0
  STATE=""
  PROGRESS=0

  while [ "$ATTEMPT" -lt "$MAX_ATTEMPTS" ]; do
    ((ATTEMPT++))
    RESP=$(curl -sf "$API_BASE/api/queue/$QUEUE_NAME/$JOB_ID" 2>&1) || {
      echo "  Attempt $ATTEMPT: request failed, retrying..."
      sleep 1
      continue
    }

    STATE=$(echo "$RESP" | grep -o '"state":"[^"]*"' | cut -d'"' -f4)
    PROGRESS=$(echo "$RESP" | grep -o '"progress":[0-9]*' | cut -d':' -f2)

    echo "  Attempt $ATTEMPT: state=$STATE progress=$PROGRESS"

    if [ "$STATE" = "completed" ]; then
      green "PASS: Job completed successfully"
      echo "  returnvalue: $(echo "$RESP" | grep -o '"returnvalue":{.*}' | head -c 500)"
      ((PASS++))
      break
    elif [ "$STATE" = "failed" ]; then
      red "FAIL: Job failed — $(echo "$RESP" | grep -o '"failedReason":"[^"]*"' | cut -d'"' -f4)"
      ((FAIL++))
      break
    fi

    sleep 1
  done

  if [ "$STATE" != "completed" ] && [ "$STATE" != "failed" ]; then
    red "FAIL: Job did not complete within ${MAX_ATTEMPTS}s (final state=$STATE)"
    ((FAIL++))
  fi
fi

# ── Test 5: GET /api/queue/stats ─────────────────────────────────────────

echo ""
cyan "=== Test 5: Queue stats ==="
STATS=$(curl -sf "$API_BASE/api/queue/stats" 2>&1) || {
  red "FAIL: Could not fetch /api/queue/stats"
  ((FAIL++))
}
echo "$STATS"
green "PASS: Stats endpoint responded"
((PASS++))

# ── Summary ──────────────────────────────────────────────────────────────

echo ""
echo "=============================================="
printf "  PASS: %d  |  FAIL: %d\n" "$PASS" "$FAIL"
echo "=============================================="

if [ "$FAIL" -gt 0 ]; then
  red "Some tests FAILED"
  exit 1
else
  green "All tests PASSED"
  exit 0
fi
