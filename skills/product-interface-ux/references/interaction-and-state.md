# Interaction and state

Use this reference for async work, feedback, empty/error states, destructive or
reversible actions, overlays, direct manipulation, and component interaction.
Every recommendation names the state transition and consequence it clarifies.

## State completeness

Model only reachable states, but do not collapse materially different outcomes:

```text
idle -> acting -> pending -> success
                    |-> partial
                    |-> error -> retry/recover
                    |-> offline -> queued/reconnect
                    |-> conflict -> compare/resolve
```

- **required:** state exposed visually must agree with system truth. Never say
  “saved”, “published”, “paid”, or “deleted” before that outcome is established.
- **strong-default:** acknowledge input promptly, preserve focus and values, and
  prevent ambiguous duplicate work while pending.
- **contextual:** optimistic updates, skeletons, spinners, progress, queueing, and
  polling depend on reversibility and what the system knows.

A busy control is not merely disabled. Keep its identity and focus stable when
possible, expose busy state, prevent duplicate submission, and announce outcome.
If the control truly becomes unavailable, explain the blocker through reachable
text or the associated field/state; never depend on a tooltip on a dead control.

## Loading and progress

Choose by information, not a universal timeout:

- known content shape: a stable skeleton may preserve layout;
- known measurable completion: progress with honest units/percentage;
- short unknown work: local busy indicator and status;
- reversible low-risk action: optimistic update with rollback;
- very fast response: avoid indicator flicker, but still preserve press/action
  feedback and programmatic outcome.

Delay thresholds are calibration inputs, not laws. Measure actual latency and
avoid a full-page spinner for work that can progressively reveal useful content.
Skeleton geometry should match final content to avoid layout shift. Motion on a
skeleton is optional and must have a reduced alternative.

## Errors and recovery

Place an error where its cause and recovery are understood:

- field error adjacent and programmatically associated with the field;
- multi-field failure summarized with focus/navigation to each issue when the
  workflow needs it;
- transient system issue in a persistent-enough status/banner with retry;
- blocking failure in a dedicated surface only when the task cannot continue.

Say what failed, what remains safe, and what action is possible. Preserve entered
values. Raw codes/details may be available for support but are not the only copy.
An error with only OK is a dead end unless acknowledgment itself resolves the
situation.

Empty states are distinct: first use, valid zero data, no search results,
filtered-out results, permission limits, and load failure. Do not label an error
as empty. Provide the next useful action only when one exists; an illustration,
ghost preview, or brand tone is optional.

## Destructive and reversible actions

Match friction to reversibility and blast radius:

- reversible, local, low-risk action: immediate result plus reachable undo is a
  strong default;
- recoverable deletion: soft delete/trash or grace period when product semantics
  permit;
- irreversible, legal, financial, security, or high-blast action: review,
  confirmation, correction, and explicit action naming; type-to-confirm is a
  contextual extra, not a universal requirement;
- destructive bulk action: disclose exact scope and consequence. Do not blindly
  replace confirmation with a short undo window.

Use action-specific labels (“Delete project”, “Keep project”), not Yes/No detached
from the question. If a reachable client path removes the object and exposes no
undo, trash, grace period, or other recovery, report that recovery failure at the
observed client scope; unknown backend persistence limits the conclusion but does
not erase the visible dead end. Do not rely on color, geography, a hold gesture,
or a 300ms press as the only safeguard. Under WCAG 3.3.4,
legal/financial/data submissions need reversibility, checking, or
review/confirmation when in scope.

## Optimistic UI

Use only when all are true:

1. likely success;
2. failure can be rolled back or reconciled without hidden harm;
3. the user can understand pending versus confirmed when that distinction
   matters;
4. concurrent updates and retries cannot silently overwrite work.

Likes, local reorders, and favorites often qualify. Payments, bookings,
permissions, destructive commitments, and server-generated identity generally
do not. Keep the draft/current value on failure and show a recovery path.

## Autosave and concurrency

Autosave is a state machine, not a “Saved” label. Distinguish editing, pending,
saving, saved, offline/queued, conflict, and error where reachable. Debounce based
on cost and data-loss risk, not one magic interval. Flush or warn on navigation
when data remains unsafe. For multiple tabs/users, merge, version, lock, or surface
conflict; silent last-write-wins can erase work.

## Overlays and disclosure

First choose blocking versus contextual:

- modal only when background interaction must stop;
- popover/menu anchored to a trigger for lightweight contextual actions;
- drawer for adjacent navigation/inspection when the app may remain active;
- bottom sheet when mobile reach/context and content justify it;
- native disclosure for expandable supporting content.

Use the accessibility contract for semantics/focus. Position within the viewport
and preserve the trigger relationship. Dismiss in a predictable way. Nested or
stacked blocking overlays are a strong warning: consolidate the workflow unless
one layer is essential and tested.

Accordion/disclosure open policy is contextual: single-open for mutually
exclusive sequential focus; multi-open when comparison or reference benefits.
Do not claim intrinsic height can never animate—current CSS has support-dependent
options such as `interpolate-size`; preserve a no-motion fallback.

Tabs follow the
[APG tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/). Automatic
activation is recommended only when panels appear without noticeable latency;
otherwise use manual activation so arrow-key focus remains fast. Motion between
panels is optional and cannot delay access.

Tooltips contain brief supplemental information, never the only label,
instruction, error, or primary action. Trigger by focus as well as hover; make
custom content dismissible, hoverable, persistent, edge-aware, and readable at
zoom. Longer interactive material belongs in another surface.

## Direct manipulation and gestures

Direct manipulation should track sufficiently early to establish control, while
allowing intentional slop/hysteresis so a scroll or adjacent gesture is not
stolen. “First pixel” is not an absolute.

- Commit high-cost actions on release with cancellation/reversal, not pointer
  down or threshold crossing alone.
- Make transitions interruptible when the user can reverse/retrigger the
  interaction. Brief atomic feedback need not become a complex interruptible
  state machine.
- Derive drag commit from product-tested distance/velocity; no universal velocity
  constant applies across input devices.
- Use pointer capture when a custom drag must continue outside its source.
- Snap only when the domain has discrete valid positions; free canvases differ.
- Provide non-drag and keyboard paths, visible affordance, and undo/recovery.
- Swipe/long-press/context menu actions always need a discoverable equivalent.

Spatial motion should reflect a real source/destination. Crossfade or instant
change is better than inventing a false direction. Do not hardcode forward=right;
account for RTL, writing mode, hierarchy, and platform.

## Conditional recipes

Load these only when present:

- **Bulk selection:** expose scope/count, indeterminate state when meaningful,
  persistence rules across pages/filters, and a clear reset. Selection semantics
  depend on whether “all” means visible, loaded, or all matching records.
- **Inline edit:** signal editability without hover-only dependence; keep layout
  stable; define Enter/Escape and blur policy consistently; preserve draft on
  failed save.
- **Filters:** active state and result change must be perceivable; expose clear
  reset and current criteria. OR/AND logic must match the domain and copy.
- **Command palette/context menu:** supplement visible navigation, support full
  keyboard operation, group results/actions, keep async state local, and provide
  mobile/touch equivalents. High-frequency invocation should not wait for an
  entrance animation.
- **Live collaboration:** stable identity, presence, conflict prevention or merge,
  network smoothing, and user-controlled follow behavior. Do not assume locking
  is always preferable to collaborative merge.
- **Ratings:** preview and committed value must remain distinct; aggregate values
  must not be rounded or drawn misleadingly. Animation is optional.

## Verify

Static: state model, concurrency guards, rollback, copy, semantic component,
equivalent paths. Browser: rapid repeat, interruption, offline/failure, slow
network, keyboard/focus, touch/pointer, viewport edges, refresh/back. Product:
blast radius, user expectation, actual latency, conflict policy, and whether a
recipe improves the task. Preserve clean behavior and report untested states.
