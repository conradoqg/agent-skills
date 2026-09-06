# Interaction, state, and overlay patterns

Use these entries after the evidence policy in [`../evidence-ledger.md`](../evidence-ledger.md), the state contracts in [`../interaction-and-state.md`](../interaction-and-state.md), and the applicable requirements in [`../accessibility.md`](../accessibility.md). Catalog timings, dimensions, and counts are calibration examples unless a cited standard defines them; verify them against product evidence, input modes, latency, content, and risk.

### Disabled Buttons

- **Use when:** A control appears unavailable, a submit path has unmet prerequisites, or an action is pending and duplicate activation must be prevented.
- **Force:** `contextual`.
- **Rule:** Do not use an inert control to hide the reason or recovery. Distinguish unavailable, invalid, unauthorized, and busy states so the interface does not turn a correctable blocker into a silent dead end.
- **Implementation:** Prefer an operable submit that validates and focuses the first invalid field. If unavailability is genuine, associate reachable explanatory text. During async work, keep control identity and focus stable, expose busy status, and guard duplicate requests rather than presenting loading as generic disability.
- **Exceptions:** Native disabled controls are appropriate when no action is currently possible and the reason is already evident nearby. Read-only data may need a different semantic control, not a disabled input.
- **Verify:** Traverse by keyboard and screen reader; inspect computed name/state; trigger validation, pending, failure, retry, and success; confirm focus and entered values survive.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/disabled-buttons); [`../interaction-and-state.md`](../interaction-and-state.md); [HTML disabled](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#attr-fe-disabled); [WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

### Hover Trap

- **Use when:** Hover reveals controls, changes geometry, or supplies information that matters to completing a task.
- **Force:** `strong-default`.
- **Rule:** Hover may preview or accelerate, but it cannot be the sole route to an action or essential content. Otherwise touch, keyboard, stylus, zoom, and hybrid-device users encounter missing or sticky functionality.
- **Implementation:** Keep primary actions visible or expose an equivalent tap/focus path. Gate enhancement with capability queries such as `hover` and `pointer`, preserve layout while actions appear, and size the interactive target independently from its icon. Make revealed content dismissible, hoverable, and persistent where WCAG 1.4.13 applies.
- **Exceptions:** Purely decorative feedback may remain pointer-only. Dense expert tools may progressively reveal secondary actions when the same commands remain discoverable through selection, menus, or shortcuts.
- **Verify:** Test mouse, keyboard, touch emulation, coarse pointer, and a hybrid sequence; cross viewport edges; zoom and reflow; ensure the first tap activates the intended path rather than trapping a synthetic hover.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/hover-trap); [`../accessibility.md`](../accessibility.md); [WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html); [MDN interaction media features](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover).

### Behind the Button

- **Use when:** A visible action causes validation, authorization, pricing, inventory, or multiple dependent writes behind the interface.
- **Force:** `required`.
- **Rule:** Treat the client as an untrusted convenience layer and the server as the authority. A polished success state cannot precede established truth when forged values, partial writes, or duplicate requests could create financial, security, or data-integrity harm.
- **Implementation:** Validate early on the client for recovery, then repeat authoritative validation and authorization server-side. Derive sensitive values from trusted records, make related writes atomic where the storage model supports it, apply idempotency or concurrency guards, and repaint from the canonical response, including server-generated identifiers.
- **Exceptions:** A reversible low-stakes action may update optimistically, but its pending state, rollback, conflict, and retry behavior still follow the state contract. Atomicity boundaries may span compensating workflows rather than one database transaction.
- **Verify:** Tamper with requests; replay activation; force one dependent write to fail; test stale versions, timeout-after-commit, and retry; confirm no false success or half-created outcome remains.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/behind-the-button); [`../interaction-and-state.md`](../interaction-and-state.md); [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html); [WCAG 3.3.4](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html).

### Inline Editing

- **Use when:** Users make frequent, low-friction changes best understood in the surrounding list, table, title, or canvas context.
- **Force:** `contextual`.
- **Rule:** Entering edit mode must be discoverable without hover, preserve spatial context, and define commit, cancel, blur, pending, and failure outcomes. Ambiguous blur or a failed save that destroys the draft converts speed into data loss.
- **Implementation:** Keep display and editor geometry aligned; provide a visible edit affordance or selected-state action; focus the editor with its accessible label. Use a consistent Enter/Escape policy, decide multiline behavior explicitly, prevent duplicate commits, and retain the draft when reconciliation fails. Announce saved or error status without stealing focus.
- **Exceptions:** High-risk, long-form, permission-sensitive, or heavily validated changes may need an explicit edit surface and Save/Cancel review. IME composition must not be mistaken for Enter-to-commit.
- **Verify:** Exercise keyboard-only entry, pointer entry, blur, Escape, composition, slow save, rejection, offline, conflict, and rapid re-entry; confirm layout does not jump and the original value can be recovered.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/inline-editing); [`../interaction-and-state.md`](../interaction-and-state.md); [`../accessibility.md`](../accessibility.md); [WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

### Live Cursors

- **Use when:** Multiple people share a canvas or document and awareness of presence, location, selection, or viewport materially improves coordination.
- **Force:** `contextual`.
- **Rule:** Presence is advisory, while committed content and conflict policy are authoritative. Cursors must not imply that an object is protected when the system can still accept conflicting edits, nor make following another user impossible to stop.
- **Implementation:** Derive stable identity cues, send bounded position updates, interpolate rendering between network samples, and expire stale presence. Model selection separately from edit ownership. Choose locking, merge, version checks, or conflict review from the data model; expose follow mode as an explicit, cancellable state and avoid transmitting more presence data than needed.
- **Exceptions:** Text collaboration often benefits from merge algorithms rather than exclusive locks. Low-bandwidth, privacy-sensitive, or large-room contexts may show coarse presence without pointers.
- **Verify:** Simulate jitter, packet loss, disconnect, reconnect, duplicate colors, stale sessions, simultaneous edits, reduced motion, zoom, and follow cancellation; confirm content integrity without the cursor layer.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/live-cursors); [`../interaction-and-state.md`](../interaction-and-state.md); [WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html); [WCAG 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

### Destructive Actions

- **Use when:** An action removes, overwrites, revokes, sends, or otherwise commits data with meaningful blast radius.
- **Force:** `strong-default`.
- **Rule:** Match friction to reversibility and consequence. Action-specific naming, disclosed scope, and recovery prevent mistakes; color, placement, a generic confirmation, or a brief hold gesture alone does not establish informed intent.
- **Implementation:** For local reversible changes, commit with reachable undo. For recoverable deletion, use trash or a grace period when semantics permit. For irreversible, legal, financial, security, or bulk effects, present the exact target and consequence, allow review/correction, separate cancel from commit, and require fresh authorization when risk demands it.
- **Exceptions:** Repeated expert workflows may justify fewer interruptions when scope remains visible and recovery is reliable. Type-to-confirm is useful only when it verifies target recognition; it is not a universal safeguard.
- **Verify:** Test wrong-target selection, bulk scope, rapid repeat, keyboard focus, screen-reader wording, cancellation, undo expiry, restore, authorization lapse, partial backend failure, and post-commit status.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/destructive-actions); [`../interaction-and-state.md`](../interaction-and-state.md); [WCAG 3.3.4](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html); [APG alert dialog](https://www.w3.org/WAI/ARIA/apg/patterns/alertdialog/).

### Drag and Drop

- **Use when:** Spatial movement or reordering directly represents the domain and reduces effort compared with selecting source and destination separately.
- **Force:** `strong-default`.
- **Rule:** A drag must expose pickup, valid destinations, preview, commit, cancellation, and recovery, while preserving an equivalent single-pointer path that does not require dragging when WCAG 2.5.7 applies.
- **Implementation:** Start after tested slop so scrolling is not stolen, use pointer capture for custom drags, keep source and placeholder relationships legible, and distinguish insertion from container targets. Snap only to discrete valid positions; commit on release, reject invalid drops clearly, and provide buttons, menus, or select-then-place plus keyboard operation.
- **Exceptions:** Freeform drawing or other essential path-based input can qualify for standards exceptions. Decorative lift, tilt, shadow, and timing are optional calibration, not proof of usability.
- **Verify:** Test mouse, touch, stylus, keyboard, and the non-drag pointer route; cancel outside bounds; cross scroll containers; use zoom, RTL, reduced motion, invalid targets, network failure, and undo.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/drag-and-drop); [`../interaction-and-state.md`](../interaction-and-state.md); [WCAG 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html); [WCAG 2.5.2](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html).

### Star Rating

- **Use when:** A bounded ordinal rating is familiar to the audience and users need to enter, inspect, or compare that value quickly.
- **Force:** `contextual`.
- **Rule:** Keep preview, pending input, committed personal rating, and aggregate score distinct. The visual fill must not round or otherwise overstate the represented value, and stars cannot be the only programmatic expression of it.
- **Implementation:** Build input from native radios or an equivalent composite with a name, current value, keyboard operation, and visible focus. Preview pointer choice without committing it; restore the saved value on exit. Label endpoints and each option, announce save outcome, and render fractional aggregate fill from the actual value with a textual value.
- **Exceptions:** Binary sentiment, numeric scales, or labeled choices may be clearer across cultures or for fine distinctions. Animation, half-star input, and staggered fills require product evidence and reduced-motion handling.
- **Verify:** Test arrows or radio navigation, touch, hover exit, focus exit, fractional rendering, RTL, zoom, forced colors, save failure, rollback, and the accessible name/value in the tree.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/star-rating); [`../interaction-and-state.md`](../interaction-and-state.md); [APG radio group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/); [WCAG 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html).

### Tooltip Design

- **Use when:** A compact control or unfamiliar term needs brief supplemental explanation that is not required to identify or operate it.
- **Force:** `contextual`.
- **Rule:** A tooltip cannot carry the only label, instruction, validation message, or primary action. Custom hover/focus content must remain reachable and satisfy dismissal, hoverability, and persistence requirements where WCAG 1.4.13 applies.
- **Implementation:** Trigger from keyboard focus as well as hover, associate the description programmatically, delay pointer appearance only enough to reduce accidental activation, and close predictably with Escape or ended trigger state. Position against viewport boundaries and zoom; keep the pointer corridor open when users must move onto the content. Move interactive or extended material to a popover or help surface.
- **Exceptions:** A native `title` is not a reliable substitute for a designed, keyboard-tested explanation. Concise always-visible labels are preferable when space and comprehension allow.
- **Verify:** Use keyboard, mouse, touch, screen reader, 200% text, 400% zoom, viewport edges, pointer transition, Escape, focus movement, and reduced motion; confirm no clipped or orphaned tooltip remains.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/tooltip-design); [`../interaction-and-state.md`](../interaction-and-state.md); [WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html); [APG tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/).

### Swipe Actions

- **Use when:** A mobile list has frequent item-level secondary actions and platform convention makes horizontal reveal understandable.
- **Force:** `contextual`.
- **Rule:** Swipe is an accelerator, never the sole path. Reveal must coexist with a discoverable single-pointer alternative, and a destructive gesture must not commit before users can cancel or recover.
- **Implementation:** Provide the same commands through a visible button, item detail, or menu. Separate vertical-scroll intent from horizontal reveal with tested hysteresis; expose the action before commit, preserve consistent direction in the relevant writing mode, limit choices to a comprehensible set, and offer undo or confirmation based on blast radius. Announce resulting state independently of motion and color.
- **Exceptions:** Platform-owned controls may supply gesture behavior, but the product still owns discoverability and consequences. Full-swipe commit suits only low-risk, reliably reversible actions.
- **Verify:** Test slow and fast swipes, diagonal scroll, short lists, RTL, screen reader, switch or keyboard path, interrupted touch, accidental full swipe, rapid repeats, undo expiry, and offline failure.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/swipe-actions); [`../interaction-and-state.md`](../interaction-and-state.md); [WCAG 2.5.1](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html); [WCAG 2.5.2](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html).

### Undo UX

- **Use when:** A completed action can be reversed accurately within a meaningful window without introducing hidden side effects.
- **Force:** `strong-default`.
- **Rule:** Prefer recovery over routine interruption for reversible, low-risk work, but do not present undo unless restoration is truthful, complete, and available long enough for the affected user to act.
- **Implementation:** Record the inverse operation or retain recoverable state, expose what changed and a reachable Undo action, announce both commit and restoration, and define expiry visibly when it matters. If timed Undo is the only recovery path, allow the limit to be turned off, adjusted, or extended under WCAG 2.2.1, or keep an equivalent untimed recovery route; otherwise document the applicable exception. For sequences, specify whether undo reverses the latest local command, a server mutation, or a grouped transaction; protect against concurrent changes and retries.
- **Exceptions:** Irreversible, legal, financial, security-sensitive, externally observed, or high-blast actions need checking, review, or confirmation before commit; an undo toast cannot retract every consequence. Essential or externally controlled time limits require the corresponding WCAG exception rather than an invented extension.
- **Verify:** Exercise keyboard and screen reader access, multiple actions, timeout off/adjust/extend or the untimed route, navigation, refresh, another-device edits, offline state, partial restore, retry, and redo where offered; confirm restored server truth.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/undo-ux); [`../interaction-and-state.md`](../interaction-and-state.md); [WCAG 3.3.4](https://www.w3.org/WAI/WCAG22/Understanding/error-prevention-legal-financial-data.html); [WCAG 2.2.1](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html).

### Bottom Sheets

- **Use when:** Mobile reach, preserved page context, or progressive vertical depth makes an edge-anchored surface better than navigation, a popover, or a centered dialog.
- **Force:** `contextual`.
- **Rule:** Decide whether the sheet is modal from interaction behavior, not appearance. If background work must stop, apply the full dialog focus and inertness contract; otherwise do not claim modal semantics or unexpectedly trap focus.
- **Implementation:** Anchor to the bottom safe area, provide a visible title and close path, keep primary actions above the virtual keyboard, and define collapsed, intermediate, expanded, dragging, and dismissed states. Snap points and drag dismissal are optional; every gesture needs a non-drag route. Lock background scrolling only for the intended modal behavior and preserve the invoker for focus restoration.
- **Exceptions:** Long independent tasks may deserve a full page. Small trigger-related choices fit a popover; persistent navigation fits a drawer.
- **Verify:** Test focus entry/return, Escape, swipe and button dismissal, background interaction, screen reader, keyboard, rotation, safe areas, virtual keyboard, content overflow, reduced motion, and 400% zoom.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/bottom-sheets); [`../interaction-and-state.md`](../interaction-and-state.md); [`../accessibility.md`](../accessibility.md); [APG modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

### Optimistic UI

- **Use when:** An action is likely to succeed, low-stakes, reversible or reconcilable, and immediate local response materially improves repeated work.
- **Force:** `contextual`.
- **Rule:** Optimism changes presentation latency, not truth. Never imply confirmed payment, booking, permission, deletion, or server-generated identity before authority responds; pending, rollback, conflict, and retry must be designed before the fast path.
- **Implementation:** Capture the previous state and mutation identity, apply the predicted result, prevent accidental duplicate work, then reconcile with the canonical response. On rejection, restore or merge without discarding user input, explain what failed, and offer retry. Version concurrent entities and make retries idempotent so late responses cannot overwrite newer intent.
- **Exceptions:** Some reversible actions still need visible pending status when others observe them or failure is costly. Pessimistic confirmation is appropriate when success is uncertain or rollback cannot undo external effects.
- **Verify:** Inject latency, rejection, timeout after commit, out-of-order responses, double activation, offline reconnect, stale versions, navigation, and refresh; compare client state with server truth after every branch.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/optimistic-ui); [`../interaction-and-state.md`](../interaction-and-state.md); [WCAG 4.1.3](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html); [OWASP Transaction Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Transaction_Authorization_Cheat_Sheet.html).

### Color Picker UX

- **Use when:** Users choose colors as reusable product data and need precision, comparison, transparency, palettes, or accessibility feedback beyond a native input.
- **Force:** `contextual`.
- **Rule:** Preserve one canonical color value while presenting formats as views, and never claim a pair passes accessibility without measuring the actual rendered foreground, background, opacity, and applicable WCAG scope.
- **Implementation:** Keep graphical controls synchronized with editable numeric fields, expose names, values, ranges, keyboard steps, and visible focus, and retain saved choices only when useful. Preview alpha against representative light and dark surfaces. If generating tokens, separate hue selection from semantic assignment and gamut-map conversions explicitly; live contrast feedback should identify the tested pair and threshold.
- **Exceptions:** Native `<input type="color">` is the lower-cost choice when browser capability meets the task. OKLCH, generated scales, recent swatches, and checkerboards are optional recipes, not universal quality gates.
- **Verify:** Test keyboard and screen reader operation, paste and invalid formats, round-trip conversion, gamut edges, alpha, zoom, forced colors, saved-state persistence, and contrast with a trusted calculator.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/color-picker-ux); [`../accessibility.md`](../accessibility.md); [HTML color state](https://html.spec.whatwg.org/multipage/input.html#color-state-(type=color)); [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

### Accordion Disclosure

- **Use when:** Supporting sections can be independently revealed without hiding information users must compare or complete simultaneously.
- **Force:** `contextual`.
- **Rule:** Choose single-open versus multi-open from task relationships, not component naming. The trigger must expose expanded state and control its panel; collapsed content must not remain unexpectedly focusable or discoverable as visible content.
- **Implementation:** Prefer native `details`/`summary` where its behavior and styling suffice. A custom disclosure uses a native button whose `aria-expanded` state matches the controlled panel identified by `aria-controls`. Keep trigger text stable, synchronize icon and panel state, and preserve the activated header's position when expansion changes layout. Intrinsic-size animation is support-dependent; use progressive enhancement and a no-motion fallback rather than asserting `height:auto` can never animate.
- **Exceptions:** Sequential mutually exclusive steps may permit one open panel. FAQs and reference material often benefit from several open panels. Critical instructions should remain visible instead of being disclosed.
- **Verify:** Test Enter, Space, Tab order, screen-reader state, deep links, find-in-page expectations, long content, bottom-of-viewport expansion, zoom, reduced motion, and browser support for any size interpolation.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/accordion-disclosure); [`../interaction-and-state.md`](../interaction-and-state.md); [APG disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/); [HTML details](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-details-element).

### Modal Hierarchy

- **Use when:** Selecting among modal dialog, alert dialog, bottom sheet, drawer, or popover for content layered above the current view.
- **Force:** `strong-default`.
- **Rule:** Choose by interruption and relationship: modal only when background interaction must stop; popover for lightweight trigger context; drawer for adjacent navigation or inspection; sheet for mobile reach and context. Visual scrims do not define semantics.
- **Implementation:** For a true modal, make the background inert, provide dialog semantics and a name, place focus at a context-appropriate target, contain Tab navigation, support Escape and visible cancellation, then restore focus. Keep contextual overlays anchored, in-view, and predictably dismissible. Consolidate stacked blockers.
- **Exceptions:** A critical alert may require acknowledgment, while routine confirmations usually do not. Some sheets and drawers are intentionally modal; apply the contract based on behavior. Essential nested workflows require explicit focus, escape, and return testing.
- **Verify:** Inspect the accessibility tree and inert background; traverse forward/backward; test Escape, outside click policy, focus restoration, nested triggers, zoom, reflow, virtual keyboard, viewport edges, and interrupted transitions.
- **Sources:** [Design Motion](https://designmotionhq.com/patterns/modal-hierarchy); [`../interaction-and-state.md`](../interaction-and-state.md); [`../accessibility.md`](../accessibility.md); [APG modal dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).
