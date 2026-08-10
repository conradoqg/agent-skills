#!/usr/bin/env sh
set -eu

WARNINGS=""

warn() {
	WARNINGS="${WARNINGS}${WARNINGS:+\n}$1"
}

json_string() {
	printf '"'
	first=1
	while IFS= read -r line || [ -n "$line" ]; do
		escaped=$(printf '%s' "$line" | sed 's/\\/\\\\/g; s/"/\\"/g; s/	/\\t/g')
		if [ "$first" -eq 1 ]; then
			first=0
		else
			printf '\\n'
		fi
		printf '%s' "$escaped"
	done
	printf '"'
}

json_value() {
	printf '%s' "$1" | json_string
}

run_git_file() {
	out_file=$1
	shift
	if ! git -c core.quotepath=false "$@" >"$out_file" 2>"$out_file.stderr"; then
		warn "git $* failed; see $out_file.stderr"
		printf 'collect-pr-context: git %s failed; see %s\n' "$*" "$out_file.stderr" >&2
		return 1
	fi
}

ref_exists() {
	git rev-parse --verify "$1" >/dev/null 2>&1
}

friendly_branch() {
	branch=$1
	case "$branch" in
		refs/heads/*) branch=${branch#refs/heads/} ;;
	esac
	printf '%s' "$branch"
}

resolve_base_ref() {
	if [ -n "${SYSTEM_PULLREQUEST_TARGETBRANCHNAME:-}" ]; then
		candidate="origin/${SYSTEM_PULLREQUEST_TARGETBRANCHNAME}"
		if ref_exists "$candidate"; then
			printf '%s' "$candidate"
			return 0
		fi
		warn "target branch name ref not found: $candidate"
	fi

	if [ -n "${SYSTEM_PULLREQUEST_TARGETBRANCH:-}" ]; then
		branch=$(friendly_branch "$SYSTEM_PULLREQUEST_TARGETBRANCH")
		if [ -n "$branch" ] && [ "$branch" != "$SYSTEM_PULLREQUEST_TARGETBRANCH" ]; then
			candidate="origin/$branch"
			if ref_exists "$candidate"; then
				printf '%s' "$candidate"
				return 0
			fi
			warn "target branch ref not found: $candidate"
		fi
	fi

	for candidate in origin/main origin/master main master; do
		if ref_exists "$candidate"; then
			printf '%s' "$candidate"
			return 0
		fi
	done

	return 1
}

if [ -z "${AI_OUTPUT_DIR:-}" ]; then
	printf '{"error":"AI_OUTPUT_DIR not configured"}\n'
	exit 1
fi

artifacts_dir="$AI_OUTPUT_DIR/pr-context"
mkdir -p "$artifacts_dir"

if ! base_ref=$(resolve_base_ref); then
	printf '%s\n' "$WARNINGS" >"$artifacts_dir/warnings.txt"
	printf '{"error":"unable to resolve PR base ref","artifactsDir":'
	json_value "$artifacts_dir"
	printf ',"warningsFile":'
	json_value "$artifacts_dir/warnings.txt"
	printf '}\n'
	exit 1
fi

compare_range="$base_ref...HEAD"
commit_range="$base_ref..HEAD"

run_git_file "$artifacts_dir/name-status.txt" diff --name-status "$compare_range"
run_git_file "$artifacts_dir/stat.txt" diff --stat "$compare_range"
run_git_file "$artifacts_dir/shortstat.txt" diff --shortstat "$compare_range"
run_git_file "$artifacts_dir/numstat.txt" diff --numstat "$compare_range"
run_git_file "$artifacts_dir/commits.txt" log --reverse --oneline "$commit_range"
run_git_file "$artifacts_dir/diff.patch" diff --no-ext-diff --unified=3 "$compare_range"
printf '%s\n' "$WARNINGS" >"$artifacts_dir/warnings.txt"

files_changed=$(wc -l <"$artifacts_dir/name-status.txt" | tr -d ' ')

{
	printf '{\n'
	printf '  "baseRef": '; json_value "$base_ref"; printf ',\n'
	printf '  "compareRange": '; json_value "$compare_range"; printf ',\n'
	printf '  "commitRange": '; json_value "$commit_range"; printf ',\n'
	printf '  "filesChanged": %s,\n' "$files_changed"
	printf '  "artifactsDir": '; json_value "$artifacts_dir"; printf ',\n'
	printf '  "artifacts": {\n'
	printf '    "nameStatus": '; json_value "$artifacts_dir/name-status.txt"; printf ',\n'
	printf '    "stat": '; json_value "$artifacts_dir/stat.txt"; printf ',\n'
	printf '    "shortstat": '; json_value "$artifacts_dir/shortstat.txt"; printf ',\n'
	printf '    "numstat": '; json_value "$artifacts_dir/numstat.txt"; printf ',\n'
	printf '    "commits": '; json_value "$artifacts_dir/commits.txt"; printf ',\n'
	printf '    "diff": '; json_value "$artifacts_dir/diff.patch"; printf ',\n'
	printf '    "warnings": '; json_value "$artifacts_dir/warnings.txt"; printf '\n'
	printf '  }\n'
	printf '}\n'
} >"$artifacts_dir/context.json"

printf '{'
printf '"baseRef":'; json_value "$base_ref"; printf ','
printf '"compareRange":'; json_value "$compare_range"; printf ','
printf '"commitRange":'; json_value "$commit_range"; printf ','
printf '"filesChanged":%s,' "$files_changed"
printf '"artifactsDir":'; json_value "$artifacts_dir"; printf ','
printf '"contextFile":'; json_value "$artifacts_dir/context.json"
printf '}\n'
