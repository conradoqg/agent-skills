# Accessibility contracts

Load for any material UI creation or review. Treat WCAG levels and exceptions
precisely; do not turn an enhanced target or APG example into an AA requirement.

Primary sources: [WCAG 2.2](https://www.w3.org/TR/WCAG22/),
[ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/), and
[MDN](https://developer.mozilla.org/). Last verified 2026-09-06.

## Perception and structure

| Rule | Strength | Contract and verification |
|---|---|---|
| Text contrast | required when WCAG AA scope applies | Normal text reaches 4.5:1 and large-scale text 3:1, subject to WCAG 1.4.3 exceptions. Measure actual foreground/background pairs, including states. |
| Non-text contrast | required when WCAG AA scope applies | Visual information needed to identify controls, states, and graphical objects reaches 3:1 under WCAG 1.4.11 exceptions. Do not require it for inactive or decorative pixels. |
| Color-independent meaning | required | Color is not the only signal (1.4.1). Add text, icon, shape, pattern, or programmatic state that carries the same meaning. |
| Relationships and order | required | Headings, labels, lists, table headers, landmarks, and meaningful sequence are programmatically available. Compare DOM/reading/focus order with visible operation. |
| Reflow and text resize | required in scope | At 320 CSS px equivalent and 200% text resize, preserve information and operation; two-dimensional content such as data tables may use the documented exception. |

An unusual font, color palette, radius, or layout is not a finding unless it
breaks a measurable contract or materially obscures task hierarchy.

## Names, roles, values, and status

- Prefer native controls. A clickable `div` must recreate keyboard, role, name,
  state, focus, and activation semantics and is rarely justified.
- The accessible name must include the visible label when WCAG 2.5.3 applies.
- Dynamic status—saving, saved, progress, results, and errors—must be
  programmatically determinable without stealing focus when WCAG 4.1.3 applies.
  Choose `role=status`, `aria-live`, native progress, or component semantics based
  on urgency; do not announce every keystroke.
- Placeholder text does not replace a persistent label. Instructions and error
  associations must remain available after entry begins.
- Use real headings and landmarks to expose structure; do not choose heading
  levels for visual size.

Static inspection can verify markup and associations. Browser/accessibility-tree
inspection must verify computed names, states, announcement behavior, and focus.

## Keyboard and focus

Required in WCAG scope:

- every non-path-dependent function is operable through a keyboard interface;
- focus order preserves meaning and operation;
- focus is visible and not entirely obscured by authored content;
- no keyboard trap exists;
- skip/repeated-block bypass exists where required.

Do not remove outlines without a visible replacement. WCAG AA requires visible
focus; the precise 2 CSS-pixel perimeter/3:1 Focus Appearance criterion is AAA,
not a universal AA shape prescription. A stronger local focus token is a valid
default.

Test forwards and backwards through the full task, not only individual controls.
Include open/close overlays, validation recovery, disabled/busy states, scroll
containers, sticky regions, and restoration after navigation.

## Pointer, touch, hover, and drag

- **Dragging:** WCAG 2.5.7 AA requires the same functionality through a single
  pointer without dragging unless dragging is essential or user-agent controlled.
  Keyboard support alone does not prove this. Provide buttons, a menu, click-to-
  select then click-to-place, or another single-pointer path.
- **Path/multipoint gestures:** provide a single-pointer, non-path alternative
  under 2.5.1 unless essential.
- **Pointer cancellation:** prefer completion on up-event and permit abort or
  undo as required by 2.5.2. A press-down destructive action needs a documented
  essential exception or reversal.
- **Target size:** 2.5.8 AA uses 24x24 CSS px or its spacing/equivalent/inline/
  user-agent/essential exceptions. 44x44 is the enhanced AAA target (2.5.5) and
  a useful touch default, not the universal AA minimum.
- **Hover/focus content:** under 1.4.13, custom additional content must be
  dismissible, hoverable when pointer-triggered, and persistent until its trigger
  ends, it is dismissed, or it is invalid. Primary actions cannot be hover-only.
- Query capabilities (`hover`, `pointer`) instead of inferring them from device
  names. Verify hybrid input and sticky-hover behavior.

## Dialogs and overlays

For a true modal, follow the
[APG modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/):

- content behind it is actually inert, not merely dimmed;
- the container has dialog semantics, a name, and modal state;
- focus moves inside to a context-appropriate target;
- Tab/Shift+Tab stay inside while open;
- Escape closes it;
- a visible close/cancel path exists;
- focus returns to the invoker or the next logical location.

Do not set `aria-modal=true` on a surface that does not behave modally. For an
irreversible final step, initial focus on the least destructive action can be the
safer contextual choice. Popovers, disclosures, drawers, and sheets are not
modals merely because they overlay content.

## Motion, flashing, and time

- WCAG 2.3.1 limits flashes to no more than three per second unless below the
  defined thresholds.
- Moving/blinking/scrolling content that auto-starts, lasts over five seconds,
  and runs alongside other content needs pause/stop/hide unless essential (2.2.2).
- WCAG 2.3.3 requires interaction-triggered motion to be disableable at AAA
  unless essential. Regardless of conformance target, honor
  [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion)
  as a strong default: remove, reduce, or replace non-essential panning, scaling,
  parallax, and large displacement.
- Preserve state feedback. An instant state change, opacity/color change, or
  small non-vestibular cue can replace spatial motion.
- Do not apply a global `0.01ms !important` reset blindly; it can break code that
  depends on animation events. Reduce at component/token level and test.

## Responsive and international checks

- Exercise narrow viewport, 200% text, 400% zoom/reflow where applicable,
  portrait/landscape, and content expansion.
- Do not assume forward means right. Reading direction, writing mode, hierarchy,
  and platform determine spatial semantics.
- Test long translations, RTL, locale-specific dates/numbers, and IME composition
  for components that manipulate input.
- Safe areas, browser zoom, virtual keyboards, and sticky controls can obscure
  focus or actions even when desktop layout looks correct.

## Evidence checklist

Static: native elements, labels, ARIA relationships, DOM order, media queries,
state branches, contrast tokens. Browser: computed tree, focus traversal,
keyboard activation, pointer alternatives, hover dismissal, reflow, zoom,
reduced motion, forced colors where relevant. Research: comprehension and
mental-model claims. Mark every unavailable layer `not verified`.
