---
name: ponytail-review
description: Code review focused exclusively on over-engineering. Finds what to delete in a diff — reinvented standard library, unneeded dependencies, speculative abstractions, dead flexibility. One line per finding — location, what to cut, what replaces it. Use when the user says "review for over-engineering", "what can we delete", "is this over-engineered", "simplify review", or "ponytail-review". Complements correctness-focused review; this one only hunts complexity. Do NOT use for correctness, security, or performance review.
source: https://github.com/DietrichGebert/ponytail
---

# Ponytail Review

Review diffs for unnecessary complexity. One line per finding: location, what to cut, what replaces it. The diff's best outcome is getting shorter. List findings only — never apply the fixes.

## Format

`L<line>: <tag>: <problem>. <replacement>.`, or `<file>:L<line>: ...` for multi-file diffs.

Tags:
- `delete:` dead code, unused flexibility, speculative feature. Replacement: nothing.
- `stdlib:` hand-rolled thing the standard library ships. Name the function.
- `native:` dependency or code doing what the platform already does. Name the feature.
- `yagni:` abstraction with one implementation, config nobody sets, layer with one caller.
- `shrink:` same logic, fewer lines. Show the shorter form.

## Examples

- `L12-38: stdlib: 27-line email validator class. "@" check + confirmation mail is the real validation, 1 line.`
- `L4: native: moment.js imported for one format call. Intl.DateTimeFormat, 0 deps.`
- `repo.py:L88: yagni: AbstractRepository with one implementation. Inline it until a second one exists.`
- `L52-71: delete: retry wrapper around an idempotent local call. Nothing replaces it.`
- `L30-44: shrink: manual loop builds dict. dict(zip(keys, values)), 1 line.`

## Scoring

End with the only metric that matters: `net: -<N> lines possible.` If there is nothing to cut, say `Lean already. Ship.` and stop.

## Boundaries

Scope: over-engineering and complexity only. Correctness bugs, security holes, and performance are explicitly out of scope — route them to a normal review pass, not this one. A single smoke test or `assert`-based self-check is the ponytail minimum, not bloat; never flag it for deletion. Does not apply the fixes, only lists them. "stop ponytail-review" or "normal mode" reverts to verbose review style.
