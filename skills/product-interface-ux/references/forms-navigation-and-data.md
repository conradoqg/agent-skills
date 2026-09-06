# Forms, navigation, and data

Load only for the relevant input or information architecture. Prefer native web
controls and the product's design system before custom widgets.

## Forms are task contracts

Each field needs a persistent label, expected format when non-obvious, current
value, and reachable error/recovery. Placeholder examples may supplement but not
replace labels. Preserve user input on validation or server failure.

Distinguish states that can occur: default, focus, filled, invalid, valid when
confirmation is useful, unavailable, readonly, pending, and server error. Do not
force a visual design for unreachable states. Error state combines text and
programmatic association; color/icon alone is insufficient.

Client validation improves feedback, not trust. The server validates all
security/business rules and recomputes sensitive values. For related writes,
backend atomicity/reconciliation is part of the user contract: do not show final
success after partial failure.

## Validation timing is contextual

Default to validation after the user attempts the relevant step when early
validation would interrupt entry. GOV.UK explicitly recommends submit/continue
and adds client/live validation only when product research shows net benefit.
Other products can reasonably use blur or live validation when:

- the field is complete/determinable;
- waiting would waste substantial work;
- the feedback helps correction rather than punishing incomplete input;
- screen-reader and focus behavior have been tested;
- client and server rules cannot diverge silently.

After an error, revalidation while correcting can remove stale feedback, but
avoid noisy announcements on every keystroke. On submit, focus a usable summary
or the first error according to the product pattern and preserve all values.
Do not report submit validation as defective merely because blur is possible.

## Availability, disabled, and busy

A disabled control can be correct when an action is genuinely unavailable and
its reason is already understandable. It leaves the tab order in native HTML;
therefore do not attach the only explanation to its hover. Alternatives:

- keep submit available and reveal validation blockers on activation;
- associate reachable explanatory text with an unavailable action;
- use readonly when value must remain perceivable/copyable;
- keep a submitting control in the tab order and preserve focus if it was active;
  expose busy state while preventing a duplicate action;
- announce the specific success, partial result, or failure through an existing
  accessible status channel without moving focus merely to expose feedback.

Do not mechanically forbid `disabled`, and do not fake it with appearance only.
Before handoff, verify or state explicitly that focus remains stable during the
pending interval and that the final status—not only “busy”—is announced.

## Input recipes

- **Password:** permit paste/password managers; support `autocomplete`; provide a
  named visibility toggle; disclose applicable requirements before failure.
  Strength meters are contextual and must not encourage brittle composition
  rules. Generated credentials are useful when the product can save/use them.
- **Masking:** accept paste and common separators, preserve caret/editing, display
  a comprehensible format, and submit canonical data. Validate when the value is
  complete enough. Test locales, IME, deletion, selection, and screen readers.
- **Date/time:** prefer native input when it meets locale/range requirements.
  A custom picker requires label, typing, grid keyboard behavior, unavailable
  dates, range semantics, timezone policy, and responsive operation; month count
  and presets depend on the task.
- **Range slider:** pair with current value and keyboard operation; enlarge the
  interactive target; use steps only when discrete values are meaningful. Offer
  numeric entry when precision matters.
- **Toggle:** use for an immediately applicable binary setting; use a checkbox
  when form submission/batch apply is the model. Name the state, support native
  keyboard semantics, and make pending/rollback honest. Animation is optional.
- **File upload:** expose accepted type/size before selection, per-file progress
  when measurable, cancellation/retry, server validation, and a proof of selected
  file. Drag-and-drop supplements a file control; it never replaces it.
- **OTP:** treat paste/autofill as primary; one semantic value may render segmented
  boxes; preserve correction/backspace; use appropriate inputmode/autocomplete;
  rate-limit resend with an understandable timer. A wrong code need not shake.
- **Color input:** a custom picker may expose formats, alpha context, recent
  values, and live contrast; use it only when users need that decision support.
  Contrast pass/fail must consider the actual foreground/background use.

## Settings, autosave, and wizards

Group settings by user task, not database or organization chart. Match apply
model to consequence: low-risk independent settings can apply immediately;
identity, permission, billing, and coupled changes may need explicit review/save.
Show modified state and a scoped reset only when defaults/overrides exist.

Autosave must expose truth and protect conflicts; use the interaction state
reference. Search is useful only when settings volume and vocabulary make
browsing costly. A danger zone, type-to-confirm, or advanced disclosure is
contextual, never required merely because the page is called Settings.

Split a long form into steps when grouping by task reduces memory/scroll cost;
not by an arbitrary field quota. Show progress that accurately represents the
flow, validate each transition, preserve prior answers/back navigation, and make
review/correction available for consequential submission. A short coherent form
should remain one page.

## Navigation and findability

Choose navigation from hierarchy, task frequency, available space, and platform:

- keep primary destinations discoverable; a command palette is an accelerator,
  not the only route;
- use breadcrumbs when ancestry aids orientation/navigation, not from a fixed
  depth count;
- preserve current location and consistent naming/order;
- adapt layout without changing the information architecture unexpectedly;
- respect RTL/writing mode rather than fixing forward/back to right/left.

Bottom tabs, sidebar, top nav, drawer, and menu are contextual patterns—not
mobile/desktop laws or engagement percentages. Test real destination count,
labels, permissions, narrow viewport, zoom, touch, and keyboard.

## Search and filters

Search must communicate what is searchable, pending state, result count, empty
versus error, and a recovery path. Suggestions/recent searches are contextual and
may carry privacy implications. Ranking needs product evidence; alphabetical is
not automatically wrong. Keyboard interaction and visible focus are required for
custom autocomplete/listbox behavior.

Filters expose active criteria, combination semantics, changed results, and a
reset. Keep state in the URL when share/refresh/back behavior matters. Do not
force chips, sticky summaries, or horizontal scroll when another clear control
fits the density and platform.

## Pagination and continuity

Choose from data volatility and user task:

- numbered/offset when stable random access and total pages matter;
- cursor when rows change frequently and stable continuation matters;
- load more when user-controlled accumulation fits;
- infinite scroll for continuous exploration only when return position,
  accessibility, footer access, and stopping points remain usable.

Persist page/query/filter in the URL when views should be refreshable/shareable.
Restore list context after detail navigation. Do not replace a valid pagination
model simply because another is fashionable.

## Tables, bulk actions, and charts

Data tables need programmatic headers, meaningful caption/label, keyboard/focus
for interactive cells, responsive overflow or alternate view, and readable
selection/sort state. Numeric alignment/tabular figures and sticky headers are
strong defaults when they materially improve comparison; zebra stripes, density
values, and frozen columns are contextual.

Sort may be two-state or restore original order depending on product semantics;
make available states and current sort clear. Bulk selection discloses whether it
covers visible rows, loaded rows, or all matching records and keeps counts honest
as filters change.

Charts must represent data truthfully:

- bar lengths normally require a zero baseline; exceptions need a representation
  where the encoding remains honest and clearly labeled;
- line and other positional charts need scales that do not manufacture a trend;
- chart type follows the question and data, not a fixed slice count;
- color encodes meaning and has non-color support;
- labels, units, time range, source, missing data, and uncertainty remain clear;
- title can state a supported takeaway, never one contradicted by the data.

Remove 3D or decoration when it distorts encoding, but do not maximize a numeric
“data-ink ratio” mechanically. Test with actual data, extremes, missing values,
zoom, screen readers, and a tabular/text alternative where necessary.

## Technical freshness

Do not repeat stale frontend folklore. For example, `z-index` applies to
positioned elements and flex/grid items; diagnose stacking contexts. Intrinsic
size transitions now have `interpolate-size`, but MDN still marks support limited
as of 2026-09-06; use feature detection/fallback and target-browser evidence.

## Verify

Static: labels, native types, autocomplete, state persistence, server contract,
URL state, table semantics, chart scale. Browser: keyboard, validation sequence,
paste/autofill, IME, failure/slow/offline, back/refresh, responsive overflow.
Product: terminology, hierarchy, data volatility, privacy, precision, and risk.
