#!/usr/bin/env python3
"""Collect Git activity as deterministic JSON for the git-user-activity-summary skill."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import urlparse


def run_git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args],
        check=True, capture_output=True, text=True, errors="replace",
    )
    return result.stdout


def is_repo(path: Path) -> bool:
    return (path / ".git").is_dir() or (path / ".git").is_file()


def discover_repositories(root: Path) -> list[Path]:
    found = []
    for current, dirs, _files in os.walk(root, topdown=True):
        dirs[:] = sorted(d for d in dirs if d != ".git")
        path = Path(current)
        if is_repo(path):
            found.append(path)
    return sorted(found, key=lambda p: str(p.relative_to(root)))


def git_origin(repo: Path) -> str:
    try:
        return run_git(repo, "config", "--get", "remote.origin.url").strip()
    except subprocess.CalledProcessError:
        return ""


def canonical_origin(remote: str) -> str:
    value = remote.strip()
    if not value:
        return ""
    if "://" not in value and ":" in value.split("/", 1)[0]:
        host, path = value.split(":", 1)
        value = f"ssh://{host}/{path}"
    parsed = urlparse(value)
    host = (parsed.hostname or "").casefold()
    path = parsed.path.rstrip("/").removesuffix(".git").casefold()
    if host:
        if host == "ssh.dev.azure.com" and path.startswith("/v3/"):
            parts = path.split("/")
            if len(parts) >= 5:
                return "dev.azure.com/" + "/".join([parts[2], parts[3], "_git", parts[4]])
        return f"{host}{path}"
    return value.removesuffix(".git").rstrip("/").casefold()


def select_repositories(root: Path, repositories: list[Path]) -> tuple[list[Path], list[dict[str, str]]]:
    groups: dict[str, list[Path]] = {}
    for repo in repositories:
        origin = canonical_origin(git_origin(repo))
        key = f"origin:{origin}" if origin else f"path:{repo}"
        groups.setdefault(key, []).append(repo)
    selected = []
    skipped = []
    for _key, candidates in sorted(groups.items()):
        candidates.sort(key=lambda p: str(p.relative_to(root)))
        selected.append(candidates[0])
        for duplicate in candidates[1:]:
            skipped.append({"path": str(duplicate), "same_origin_as": str(candidates[0])})
    return sorted(selected, key=lambda p: str(p.relative_to(root))), skipped


def base_refs(repo: Path) -> list[str]:
    try:
        refs = run_git(repo, "for-each-ref", "--format=%(refname)", "refs/heads", "refs/remotes").splitlines()
    except subprocess.CalledProcessError:
        return []
    return sorted(ref for ref in refs if ref.rsplit("/", 1)[-1] in {"main", "master"})


def commit_web_url(remote: str, sha: str) -> str | None:
    if not remote:
        return None
    value = remote
    if "://" not in value and ":" in value.split("/", 1)[0]:
        host, path = value.split(":", 1)
        value = f"https://{host.split('@')[-1]}/{path}"
    parsed = urlparse(value)
    host = (parsed.hostname or "").casefold()
    path = parsed.path.rstrip("/").removesuffix(".git")
    if not host or not path:
        return None
    base = f"https://{host}{path}"
    if "github" in host:
        return f"{base}/commit/{sha}"
    if "gitlab" in host:
        return f"{base}/-/commit/{sha}"
    if "bitbucket" in host:
        return f"{base}/commits/{sha}"
    if host == "ssh.dev.azure.com" and path.startswith("/v3/"):
        parts = path.split("/")
        if len(parts) >= 5:
            return f"https://dev.azure.com/{parts[2]}/{parts[3]}/_git/{parts[4]}/commit/{sha}"
    if host == "dev.azure.com" or host.endswith(".visualstudio.com"):
        return f"{base}/commit/{sha}"
    return None


def git_global_identity() -> dict[str, str] | None:
    values = {}
    for key in ("user.name", "user.email"):
        result = subprocess.run(
            ["git", "config", "--global", "--get", key],
            capture_output=True, text=True, check=False,
        )
        values[key] = result.stdout.strip()
    if values["user.name"] or values["user.email"]:
        return {"name": values["user.name"], "email": values["user.email"]}
    return None


def git_identity_candidates(repositories: list[Path]) -> list[dict[str, str]]:
    pairs: set[tuple[str, str]] = set()
    for repo in repositories:
        name = email = ""
        for key in ("user.name", "user.email"):
            try:
                value = run_git(repo, "config", "--get", key).strip()
            except subprocess.CalledProcessError:
                value = ""
            if key == "user.name":
                name = value
            else:
                email = value
        if name or email:
            pairs.add((name, email))
    global_identity = git_global_identity()
    if global_identity:
        pairs.add((global_identity["name"], global_identity["email"]))
    return [{"name": name, "email": email} for name, email in sorted(pairs)]


def git_identity_candidates_from_history(repositories: list[Path]) -> list[dict[str, str]]:
    pairs: set[tuple[str, str]] = set()
    for repo in repositories:
        try:
            refs = base_refs(repo)
            if not refs:
                continue
            raw = run_git(repo, "log", *refs, "--format=%an%x00%ae%x00%cn%x00%ce")
        except subprocess.CalledProcessError:
            continue
        for record in raw.splitlines():
            fields = record.split("\x00")
            if len(fields) == 4:
                author_name, author_email, committer_name, committer_email = fields
                if author_name or author_email:
                    pairs.add((author_name, author_email))
                if committer_name or committer_email:
                    pairs.add((committer_name, committer_email))
    return [{"name": name, "email": email} for name, email in sorted(pairs)]


def collect_commits(repo: Path, args: argparse.Namespace) -> list[dict]:
    # Keep collection bounded by one history read per repository. Per-commit
    # diff/stat subprocesses become prohibitively slow in a large repository tree.
    refs = base_refs(repo)
    if not refs:
        return []
    log_args = ["log", *refs, "--date-order", "--reverse"]
    if args.since:
        log_args.append(f"--since={args.since}T00:00:00")
    if args.until:
        log_args.append(f"--until={args.until}T23:59:59")
    log_args.append("--format=%x1e%H%x00%aI%x00%an%x00%ae%x00%cn%x00%ce%x00%s%x00%b")
    raw = run_git(repo, *log_args)
    commits = []
    for record in raw.split("\x1e"):
        fields = record.lstrip("\n").split("\x00", 7)
        if len(fields) < 8:
            continue
        sha, authored_at, author_name, author_email, committer_name, committer_email, subject, body = fields[:8]
        email_matches = args.identity_email and (
            author_email.casefold() == args.identity_email.casefold()
            or committer_email.casefold() == args.identity_email.casefold()
        )
        name_matches = args.identity_name and (
            author_name == args.identity_name or committer_name == args.identity_name
        )
        if args.identity_email and not email_matches:
            continue
        if args.identity_name and not name_matches:
            continue
        date = authored_at[:10]
        if args.since and date < args.since:
            continue
        if args.until and date > args.until:
            continue
        commit = {
            "hash": sha, "date": authored_at,
            "author": {"name": author_name, "email": author_email},
            "committer": {"name": committer_name, "email": committer_email},
            "subject": subject, "body": body.strip(),
        }
        web_url = commit_web_url(git_origin(repo), sha)
        if web_url:
            commit["web_url"] = web_url
        commits.append(commit)
    return commits


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=".")
    parser.add_argument("--identity-email", "--author-email", dest="identity_email")
    parser.add_argument("--identity-name", "--author-name", dest="identity_name")
    parser.add_argument("--since", help="Inclusive YYYY-MM-DD")
    parser.add_argument("--until", help="Inclusive YYYY-MM-DD")
    parser.add_argument("--days", type=int, help="Inclusive calendar days ending today")
    return parser.parse_args()


def effective_period(args: argparse.Namespace) -> tuple[str | None, str | None, str]:
    if args.days is not None and args.days < 1:
        raise ValueError("--days must be at least 1")
    if args.days is not None and (args.since or args.until):
        raise ValueError("--days cannot be combined with --since or --until")
    if args.days is None and not args.since and not args.until:
        args.days = 7
    if args.days is not None:
        end = date.today()
        start = end - timedelta(days=args.days - 1)
        return start.isoformat(), end.isoformat(), f"last {args.days} calendar days"
    return args.since, args.until, "explicit date range"


def main() -> int:
    args = parse_args()
    try:
        since, until, period_label = effective_period(args)
    except ValueError as error:
        print(json.dumps({"status": "error", "error": str(error)}))
        return 2
    args.since, args.until = since, until
    root = Path(args.root).expanduser().resolve()
    if not root.is_dir():
        print(json.dumps({"status": "error", "error": f"Not a directory: {root}"}))
        return 2
    discovered = discover_repositories(root)
    repositories, duplicate_repositories = select_repositories(root, discovered)
    configured = git_identity_candidates(repositories)
    authors = git_identity_candidates_from_history(repositories)
    global_identity = git_global_identity()
    configured_matches = (
        [global_identity] if global_identity else
        [candidate for candidate in configured if candidate in authors]
    )
    if not (args.identity_email or args.identity_name):
        selected_identity = (
            global_identity if global_identity
            else configured_matches[0] if len(configured_matches) == 1
            else None
        )
        if selected_identity:
            args.identity_email = selected_identity["email"] or None
            args.identity_name = selected_identity["name"] if not args.identity_email else None
    output = {
        "schema": "git-user-activity-summary/v1",
        "status": "ok" if args.identity_email or args.identity_name else (
            "identity_discovered" if len(configured_matches) == 1 else "needs_identity"
        ),
        "root": str(root),
        "period": {"since": since, "until": until, "label": period_label},
        "identity_candidates": authors,
        "configured_identity_candidates": configured,
        "configured_identity_matches": configured_matches,
        "repositories_found": len(repositories),
        "repositories_discovered": len(discovered),
        "duplicate_repositories": duplicate_repositories,
        "repositories": [],
        "errors": [],
    }
    if not (args.identity_email or args.identity_name):
        print(json.dumps(output, ensure_ascii=False, indent=2))
        return 0
    for repo in repositories:
        try:
            commits = collect_commits(repo, args)
        except subprocess.CalledProcessError as error:
            message = (error.stderr or "git command failed").strip()
            output["errors"].append({"repository": str(repo), "error": message})
            continue
        if commits:
            output["repositories"].append({"path": str(repo), "name": repo.name, "commits": commits})
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0


def selftest() -> None:
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        nested = root / "nested"
        nested.mkdir()
        marker = root / "worktree-marker"
        marker.mkdir()
        (marker / ".git").write_text("gitdir: /tmp/example-worktree\n")
        env = {**os.environ, "GIT_AUTHOR_NAME": "Test User", "GIT_AUTHOR_EMAIL": "test@example.com",
               "GIT_COMMITTER_NAME": "Test User", "GIT_COMMITTER_EMAIL": "test@example.com"}
        subprocess.run(["git", "init", "-q", str(root)], check=True)
        (root / "file.txt").write_text("one\n")
        subprocess.run(["git", "-C", str(root), "add", "file.txt"], check=True)
        subprocess.run(["git", "-C", str(root), "commit", "-q", "-m", "work in root"], check=True, env=env)
        subprocess.run(["git", "init", "-q", str(nested)], check=True)
        (nested / "file.txt").write_text("one\n")
        subprocess.run(["git", "-C", str(nested), "add", "file.txt"], check=True)
        subprocess.run(["git", "-C", str(nested), "commit", "-q", "-m", "work in nested"], check=True, env=env)
        (root / "other.txt").write_text("other\n")
        subprocess.run(["git", "-C", str(root), "add", "other.txt"], check=True)
        other_env = {**env, "GIT_AUTHOR_NAME": "Other User", "GIT_AUTHOR_EMAIL": "other@example.com"}
        subprocess.run(["git", "-C", str(root), "commit", "-q", "-m", "other work"], check=True, env=other_env)
        args = argparse.Namespace(identity_email="test@example.com", identity_name=None, since=None, until=None)
        discovered = discover_repositories(root)
        assert len(discovered) == 3 and discovered == sorted(discovered, key=lambda p: str(p.relative_to(root)))
        # The second root commit has a different author but the selected
        # identity is its committer, so author OR committer matching is tested.
        assert len(collect_commits(root, args)) == 2
        assert len(collect_commits(nested, args)) == 1
    print("selftest OK")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        raise SystemExit(main())
