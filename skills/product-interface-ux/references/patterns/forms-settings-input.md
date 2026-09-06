# Forms, settings, and input patterns

Use these recipes only after applying the source precedence and admission test in
[the evidence ledger](../evidence-ledger.md). Read them with
[forms, navigation, and data](../forms-navigation-and-data.md),
[accessibility contracts](../accessibility.md), and
[interaction and state](../interaction-and-state.md); those references override
catalog recipes whenever standards, product evidence, risk, or reachable state
demands a different behavior.

### Settings System

- **Use when:** A product has enough independent preferences that users need durable grouping, discoverable ownership, or distinct apply models.
- **Force:** `contextual` — Group by user task and consequence, not schema or organization. Keep each control’s visible label, current value, scope, default, and modified state understandable.
- **Rule:** Use native checkboxes, radios, selects, fieldsets, and buttons first. Immediate application suits low-risk independent changes; coupled, identity, permission, billing, or destructive changes require explicit review and recovery appropriate to their stakes.
- **Implementation:** Preserve keyboard order and focus across filtering or saving. For remote writes, expose pending, success, error, and conflict; version requests so a late response cannot overwrite a newer choice.
- **Exceptions:** Search, reset, advanced disclosure, danger zones, cards, sidebars, and any particular settings layout are contextual, never universal requirements.
- **Verify:** Test labels and descriptions, Tab order, narrow reflow, changed/default indicators, rapid repeated edits, failure, retry, stale responses, refresh, and concurrent tabs.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/settings-system), [HTML forms](https://html.spec.whatwg.org/multipage/forms.html), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), and the linked local references above.

### Autosave

- **Use when:** Work is incremental, frequent, and safer to preserve continuously than to hold behind an explicit commit.
- **Force:** `contextual` — Treat autosave as editing, pending, saving, saved, offline, error, and conflict states; never announce “Saved” before durable acknowledgement.
- **Rule:** Preserve the draft independently of server truth. Queue or warn when offline, identify conflicts through versioning or merge, and keep recovery available after rejection.
- **Implementation:** Coalesce writes according to measured cost and data-loss risk, flush on safe boundaries, and ignore superseded responses. Respect IME composition before treating text as complete; use a polite status channel without announcing every character.
- **Exceptions:** There is no universal debounce, idle interval, save cadence, or optimistic policy. Explicit Save is better for consequential batches, reviewable changes, or systems that cannot reconcile concurrency safely.
- **Verify:** Type rapidly, compose with an IME, navigate away, close with unsafe work, lose and restore connectivity, retry failures, edit in two tabs, and confirm focus and draft survive every transition.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/autosave-ux), [HTML forms](https://html.spec.whatwg.org/multipage/forms.html), [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), and [MDN beforeunload](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event).

### Date Pickers

- **Use when:** A task requires a date or date range and direct text entry alone would make valid choices, constraints, or comparison difficult.
- **Force:** `contextual` — Start with native date controls when their browser behavior meets the product’s locale and constraint needs; retain a typed path even when adding a custom calendar.
- **Rule:** State the accepted date meaning, unavailable dates, range boundaries, and timezone policy. A date-only value must not drift because it was silently converted through a timestamp.
- **Implementation:** A custom grid needs a persistent label, visible focus, arrow navigation, predictable month/year movement, and Enter selection. When it appears in a dismissible overlay, support Escape and restore focus to the invoker; inline and full-page calendars follow their container's navigation contract. Parse locale-aware input deliberately and expose validation beside the field.
- **Exceptions:** Presets, visible month count, first day of week, popover versus sheet, confirmation, and responsive layout depend on task, locale, viewport, and platform; none is universal.
- **Verify:** Test keyboard-only typing and grid use, screen-reader names, locale formats, RTL, month/year edges, leap days, timezone boundaries, zoom, mobile keyboard, invalid input, and range correction.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/date-pickers), [HTML date state](https://html.spec.whatwg.org/multipage/input.html#date-state-(type=date)), [APG date picker example](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/), and [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

### Form Field States

- **Use when:** Documenting or implementing any field whose appearance or behavior changes during entry, validation, availability, or remote work.
- **Force:** `required` — Model only reachable states, while distinguishing default, focus, filled, invalid, readonly, unavailable, pending, and server error whenever their consequences differ.
- **Rule:** Keep a persistent visible label and associate instructions and errors programmatically. Color, placeholder, icon, or border alone cannot carry name or status; visible focus must remain perceivable.
- **Implementation:** Prefer the native control and attributes such as `required`, `readonly`, `disabled`, and `autocomplete`. Preserve value and focus during async checks, announce meaningful outcomes politely, and prevent stale validation responses from replacing newer input.
- **Exceptions:** Success decoration, inline icons, floating labels, loading spinners, and disabled presentation are optional. Do not invent a visual state that users can never reach.
- **Verify:** Inspect computed name, description, invalid and busy state; then test Tab/Shift+Tab, zoom, forced colors, paste, autofill, IME composition, slow validation, failure, correction, and submit recovery.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/form-field-states), [HTML forms](https://html.spec.whatwg.org/multipage/forms.html), [WCAG labels or instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html), and [GOV.UK validation](https://design-system.service.gov.uk/patterns/validation/).

### Input Masking

- **Use when:** Formatting materially improves recognition or error prevention for structured values such as account, telephone, or document identifiers.
- **Force:** `contextual` — Keep one canonical value separate from its presentation, and preserve selection, caret, deletion, correction, paste, autofill, and assistive-technology comprehension.
- **Rule:** Prefer native input semantics and permissive parsing. Accept common separators, normalize at a trust boundary, and validate only when enough of the value exists to judge it.
- **Implementation:** Handle `beforeinput`, input, and composition without rewriting an active IME sequence. Reformat pasted or autofilled content rather than rejecting harmless punctuation; restore the logical caret after inserted or removed separators.
- **Exceptions:** Chunk size, separators, allowed characters, brand detection, blur timing, and visual grouping depend on locale and domain. A mask is wrong when free text or a native specialized input already works.
- **Verify:** Exercise mid-string edits, selection replacement, Backspace/Delete around separators, full and partial paste, autofill, undo/redo, IME, mobile keyboards, screen readers, locale variants, and server canonicalization.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/input-masking), [HTML input](https://html.spec.whatwg.org/multipage/input.html), [MDN input event](https://developer.mozilla.org/en-US/docs/Web/API/Element/input_event), and [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

### Range Sliders

- **Use when:** Users choose an approximate value or bounded interval and spatial comparison is faster than typing an exact number.
- **Force:** `contextual` — Prefer native `input type="range"`, give it a persistent label, expose its current value, and offer numeric entry when precision or wide ranges make dragging costly.
- **Rule:** Keyboard operation, visible focus, min/max meaning, and value units must remain clear. A two-ended custom range needs independently named handles and an unambiguous active handle.
- **Implementation:** Use `min`, `max`, and `step` only from domain constraints; synchronize an `output` or equivalent text without flooding announcements. Enlarge the practical pointer target without changing the represented value.
- **Exceptions:** There is no universal step, tick count, fill direction, tooltip, handle layout, or orientation. Continuous values are valid when the domain is continuous; RTL and vertical writing can alter spatial mapping.
- **Verify:** Test arrows and supported Home/End behavior, touch and mouse, direct numeric correction, min/max crossing policy, zoom, RTL, forced colors, screen-reader value announcements, and invalid server bounds.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/range-sliders), [HTML range state](https://html.spec.whatwg.org/multipage/input.html#range-state-(type=range)), [APG slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider/), and [WCAG dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html).

### Stepper Wizard

- **Use when:** A consequential or lengthy form has meaningful task stages whose separation reduces memory, dependency, or review burden.
- **Force:** `contextual` — Group stages by user intent and prerequisites, not an arbitrary field quota. Show truthful progress, preserve prior answers, and permit review and correction before consequential submission.
- **Rule:** Keep each stage a semantic form with persistent labels and reachable errors. Validate the transition’s necessary rules on Next; the server remains authoritative for business and security rules.
- **Implementation:** Persist state across Back, refresh, and authentication interruptions when safe. Move focus to the new stage heading or error summary deliberately, guard duplicate async transitions, and retain values after failure.
- **Exceptions:** No universal number of steps, fields per step, progress indicator, navigation layout, or mobile composition exists. A short coherent form should stay on one page.
- **Verify:** Complete the flow keyboard-only; revisit and edit earlier answers; test browser Back, refresh, deep links, expiry, slow and failed transitions, duplicate activation, narrow reflow, focus restoration, and final server rejection.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/stepper-wizard), [HTML forms](https://html.spec.whatwg.org/multipage/forms.html), [GOV.UK question pages](https://design-system.service.gov.uk/patterns/question-pages/), and [WCAG error identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html).

### Toggle Anatomy

- **Use when:** One binary setting takes effect independently and users should understand its current state before activation.
- **Force:** `contextual` — Start with a native checkbox styled as a switch, or another control whose semantics are fully implemented; keep a visible label and state wording where ambiguity remains.
- **Rule:** Space toggles the focused control, focus stays visible, and programmatic checked state matches system truth. Use a checkbox with batch submission when changes do not apply immediately.
- **Implementation:** For reversible remote changes, an optimistic flip may show pending and roll back with a retained error path. Serialize or version rapid changes so an older response cannot reverse the latest intent.
- **Exceptions:** Animation, knob proportions, color treatment, inline status, and optimistic behavior are not universal. High-risk, coupled, or permission changes may require explicit Save or review instead of a toggle.
- **Verify:** Test label activation, Tab and Space, screen-reader name/state, forced colors, reduced motion, rapid toggling, slow success, failure rollback, offline behavior, stale responses, and refresh consistency.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/toggle-anatomy), [HTML checkbox state](https://html.spec.whatwg.org/multipage/input.html#checkbox-state-(type=checkbox)), [APG switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/), and [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

### Form Validation Timing

- **Use when:** Choosing when client feedback should appear relative to entry, field exit, stage transition, and server submission.
- **Force:** `contextual` — Preserve entered values and place each message where its cause and recovery are understood. Client checks improve feedback; they never replace server validation.
- **Rule:** Submit or Continue is the safe baseline when earlier feedback would interrupt entry. Blur or live checking needs evidence that the value is complete enough and that feedback helps rather than scolds.
- **Implementation:** After an error, revalidate correction without noisy per-character announcements. Wait for IME composition to finish, cancel or version async checks, and focus a usable summary or first error according to the product convention.
- **Exceptions:** There is no universal debounce, blur rule, live cadence, success icon, or timer. Availability, uniqueness, password guidance, and dependent fields each need task-specific timing and latency evidence.
- **Verify:** Test empty and partial values, paste, autofill, IME, keyboard submit, multiple errors, slow and reordered responses, server-only rejection, correction, focus order, announcement frequency, and preserved data.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/form-validation-timing), [GOV.UK validation](https://design-system.service.gov.uk/patterns/validation/), [HTML constraint validation](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#the-constraint-validation-api), and [WCAG error suggestion](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html).

### File Upload UX

- **Use when:** A task accepts local files and users need evidence of selection, transfer state, server acceptance, or recovery.
- **Force:** `contextual` — Keep a labeled native file input as the operable path. Drag-and-drop may supplement it but cannot be the only selection method.
- **Rule:** Disclose accepted types, size or count constraints, and privacy consequences before selection. Validate on the server and distinguish selected, uploading, processed, rejected, canceled, and failed states.
- **Implementation:** Show per-file identity and honest measurable progress; support cancellation and retry without reselecting when the platform and upload protocol permit. Limit concurrency intentionally and isolate one file’s failure from the rest of the queue.
- **Exceptions:** Dropzone layout, thumbnails, chunking, parallelism, automatic start, and progress presentation depend on file type, network, backend, and risk; no universal upload layout applies.
- **Verify:** Test keyboard selection, drag alternative, focus after chooser close, wrong type, oversize, duplicate names, multiple files, cancellation, retry, offline interruption, reordered completion, server rejection, and safe preview rendering.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/file-upload-ux), [HTML file upload state](https://html.spec.whatwg.org/multipage/input.html#file-upload-state-(type=file)), [MDN file input](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file), and [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

### Password Field UX

- **Use when:** A user creates or enters a password rather than using a passkey, federated identity, or another product-approved authentication method.
- **Force:** `strong-default` — Use a labeled native password input with correct `autocomplete`; allow paste, password managers, and autofill, and disclose applicable requirements before failure.
- **Rule:** Do not equate composition checklists with strength. Prefer length and compromised-password defenses aligned with the security policy, while avoiding rules that block strong generated credentials.
- **Implementation:** Give the reveal control an accessible name that changes with state, preserve input focus and caret, and avoid logging or retaining the secret. Async checks need a non-leaking pending/error path and stale-response protection.
- **Exceptions:** Strength meters, generated-password offers, requirement checklists, confirmation fields, and reveal placement are contextual. Never impose a universal scoring formula, layout, or validation cadence.
- **Verify:** Test keyboard and screen-reader operation, reveal/hide without value loss, paste, autofill, multiple password managers, IME, mobile keyboards, server rejection, network failure, zoom, and accidental exposure in analytics or DOM attributes.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/password-field-ux), [HTML password state](https://html.spec.whatwg.org/multipage/input.html#password-state-(type=password)), [NIST SP 800-63B](https://pages.nist.gov/800-63-4/sp800-63b.html), and [WCAG input purpose](https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html).

### OTP Input

- **Use when:** A flow must collect a short-lived one-time code after the product has chosen that verification method and supplied a recovery path.
- **Force:** `contextual` — Model one semantic value even if it is visually segmented. Prefer one native input with a persistent label, `autocomplete="one-time-code"`, and an appropriate input mode.
- **Rule:** Treat paste and platform autofill as primary, preserve correction and selection, and never assume all codes are six numeric characters. Announce rejection without destroying a code the user may need to inspect.
- **Implementation:** Normalize only domain-permitted separators after composition and guard duplicate or stale verification requests. Auto-submit only when completion is unambiguous and causes no unexpected change of context; otherwise advise users beforehand or require an explicit Verify action. Resend availability and expiry must reflect server policy and accessible status.
- **Exceptions:** Box count, segmentation, clearing on error, resend timer, animation, and layout are contextual. Auto-submit is also contextual and cannot surprise with navigation or focus movement; there is no universal code length or countdown.
- **Verify:** Test full/partial paste into any visual segment, SMS autofill, password-manager behavior, Backspace and selection, IME, alphanumeric codes, keyboard focus, expiry, wrong code, resend failure, rapid submit, offline recovery, screen-reader reading order, and focus/route after the last character.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/otp-input), [HTML autocomplete](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#autofill), [MDN inputmode](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inputmode), [WCAG 3.2.2](https://www.w3.org/WAI/WCAG22/Understanding/on-input.html), and [WCAG status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).
