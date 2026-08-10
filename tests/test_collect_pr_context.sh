#!/usr/bin/env bash
set -euo pipefail

SCRIPT="$(cd "$(dirname "$0")/.." && pwd)/skills/code-review/scripts/collect-pr-context.sh"
[ -f "$SCRIPT" ] || { echo "collect-pr-context.sh not found at $SCRIPT" >&2; exit 1; }

repo=$(mktemp -d)
out=$(mktemp -d)
fakebin=$(mktemp -d)
trap 'rm -rf "$repo" "$out" "$fakebin"' EXIT

cd "$repo"
git init --quiet --initial-branch=main
git config user.name "Fixture"
git config user.email "fixture@example.invalid"
git config commit.gpgsign false

printf 'base\n' > app.txt
git add app.txt
git commit --quiet -m "base"
git checkout --quiet -b feature/context
printf 'changed\n' >> app.txt
git add app.txt
git commit --quiet -m "change"

AI_OUTPUT_DIR="$out" sh "$SCRIPT" >"$out/success.json"
test -s "$out/pr-context/context.json"
for artifact in name-status stat shortstat numstat commits diff; do
	test -f "$out/pr-context/$artifact.txt" || test -f "$out/pr-context/$artifact.patch"
done

rm -rf "$out/pr-context"
real_git=$(command -v git)
cat >"$fakebin/git" <<'SH'
#!/usr/bin/env sh
case " $* " in
	*" diff --stat "*)
		printf 'injected git failure\n' >&2
		exit 42
		;;
esac
exec "$REAL_GIT" "$@"
SH
chmod +x "$fakebin/git"

if REAL_GIT="$real_git" PATH="$fakebin:$PATH" AI_OUTPUT_DIR="$out" sh "$SCRIPT" >"$out/failure.json" 2>"$out/failure.stderr"; then
	echo "FAIL: injected git failure did not stop context collection" >&2
	exit 1
fi

test ! -e "$out/pr-context/context.json"
grep -q "injected git failure" "$out/pr-context/stat.txt.stderr"
grep -q "collect-pr-context: git diff --stat" "$out/failure.stderr"

echo "collect-pr-context fail-closed checks passed"
