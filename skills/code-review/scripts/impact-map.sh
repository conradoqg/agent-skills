#!/usr/bin/env sh
# Build the non-local impact map for a committed change range.
#
# A diff shows what changed. It does not show which untouched code depended on
# the old behavior, and that is where most escaped defects live. This script
# answers that mechanically, read-only, and without knowing any programming
# language: it uses git to decide what the change neighborhood is, treats the
# neighborhood as a bag of tokens, and ranks tokens by how rare they are in the
# repository. Rare tokens that also occur in files the change never touched are
# the coupling points a reviewer must read.
#
# There is deliberately no list of keywords, no declaration syntax, and no file
# extension logic here. Language handling is delegated to git:
#   * `git diff -W` expands each hunk to its enclosing block using git's own
#     per-language funcname drivers, so a body change is attributed to the thing
#     that contains it even when the signature line never changed;
#   * `git grep -w` finds token occurrences without parsing anything.
# Rarity does the work a stopword list would do: language keywords and generic
# nouns occur everywhere, so a document-frequency ceiling drops them for free.
#
# If a semantic code-intelligence tool is available in the session (a language
# server, a code graph, an indexer), prefer it: it resolves symbols instead of
# matching them. This script is the fallback that works in any repository with
# only git present, and its output is a set of leads to verify by reading, never
# a set of conclusions.
#
# Usage: sh impact-map.sh <compareRange>
#   <compareRange> is the value collect-pr-context.sh returned, e.g. main...HEAD
#
# Artifacts under $AI_OUTPUT_DIR/pr-context/impact/:
#   coupling.txt        rare tokens from the change neighborhood, with their
#                       occurrences in UNCHANGED files, rarest first
#   removed-names.txt   names the change deleted and no longer mentions at all
#   co-changed.txt      rare names touched in two or more files of this change
#   file-consumers.txt  unchanged files that reference a changed file by name
#   cancelled-files.txt files touched by commits in the range whose net diff is
#                       empty: introduced and reverted inside the range
#   summary.txt         counts and the limits that were applied

set -eu

MAX_TOKENS=${IMPACT_MAX_TOKENS:-1500}
MAX_REPORTED=${IMPACT_MAX_REPORTED:-30}
MAX_COCHANGE=${IMPACT_MAX_COCHANGE:-20}
MAX_SITES=${IMPACT_MAX_SITES:-6}
MAX_DOC_FREQ=${IMPACT_MAX_DOC_FREQ:-12}
MIN_TOKEN_LEN=${IMPACT_MIN_TOKEN_LEN:-4}

if [ "$#" -lt 1 ] || [ -z "${1:-}" ]; then
	printf '{"error":"compare range argument is required, for example main...HEAD"}\n'
	exit 1
fi
RANGE=$1
base_ref=$(printf '%s' "$RANGE" | sed 's/\.\.\..*$//; s/\.\..*$//')
[ -n "$base_ref" ] || base_ref=HEAD

if [ -z "${AI_OUTPUT_DIR:-}" ]; then
	printf '{"error":"AI_OUTPUT_DIR not configured"}\n'
	exit 1
fi

out="$AI_OUTPUT_DIR/pr-context/impact"
mkdir -p "$out"
work="$out/.work"
mkdir -p "$work"

git -c core.quotepath=false diff --name-only --diff-filter=d "$RANGE" >"$work/changed" 2>/dev/null || : >"$work/changed"
sort -u "$work/changed" >"$work/changed-sorted" 2>/dev/null || : >"$work/changed-sorted"

if [ ! -s "$work/changed" ]; then
	: >"$out/coupling.txt"
	: >"$out/removed-names.txt"
	: >"$out/co-changed.txt"
	: >"$out/file-consumers.txt"
	: >"$out/cancelled-files.txt"
	printf 'no changed files in range %s\n' "$RANGE" >"$out/summary.txt"
	rm -rf "$work"
	printf '{"impactDir":"%s","changedFiles":0}\n' "$out"
	exit 0
fi

# Tokens on lines the change actually added or removed.
git -c core.quotepath=false diff --no-ext-diff --unified=0 "$RANGE" 2>/dev/null |
	grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' | sed 's/^[+-]//' >"$work/changed-lines" || : >"$work/changed-lines"

# Tokens in the enclosing block of each hunk, per git's own language drivers.
git -c core.quotepath=false diff --no-ext-diff -W "$RANGE" 2>/dev/null |
	grep -vE '^(diff |index |old mode|new mode|similarity |rename |new file|deleted file|--- |\+\+\+ |@@|Binary )' |
	sed 's/^[+ -]//' >"$work/neighborhood" || : >"$work/neighborhood"

tokenize() {
	tr -cs 'A-Za-z0-9_' '\n' <"$1" |
		grep -E "^[A-Za-z_][A-Za-z0-9_]{$((MIN_TOKEN_LEN - 1)),}$" |
		sort -u
}

tokenize "$work/changed-lines" >"$work/tokens-changed" || : >"$work/tokens-changed"
tokenize "$work/neighborhood" >"$work/tokens-context" || : >"$work/tokens-context"
sort -u "$work/tokens-changed" "$work/tokens-context" | head -n "$MAX_TOKENS" >"$work/tokens"

# One grep per candidate token. Two generic filters decide what is worth
# reporting, neither of which knows any language:
#   * document frequency: a token occurring in more files than the ceiling is
#     vocabulary (a keyword, a common noun), not a coupling point;
#   * shared usage: the token must occur both in a file this change touched and
#     in a file it did not, otherwise there is no coupling to check.
# Ranking prefers identifier-shaped tokens (camelCase, PascalCase, snake_case,
# CONST_CASE) over prose, then rarer tokens over common ones. Shape is a
# typographic property of names, not a property of one language.
: >"$work/rows"
while IFS= read -r token; do
	[ -n "$token" ] || continue
	git -c core.quotepath=false grep -n -w -I -- "$token" >"$work/hits" 2>/dev/null || : >"$work/hits"
	[ -s "$work/hits" ] || continue
	cut -d: -f1 <"$work/hits" | sort -u >"$work/hitfiles"
	files=$(wc -l <"$work/hitfiles" | tr -d ' ')
	[ "$files" -le "$MAX_DOC_FREQ" ] || continue
	comm -23 "$work/hitfiles" "$work/changed-sorted" >"$work/external-files" 2>/dev/null || cp "$work/hitfiles" "$work/external-files"
	external=$(wc -l <"$work/external-files" | tr -d ' ')
	comm -12 "$work/hitfiles" "$work/changed-sorted" >"$work/shared-files" 2>/dev/null || : >"$work/shared-files"
	shared=$(wc -l <"$work/shared-files" | tr -d ' ')
	case "$token" in
		*_*) shape=0 ;;
		*[a-z][A-Z]*) shape=0 ;;
		*) shape=1 ;;
	esac
	# A rare name touched in two or more changed files ties those hunks to the
	# same intent: they must agree with each other, and a test that changed
	# alongside its subject may have been bent to fit it. A name that already
	# existed before the change ranks first: two sides of an existing contract
	# being edited at once is far more informative than a new name appearing in
	# the new files that introduce it.
	if [ "$shared" -ge 2 ] && [ "$shape" -eq 0 ] && git -c core.quotepath=false grep -q -w -I -- "$token" "$base_ref" 2>/dev/null; then
		printf '%03d %s %s\n' "$((999 - shared))" "$token" "$(tr '\n' ',' <"$work/shared-files")" >>"$work/cochange"
	fi
	[ "$external" -gt 0 ] || continue
	[ "$shared" -gt 0 ] || continue
	if grep -q -x -F "$token" "$work/tokens-changed"; then origin=changed; else origin=context; fi
	printf '%s\t%s\t%s\t%s\t%s\n' "$shape" "$files" "$token" "$origin" "$external" >>"$work/rows"
	awk -F: 'NR == FNR { keep[$0] = 1; next } keep[$1]' "$work/external-files" "$work/hits" |
		head -n "$MAX_SITES" >"$work/sites-$token" 2>/dev/null || : >"$work/sites-$token"
done <"$work/tokens"

{
	printf '# Coupling points: tokens from the change neighborhood that also occur in files\n'
	printf '# this change never touched. Identifier-shaped and rare tokens first, because a\n'
	printf '# name that appears in few files is a specific thing rather than vocabulary.\n'
	printf '#\n'
	printf '#   [changed] the token is on a line this change added or removed\n'
	printf '#   [context] the token is in the enclosing block of a hunk, so the change is\n'
	printf '#             inside or next to it\n'
	printf '#\n'
	printf '# Read the sites listed before judging the hunk: the guarantee an untouched\n'
	printf '# caller relies on, or the declaration a new call depends on, is stated there\n'
	printf '# and not in the diff. No entry here is a finding by itself.\n\n'
	if [ -s "$work/rows" ]; then
		sort -t"$(printf '\t')" -k1,1n -k2,2n -k3,3 "$work/rows" | head -n "$MAX_REPORTED" |
			while IFS="$(printf '\t')" read -r shape files token origin external; do
				printf '## %s [%s]  %s unchanged file(s), %s file(s) in repo\n' "$token" "$origin" "$external" "$files"
				sed 's/^/    /' "$work/sites-$token" 2>/dev/null || true
				printf '\n'
			done
	fi
} >"$out/coupling.txt"

{
	printf '# Co-changed contracts: a name that already existed before this change and is now\n'
	printf '# touched in two or more of its files. Those hunks share one intent and must agree\n'
	printf '# with each other. An inconsistent parallel edit, or a test changed alongside the\n'
	printf '# code it exercises, is where a change certifies its own regression. Names the\n'
	printf '# change itself introduces are omitted: they carry no prior contract.\n\n'
	if [ -f "$work/cochange" ]; then
		sort "$work/cochange" | head -n "$MAX_COCHANGE" | awk '{
			printf "## %s\n", $2
			n = split($3, parts, ",")
			for (i = 1; i <= n; i++) if (parts[i] != "") printf "    %s\n", parts[i]
			printf "\n"
		}'
	fi
} >"$out/co-changed.txt"

# What the change stopped doing. A diff draws the eye to added lines, so a name
# the change deleted and no longer mentions anywhere in the file is the single
# most under-reviewed signal in a large change: a guard that is gone, an argument
# no longer passed, a field no longer written, a condition no longer applied.
{
	printf '# Names this change removed: present on a removed line, absent from the file afterwards.\n'
	printf '# For each one, ask what it used to do and whether anything still does it. A deleted\n'
	printf '# guard, argument, predicate, or field is a behavior change even when nothing was added.\n\n'
	while IFS= read -r file; do
		[ -n "$file" ] || continue
		[ -f "$file" ] || continue
		git -c core.quotepath=false diff --no-ext-diff --unified=0 "$RANGE" -- "$file" 2>/dev/null |
			grep '^-' | grep -v '^---' | sed 's/^-//' >"$work/removed" || : >"$work/removed"
		[ -s "$work/removed" ] || continue
		tokenize "$work/removed" >"$work/removed-tokens" || : >"$work/removed-tokens"
		[ -s "$work/removed-tokens" ] || continue
		tr -cs 'A-Za-z0-9_' '\n' <"$file" | sort -u >"$work/present-tokens"
		comm -23 "$work/removed-tokens" "$work/present-tokens" >"$work/gone" 2>/dev/null || : >"$work/gone"
		[ -s "$work/gone" ] || continue
		printf '## %s\n' "$file"
		while IFS= read -r gone_token; do
			[ -n "$gone_token" ] || continue
			line=$(grep -m 1 -w -- "$gone_token" "$work/removed" || true)
			[ -n "$line" ] || continue
			printf '    -%s\n' "$(printf '%s' "$line" | sed 's/^[[:space:]]*//' | cut -c1-140)"
		done <"$work/gone" | sort -u | head -n "$MAX_SITES"
		printf '\n'
	done <"$work/changed"
} >"$out/removed-names.txt"

# Module-level coupling: unchanged files that reference a changed file by name.
{
	printf '# Unchanged files that reference a changed file by name (import, require, include,\n'
	printf '# load, or any textual mention). These modules receive the change without being\n'
	printf '# part of it.\n\n'
	while IFS= read -r file; do
		[ -n "$file" ] || continue
		stem=$(basename "$file" | sed -E 's/\.[A-Za-z0-9]+$//')
		[ ${#stem} -ge "$MIN_TOKEN_LEN" ] || continue
		git -c core.quotepath=false grep -n -I -F -- "$stem" >"$work/hits" 2>/dev/null || : >"$work/hits"
		[ -s "$work/hits" ] || continue
		cut -d: -f1 <"$work/hits" | sort -u >"$work/hitfiles"
		comm -23 "$work/hitfiles" "$work/changed-sorted" >"$work/external-files" 2>/dev/null || : >"$work/external-files"
		[ -s "$work/external-files" ] || continue
		printf '## %s\n' "$file"
		awk -F: 'NR == FNR { keep[$0] = 1; next } keep[$1]' "$work/external-files" "$work/hits" |
			head -n "$MAX_SITES" | sed 's/^/    /'
		printf '\n'
	done <"$work/changed"
} >"$out/file-consumers.txt"

# Work the commits did and then undid: present in the history, absent from the
# net diff, therefore not part of this change and not reportable as a finding.
commit_range=$(printf '%s' "$RANGE" | sed 's/\.\.\./../')
{
	printf '# Files touched by commits in the range whose NET diff is empty.\n'
	printf '# Introduced and reverted inside the range: not part of this change.\n\n'
	git -c core.quotepath=false log --pretty=format: --name-only "$commit_range" 2>/dev/null |
		sed '/^$/d' | sort -u >"$work/touched" || : >"$work/touched"
	git -c core.quotepath=false diff --name-only "$RANGE" 2>/dev/null | sort -u >"$work/net" || : >"$work/net"
	comm -23 "$work/touched" "$work/net" || true
} >"$out/cancelled-files.txt"

changed_count=$(wc -l <"$work/changed" | tr -d ' ')
token_count=$(wc -l <"$work/tokens" | tr -d ' ')
coupling_count=$(awk '/^## /' "$out/coupling.txt" | wc -l | tr -d ' ')
removed_count=$(awk '/^## /' "$out/removed-names.txt" | wc -l | tr -d ' ')
cochange_count=$(awk '/^## /' "$out/co-changed.txt" | wc -l | tr -d ' ')
consumer_count=$(awk '/^## /' "$out/file-consumers.txt" | wc -l | tr -d ' ')
cancelled_count=$(awk '!/^#/ && NF' "$out/cancelled-files.txt" | wc -l | tr -d ' ')

{
	printf 'range: %s\n' "$RANGE"
	printf 'changed files: %s\n' "$changed_count"
	printf 'candidate tokens examined: %s\n' "$token_count"
	printf 'coupling points reported: %s\n' "$coupling_count"
	printf 'files with names removed and no longer mentioned: %s\n' "$removed_count"
	printf 'names co-changed across two or more changed files: %s\n' "$cochange_count"
	printf 'changed files referenced by unchanged files: %s\n' "$consumer_count"
	printf 'files touched by commits but absent from the net diff: %s\n' "$cancelled_count"
	printf 'limits: max tokens %s, reported %s, sites per token %s, document-frequency ceiling %s, min token length %s\n' \
		"$MAX_TOKENS" "$MAX_REPORTED" "$MAX_SITES" "$MAX_DOC_FREQ" "$MIN_TOKEN_LEN"
} >"$out/summary.txt"

rm -rf "$work"

printf '{'
printf '"impactDir":"%s",' "$out"
printf '"changedFiles":%s,' "$changed_count"
printf '"couplingPoints":%s,' "$coupling_count"
printf '"filesWithRemovedNames":%s,' "$removed_count"
printf '"coChangedNames":%s,' "$cochange_count"
printf '"changedFilesReferencedByUnchanged":%s,' "$consumer_count"
printf '"filesCancelledInRange":%s,' "$cancelled_count"
printf '"artifacts":{'
printf '"coupling":"%s",' "$out/coupling.txt"
printf '"removedNames":"%s",' "$out/removed-names.txt"
printf '"coChanged":"%s",' "$out/co-changed.txt"
printf '"fileConsumers":"%s",' "$out/file-consumers.txt"
printf '"cancelledFiles":"%s",' "$out/cancelled-files.txt"
printf '"summary":"%s"' "$out/summary.txt"
printf '}}\n'
