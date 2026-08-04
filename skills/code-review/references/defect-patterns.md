# Defect patterns

A checklist for enumeration, not a list of things to report. Each entry is a
**trigger** you can observe in a diff, the **question** it forces, and the
**evidence** that settles it. Most triggers are innocent most of the time: the
value is that the question gets asked once per occurrence instead of only when
something looks suspicious.

Two rules govern the whole list:

- A trigger is not a finding. Report only after the evidence column is satisfied
  and the consequence is reachable.
- The evidence usually lives outside the diff. `impact-map.sh` lists the
  unchanged files coupled to each hunk; that is where most of these questions
  are answered.

## Contract and signature

| Trigger | Question | Evidence |
| --- | --- | --- |
| A parameter is added, removed, reordered, or retyped | Does every call site pass the new shape? | Every reference in unchanged files, read at the call |
| A function/method/endpoint is renamed or removed | Does anything still reference the old name? | Search the old name across the repository, including config, docs, and templates |
| A return value, response body, or event payload changes field names, types, nesting, or nullability | Does every consumer read the new shape? | The consuming code, schema, or client, especially in another module or service |
| A default parameter, optional field, or overload is introduced | Do existing callers now take a different branch? | The call sites that omit the argument |
| An interface, protocol, or abstract type gains or loses a member | Does every implementation still satisfy it? | Every implementor, including ones outside the diff |
| A sync function becomes async (or blocking becomes deferred) | Does every caller await, join, or otherwise wait for it? | Each call site: an unawaited result silently discards both value and error |
| An error type, code, exit status, or exception class changes | Do handlers still match it? | The catch/rescue/match sites and any caller that switches on the code |
| A public constant, enum member, or wire-level string value changes | Is the old value persisted, cached, or sent by an older client? | Storage, cache, and any producer/consumer at a different version |

## Authorization and identity

| Trigger | Question | Evidence |
| --- | --- | --- |
| A route, handler, command, or job is registered | Which guard applies to it, and where is that guard applied? | The registration site and the shared middleware/filter chain; compare with a sibling entry that is guarded |
| A guard, check, or validation call is deleted or moved | Is the guarantee provided somewhere else now, or lost? | The place it supposedly moved to. Absence of proof is not proof of absence |
| A permission, role, tenant, or owner check changes shape | Can the new condition be satisfied by a caller who should fail it? | The truth value of the condition for a hostile-but-authenticated caller |
| An identifier used for scoping is dropped from a query, key, path, or filter | Can one principal now reach another's data? | The full read/write path, including cache and index keys |
| A permission or session result is cached | What invalidates it when the underlying grant changes? | The revocation/logout/role-change path |
| An impersonation, service-account, or elevated path is added | Who may invoke it, and is that intersected with the target's tenant? | The caller-facing entry point |

## Input handling and untrusted data

| Trigger | Question | Evidence |
| --- | --- | --- |
| A request, message, file, or environment value reaches a filesystem path | Can it traverse or escape the intended root? | Whether the value is constrained to an allow list rather than sanitized |
| ... reaches a shell, subprocess, or eval | Is it passed as an argument vector rather than interpolated into a string? | The declaration of the value's own validation, which is often laxer than assumed |
| ... reaches a query, template, or serializer | Is it bound as a parameter rather than concatenated? | The query construction site |
| ... reaches an outbound request URL, host, or port | Can it address an internal network, a metadata service, or a loopback port? | The egress helper actually used, and whether it still validates |
| ... reaches a deserializer, archive extractor, or parser | Can it instantiate types, traverse paths, or expand without bound? | Extraction/parse limits |
| ... reaches HTML, a redirect target, or a response header | Is it encoded for that sink? | The escaping helper and what it actually escapes |
| A validation helper is loosened, or a new one is introduced next to an existing one | Which one do existing call sites use? | The call sites: a stricter new helper nobody adopted changes nothing |
| A limit, quota, size cap, or rate limit is raised or removed | What consumes the unbounded input? | The consumer's memory, time, or cost profile |

## Data, persistence, and migrations

| Trigger | Question | Evidence |
| --- | --- | --- |
| A column/field is added with a not-null or unique constraint | Is there a default and a backfill, and does every writer supply it? | The insert/update paths, including ones not in the diff |
| A column, table, index, or field is dropped or renamed | Does any reader, writer, or query still use it, and is there a rollback? | Readers in other services, saved queries, dashboards |
| A migration is destructive or non-transactional | What happens to in-flight traffic during it, and can it be reverted? | Order of deploy vs migration |
| A `WHERE`, filter, join, or predicate changes, especially adding `or` / removing `and` | Which rows does it now match that it did not before? | Evaluate the predicate against a row that should be excluded |
| A delete, truncate, purge, or retention sweep changes | What is the blast radius if the predicate is wrong, and is it reversible? | Whether the job runs unattended and with what privileges |
| A cache key, hash, ETag, or dedupe key composition changes | Can two distinct entities now collide? | The parts dropped from the key and who supplies them |
| A cache TTL, staleness window, or invalidation path changes | What now serves stale data, and for how long? | The mutation path that should invalidate |
| A read-modify-write loses a version, ETag, lock, or conditional check | What happens with two concurrent writers? | The update statement's condition |
| Ordering, pagination, or a boundary comparison changes (`<` vs `<=`, offset math) | Which record is skipped or repeated at the boundary? | The first and last element of a page |
| Serialization format, encoding, precision, or timezone handling changes | Can previously written data still be read identically? | Round-trip of an old value, and money handled as float |

## Concurrency, reliability, and resources

| Trigger | Question | Evidence |
| --- | --- | --- |
| Acknowledge, commit, or lock release moves relative to the work it protects | What happens if the work fails after that point? | Whether delivery becomes at-most-once, or a lock is released early |
| A retry, backoff, or timeout value changes, or a timeout becomes zero/unset | What is the behavior against a hung or failing dependency? | The transport's interpretation of the value, read in its own code |
| A retry is added without idempotency | What duplicates on the second attempt? | Side effects between the entry point and the retried unit |
| Work moves into a loop, batch, or per-item request | Does cost grow with input size (N+1 queries, per-item network calls)? | The call inside the loop and the loop's bound |
| Concurrency, parallelism, or pooling changes | What is now shared without a lock, and what is the ordering assumption? | Shared mutable state reachable from the changed path |
| A resource is opened, acquired, or subscribed | Is it released on every path, including error paths? | The failure branch |
| An unbounded collection, buffer, or accumulator is introduced | What bounds it under adversarial or large input? | The producer's rate |

## Configuration, deploy, and supply chain

| Trigger | Question | Evidence |
| --- | --- | --- |
| A shared default, feature flag, or environment value changes | Which services read it, and does any override it locally? | Every reader, since a shared default reaches all of them |
| A debug, verbose, profiling, or maintenance capability is enabled | Is this overlay/environment a production one, and what does the capability expose? | The environment markers in the same file |
| A dependency, base image, action, or toolchain reference becomes floating, or is downgraded | Is the build still reproducible, and did a pin become mutable? | The version specifier before and after |
| A build/CI trigger, permission scope, or secret exposure changes | Can code from an untrusted source run with those credentials? | The trigger's semantics and what the job then executes |
| A pipeline gate, required check, approval, or failure condition is relaxed | What can now merge or deploy that could not before? | The condition and its default when unset |
| A credential, token, key, or connection string appears, moves, or is logged | Is the value real, is it reachable, and where does it land? | The sink: log, artifact, response, or repository history |
| Container, runtime, or network settings change (privileges, users, ports, mounts) | Does the workload gain capability it does not need? | The setting's default and the workload's requirement |

## Observability and operability

| Trigger | Question | Evidence |
| --- | --- | --- |
| An error is caught and not rethrown, or is converted to a success value | Does the caller still learn about the failure? | The return value on the failure path and what the caller does with it |
| A metric, counter, or status is emitted on a path that does not match its name | Would an operator be misled during an incident? | The name versus the branch it is emitted from |
| A log gains a payload, body, headers, or entity | Does it now contain credentials or personal data? | What the source object can contain, not what the happy path contains |
| A log, trace, alert, or health check is removed or downgraded | What incident becomes invisible? | The alerting or dashboard consumer |
| An operator-facing message, exit code, or summary changes meaning | Does automation parse it? | Callers of the script or command |

## Tests and documentation as signal

| Trigger | Question | Evidence |
| --- | --- | --- |
| An assertion is weakened, widened, or made to accept several outcomes | Would the test still fail if the behavior regressed? | The regression it would have caught, checked against the same change |
| A test is skipped, deleted, or has its fixture changed to match new behavior | Was the behavior change intentional and correct, or was the test bent to fit it? | The behavior the old fixture encoded |
| A mock, stub, or type cast is introduced to make a call compile or pass | Does the real implementation still satisfy the call? | The real declaration |
| Documentation states a guarantee (a convention, an invariant, a trust boundary) | Does the change still honor it? | The stated rule versus the changed code. A documented convention is a contract |
| A commit message or comment asserts safety ("validation moved", "safe because") | Is the asserted fact true in this diff? | Verify the claim; a claim is a lead, never evidence |

## Distinguishing what must not be reported

Before reporting, run each candidate against these three disproofs. Each one has
a mechanical check.

| Disproof | Check |
| --- | --- |
| The guarantee exists elsewhere | Read the shared chain, wrapper, base class, or framework hook that applies to the changed unit. A removed local check is not a defect if an unchanged global one covers it |
| It predates this change | The offending line is unchanged in the range. Verify with the diff for that file; if the line is context rather than an addition, it is out of scope for this review |
| It was cancelled inside the range | The file appears in the commit history but not in the net diff, or the specific line was added and then reverted. `cancelled-files.txt` lists the file-level case |

Also do not report: a value that only looks dangerous (randomness used for
jitter, a fixed literal passed to a subprocess, raw SQL that is parameterized),
an addition guarded by a flag that defaults to off with a safe fallback, or a
drop-and-recreate pair that is complete within the same unit.
