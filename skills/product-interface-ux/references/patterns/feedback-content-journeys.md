# Feedback, content, and journeys

Use these entries only after applying the source precedence and admission test in the [evidence ledger](../evidence-ledger.md). For reachable async, empty, error, partial, offline, conflict, and recovery behavior, begin with [interaction and state](../interaction-and-state.md); the patterns below refine that contract rather than replace it.

### Doherty Threshold

- **Use when:** An interaction starts work whose latency may break the user’s sense that the interface received the input.
- **Force:** `contextual` — Preserve continuity with prompt acknowledgment while keeping pending, confirmed, failed, and rolled-back outcomes truthful.
- **Rule:** Treat 100–400 ms response bands as calibration hypotheses, not product laws; actual latency, stakes, frequency, and user expectation decide the feedback.
- **Implementation:** Keep the control and focus stable, expose local pending state, prevent duplicate work, and use optimism only for low-risk reversible changes with rollback. Never present server-dependent success early.
- **Exceptions:** Skip a loading artifact when measured responses make it flicker; payments, permissions, bookings, and destructive commitments wait for authoritative confirmation.
- **Verify:** Measure input-to-feedback and completion at median and tail latency; test slow network, CPU pressure, rapid repeat, failure, offline recovery, keyboard announcements, and reduced motion.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/doherty-threshold), [Nielsen Norman Group response-time limits](https://www.nngroup.com/articles/response-times-3-important-limits/), and [interaction and state](../interaction-and-state.md).

### Empty States

- **Use when:** A region can legitimately contain no items, including first use, a valid zero, no search matches, filtered-out data, or permission-limited content.
- **Force:** `strong-default` — Make absence distinguishable from loading and failure, disclose its scope, and offer a useful next step only when one exists.
- **Rule:** Model each reachable cause separately; “nothing yet,” “nothing matches,” and “could not load” must not share generic copy or recovery.
- **Implementation:** Name what is empty and why, retain active filters or query, show the relevant reset/create/request-access action, and preserve context across refresh or return when product semantics require it. Illustration and preview content are optional teaching aids.
- **Exceptions:** A compact table cell or intentionally blank optional region may need only a clear textual value; do not manufacture a CTA or decorative onboarding.
- **Verify:** Exercise first run, deletion of the last item, zero results, restrictive filters, denied access, offline, and failed fetch; check focus, status announcement, back/refresh, and small viewports.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/empty-states), [WCAG 2.2 status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html), and [interaction and state](../interaction-and-state.md).

### Error States

- **Use when:** User input, connectivity, authorization, concurrency, or system work can prevent a task from continuing or completing correctly.
- **Force:** `strong-default` — Explain what failed, what remains safe, the affected scope, and the shortest available recovery without discarding work.
- **Rule:** Place feedback where cause and remedy are understood: associated field, actionable summary, persistent regional status, or dedicated blocker; severity alone does not justify interruption.
- **Implementation:** Preserve values and focus, link field messages programmatically, prevent duplicate retry, distinguish offline/conflict/partial failure, and expose technical details separately when support needs them. Clear stale errors after recovery and announce changed status without stealing focus.
- **Exceptions:** Do not validate unfinished input prematurely; raw codes may supplement but never replace human guidance. A modal is reserved for work that truly cannot proceed behind it.
- **Verify:** Inject every reachable failure, partial response, timeout, permission loss, and conflict; test retry idempotency, keyboard navigation, live announcements, refresh/back, and retained drafts.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/error-states), [GOV.UK validation](https://design-system.service.gov.uk/patterns/validation/), and [WCAG 2.2 input assistance](https://www.w3.org/TR/WCAG22/#input-assistance).

### Loading States System

- **Use when:** Async work has observable pending time and the interface knows something useful about content shape, measurable completion, or reversibility.
- **Force:** `strong-default` — Communicate that work continues, at the narrowest accurate scope, without hiding usable content or implying a result before it exists.
- **Rule:** Choose feedback from available information: stable skeleton for known shape, honest progress for measurable work, local busy status for unknown work, and optimism for safely reversible actions. Duration cutoffs are calibration inputs.
- **Implementation:** Model idle, pending, partial, success, error, offline, and cancellation as applicable; keep prior content when safe, reveal completed portions progressively, preserve focus, block duplicates, and persist long-running job status across navigation when needed.
- **Exceptions:** Avoid indicator flashes for measured fast paths and full-page blockers for local work. Indeterminate progress must not masquerade as a percentage or fabricated time remaining.
- **Verify:** Test latency distributions, stalled and regressing progress, partial data, cancellation, retry, offline/reconnect, navigation return, screen-reader status, reduced motion, and layout shift.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/loading-states-system), [Nielsen Norman Group progress indicators](https://www.nngroup.com/articles/progress-indicators/), and [WCAG 2.2 status messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html).

### Notification System

- **Use when:** Product events must reach users across different urgency, scope, persistence, and action requirements rather than through one universal alert component.
- **Force:** `contextual` — Deliver each event at the least interruptive surface that still makes its consequence and response discoverable.
- **Rule:** Define a policy matrix for event owner, audience, urgency, lifetime, deduplication, acknowledgment, recovery, and history before choosing status, toast, banner, inbox/badge, or blocking dialog.
- **Implementation:** Keep local outcomes near their source; persist unresolved account or service conditions; record durable events in a retrievable center when users may need them later. Coalesce repeats, cap transient stacks, never stack modals, and synchronize read state across sessions when that promise exists.
- **Exceptions:** Badges cannot carry urgent meaning alone, and transient toasts cannot hold instructions or critical recovery. Do not escalate marketing or routine success into interruption.
- **Verify:** Simulate bursts, duplicates, cross-device read state, expiration, offline delivery, permission changes, keyboard and screen-reader use, action failure, and return after dismissal.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/notification-system), [WAI-ARIA APG alert pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alert/), and [WCAG 2.2 interruptions](https://www.w3.org/TR/WCAG22/#interruptions-minimum).

### Serial Position

- **Use when:** Ordering a bounded sequence such as navigation, onboarding, instructions, or a persuasive page, and recall materially affects the task.
- **Force:** `contextual` — Consider whether beginning and ending positions can clarify priority, while protecting logical, chronological, safety, and accessibility order.
- **Rule:** Treat primacy and recency as contextual heuristics, not guarantees or defect criteria; content, expertise, sequence length, repetition, and task intent can outweigh position.
- **Implementation:** Put orientation early, closure or next action late, group the middle into meaningful chunks, and keep DOM, visual, and reading order coherent. Do not duplicate a CTA merely to satisfy a mnemonic theory unless the journey supports both placements.
- **Exceptions:** Ordered procedures, ranked results, legal disclosures, data tables, and keyboard navigation follow domain truth and expected operation. User research outranks generic recall claims.
- **Verify:** Test findability, comprehension, completion, and recall with representative users and realistic content; compare order variants without changing emphasis, wording, or exposure simultaneously.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/serial-position), [Nielsen Norman Group serial-position effect](https://www.nngroup.com/articles/serial-position-effect/), and [evidence ledger](../evidence-ledger.md).

### Toast Notifications

- **Use when:** A recent action or low-urgency event needs brief acknowledgment while the current task can continue.
- **Force:** `contextual` — Keep feedback visible and operable long enough for its audience, without covering active controls, stealing focus, or becoming the only recovery path.
- **Rule:** Toasts are transient status, not durable storage or blocking error surfaces. Duration and placement are calibrated to content, input method, viewport, and product evidence—not fixed seconds.
- **Implementation:** Announce concise status through appropriate live semantics, provide a reachable close/action when needed, pause or extend timing for interaction, cap and deduplicate stacks, and move durable outcomes to inline status, banner, or history. Undo must state scope and remain valid for its displayed window.
- **Exceptions:** Critical failures, instructions, consent, and unresolved account conditions must persist elsewhere. Avoid focusable actions in rapidly expiring toasts unless timing and keyboard access are assured.
- **Verify:** Test long/localized copy, zoom, mobile keyboards, hover and keyboard focus, screen readers, burst queues, route changes, undo expiry, reduced motion, and hidden-tab timing.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/toast-notifications), [WCAG 2.2 timing adjustable](https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html), and [WAI-ARIA APG alert pattern](https://www.w3.org/WAI/ARIA/apg/patterns/alert/).

### Microcopy

- **Use when:** Labels, instructions, validation, status, empty states, confirmations, or recovery language affects whether users can predict and complete an action.
- **Force:** `strong-default` — Make the object, consequence, scope, current state, and available next step understandable at the moment they matter.
- **Rule:** Prefer specific user language and action-result labels over system jargon, generic verbs, blame, or unsupported promises. Copy cannot repair a missing state or recovery mechanism.
- **Implementation:** Keep persistent labels outside placeholders, name destructive scope, distinguish pending from confirmed outcomes, explain retained data after failure, and align terms across controls, notifications, help, and support. Localize meaning rather than word length, and leave space for expansion.
- **Exceptions:** Familiar compact commands may be shortest when context is unambiguous; legal, security, and regulated wording follows approved product requirements rather than conversational tone.
- **Verify:** Read every reachable state in sequence; test comprehension without surrounding explanation, keyboard and screen-reader names, localization, narrow widths, dynamic counts, pluralization, failure recovery, and support terminology.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/microcopy), [GOV.UK writing guidance](https://www.gov.uk/guidance/content-design/writing-for-gov-uk), and [WCAG 2.2 labels or instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html).

### Skeleton Loading

- **Use when:** A content region has a predictable final geometry and measured latency makes a stable structural preview more helpful than retaining prior content.
- **Force:** `contextual` — Preserve layout and orientation while truthfully indicating that content is pending, without making placeholder shapes part of the accessibility tree.
- **Rule:** Mirror likely final dimensions and hierarchy; skeletons communicate shape, not progress or completion time. Any 300 ms or two-second boundary is a calibration starting point only.
- **Implementation:** Mark the region busy, hide placeholders from assistive technology, replace pieces progressively without reordering, and transition to explicit error, empty, or partial states. Pair restrained motion with a static reduced-motion alternative.
- **Exceptions:** Prefer existing content during refresh, local busy feedback for actions, honest progress for measurable jobs, and no skeleton when it would flash or cannot predict layout.
- **Verify:** Compare placeholder and final geometry at breakpoints and zoom; measure layout shift, latency tails, CPU cost, screen-reader announcements, reduced motion, partial arrival, cancellation, error, and repeat navigation.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/skeleton-loading), [web.dev cumulative layout shift](https://web.dev/articles/cls), and [WCAG 2.2 animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

### Landing Page Skeleton

- **Use when:** Drafting or diagnosing a focused acquisition page with one audience, proposition, and primary conversion journey.
- **Force:** `contextual` — Establish a testable narrative from promise through credible evidence and decision, while keeping the visitor’s next step and consequences clear.
- **Rule:** Hero, proof, problem, solution, and CTA is a contextual writing recipe—not a product-interface law, fixed section count, or automatic review finding. Research, traffic intent, brand, and offer decide the order.
- **Implementation:** Answer what, for whom, and why; place substantiated proof near the claim it supports; connect pains to outcomes; and keep CTA wording and destination consistent. Carry loading, validation, privacy, success, abandonment, and return states through any signup or purchase handoff.
- **Exceptions:** Documentation, marketplaces, comparison pages, regulated disclosures, existing-user entry points, and multi-intent homepages may need different information architecture. Never invent urgency, testimonials, metrics, or guarantees.
- **Verify:** Test comprehension, trust, CTA expectation, keyboard order, reflow, performance, form recovery, back navigation, and funnel completion by representative traffic segment; isolate variables in experiments.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/landing-page-skeleton), [evidence ledger recipe policy](../evidence-ledger.md), and [WCAG 2.2 consistent identification](https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html).
