#!/usr/bin/env bash
# The impact map must find coupling in a language the evaluation fixtures do not
# contain, because the review skill is language-agnostic and the script is the
# part that could silently stop being so. Builds a throwaway Python repository
# whose defect is only visible from an unchanged consumer, then asserts the
# artifacts point at it.
set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")/.." && pwd)/skills/code-review/scripts/impact-map.sh"
[ -f "$SCRIPT" ] || { echo "impact-map.sh not found at $SCRIPT" >&2; exit 1; }

repo=$(mktemp -d)
out=$(mktemp -d)
trap 'rm -rf "$repo" "$out"' EXIT

cd "$repo"
git init --quiet --initial-branch=main
git config user.name "Fixture"
git config user.email "fixture@example.invalid"
git config commit.gpgsign false

mkdir -p svc tests
cat > svc/limits.py <<'PY'
"""Shared runtime limits. Every worker reads these at import time."""

MAX_RETRY_ATTEMPTS = 5
BATCH_CEILING = 250
PY

cat > svc/pool.py <<'PY'
import threading

from svc.limits import BATCH_CEILING

_pool_lock = threading.Lock()


def submit_batch(queue, items):
    """Enqueue a batch under the pool lock so two callers cannot interleave."""
    with _pool_lock:
        for item in items[:BATCH_CEILING]:
            queue.append(item)
    return len(items[:BATCH_CEILING])
PY

cat > svc/reconcile.py <<'PY'
from svc.limits import MAX_RETRY_ATTEMPTS
from svc.pool import submit_batch


def reconcile(queue, rows):
    """Unchanged consumer: inherits both the retry ceiling and the pool lock."""
    attempts = 0
    while attempts < MAX_RETRY_ATTEMPTS:
        submitted = submit_batch(queue, rows)
        if submitted == len(rows):
            return submitted
        attempts += 1
    raise RuntimeError("reconcile exhausted its retries")
PY

git add -A
git commit --quiet -m "base"

git checkout --quiet -b feature/limits

# Two changes whose consequence lives in an unchanged file: a shared constant is
# raised, and the lock disappears from a helper the unchanged consumer calls.
cat > svc/limits.py <<'PY'
"""Shared runtime limits. Every worker reads these at import time."""

MAX_RETRY_ATTEMPTS = 5000
BATCH_CEILING = 250
PY

cat > svc/pool.py <<'PY'
from svc.limits import BATCH_CEILING


def submit_batch(queue, items):
    """Enqueue a batch."""
    for item in items[:BATCH_CEILING]:
        queue.append(item)
    return len(items[:BATCH_CEILING])
PY

git add -A
git commit --quiet -m "raise the retry ceiling and simplify the pool helper"

AI_OUTPUT_DIR="$out" "$SCRIPT" main...HEAD > "$out/result.json"

impact="$out/pr-context/impact"
fail() { echo "FAIL: $1" >&2; echo "--- coupling.txt"; cat "$impact/coupling.txt"; echo "--- removed-names.txt"; cat "$impact/removed-names.txt"; exit 1; }

grep -q "MAX_RETRY_ATTEMPTS" "$impact/coupling.txt" || fail "the raised shared constant is not a coupling point"
grep -A6 "^## MAX_RETRY_ATTEMPTS" "$impact/coupling.txt" | grep -q "svc/reconcile.py" ||
	fail "the unchanged consumer of the shared constant is not cited"
grep -q "_pool_lock" "$impact/removed-names.txt" || fail "the removed lock is not reported as a removed name"
grep -q "submit_batch" "$impact/coupling.txt" || fail "the helper called by unchanged code is not a coupling point"

# No language knowledge may leak into the script itself.
if grep -nE '\b(def|elif|lambda|struct|impl|func|interface|namespace)\b' "$SCRIPT" | grep -v '^[0-9]*:#' | grep -q .; then
	echo "FAIL: impact-map.sh mentions language syntax outside comments" >&2
	grep -nE '\b(def|elif|lambda|struct|impl|func|interface|namespace)\b' "$SCRIPT" | grep -v '^[0-9]*:#' >&2
	exit 1
fi

echo "impact-map cross-language checks passed"
