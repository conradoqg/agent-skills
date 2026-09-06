# Motion patterns

Apply these patterns through the admission and strength rules in the [evidence ledger](../evidence-ledger.md), then use [purposeful motion](../motion.md) for calibration and [accessibility contracts](../accessibility.md) for normative checks. The catalog examples are prompts for investigation, not automatic quality gates.

### Animation Timing

- **Use when:** motion must acknowledge input, explain a state change, preserve spatial continuity, or direct attention to a rare event; do not animate merely to make routine UI feel lively.
- **Force:** `contextual` — rises with purpose and falls with frequency: immediate feedback is a strong default, while elaborate sequencing is contextual and should never postpone operation, focus, or truthful state.
- **Rule:** start with system tokens and calibrate duration to distance, content, hardware, and repetition. Roughly 50–150ms for direct feedback, 100–250ms for small changes, and 150–400ms for larger transitions are test ranges, not limits; exits may be faster, but symmetry can suit reversible movement.
- **Implementation:** animate named properties, usually `transform` and `opacity`; retarget from the current visual state when interrupted, avoid `transition: all`, and keep semantic updates independent of completion events.
- **Exceptions:** frequent keyboard navigation may be instant. Under reduced motion, replace displacement or scaling with immediate state, opacity, or color feedback; never introduce flashing above WCAG thresholds.
- **Verify:** repeat rapidly, reverse mid-flight, compare keyboard, touch, pen, and mouse, inspect input latency and frame traces on representative hardware, and confirm the next action remains available.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/animation-timing), [local motion guidance](../motion.md), [local accessibility guidance](../accessibility.md), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), and [Carbon motion](https://carbondesignsystem.com/elements/motion/overview/).

### Easing Curves

- **Use when:** a changing value needs velocity to communicate arrival, departure, continuity, direct manipulation, or constant progress; choose the curve only after naming that purpose.
- **Force:** `contextual` — curve consistency is a strong system default, not a universal aesthetic rule. The more often an interaction repeats, the less overshoot or settling it should impose on the user.
- **Rule:** calibrate curves with duration and distance. Deceleration commonly clarifies entry, acceleration can support departure, and symmetric easing can suit reversible travel. Linear is correct for genuinely constant-rate motion such as progress, rotation, marquees, or scroll-linked timelines.
- **Implementation:** expose a small semantic token set, use CSS timing functions for simple transitions, and use interruptible springs only when velocity-aware retargeting adds value; measure expensive animated properties rather than assuming a curve makes them smooth.
- **Exceptions:** precise, serious, or high-frequency controls may need no easing or motion. Reduced-motion variants should remove overshoot, parallax, and large travel while retaining state feedback; easing cannot make flashing safe.
- **Verify:** interrupt and reverse at multiple points, compare slow and rapid activation across keyboard, touch, pen, and pointer, test reduced motion, and profile frames instead of judging only a polished recording.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/easing-curves), [local motion guidance](../motion.md), [local accessibility guidance](../accessibility.md), [MDN easing functions](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function), and [Atlassian motion](https://atlassian.design/foundations/motion/).

### Card Hover Anatomy

- **Use when:** a card is already actionable and hover feedback helps a fine-pointer user identify its boundary, clickability, or secondary affordances; static cards need no lift treatment.
- **Force:** `contextual` — hover styling is contextual. It may reinforce hierarchy, but it must not reveal the only route to any action, instruction, state, or information, and repeated grid scanning should not become visual noise.
- **Rule:** preserve the card footprint and reading position. Calibrate lift, shadow, border, image scale, duration, and stagger against density and brand; values such as an 8px lift or 200ms transition are prototypes, never acceptance thresholds.
- **Implementation:** gate enhancement with `@media (hover: hover) and (pointer: fine)`, animate explicit compositor-friendly properties where practical, clip internal image scaling, and keep controls present or equivalently reachable by focus and tap.
- **Exceptions:** coarse pointers, sticky-hover browsers, reduced motion, dense data views, or low-powered devices may receive color, border, underline, or no animation. Do not use flashing or continuous pulsing to claim attention.
- **Verify:** tab, tap, long-press, pen, mouse, and hybrid-device paths; interrupt by leaving quickly; zoom and reflow; confirm actions stay visible, targets do not move, and rendering remains stable across many cards.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/card-hover-anatomy), [local motion guidance](../motion.md), [local accessibility guidance](../accessibility.md), [WCAG 1.4.13](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html), and [MDN interaction media features](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/hover).

### Scroll-Driven Animations

- **Use when:** animation progress has a real relationship to reading progress, viewport entry, sticky transformation, or spatial depth; ordinary content revelation and decoration do not by themselves justify scroll coupling.
- **Force:** `contextual` — native scroll timelines are a contextual implementation option, not a requirement. The pattern must preserve reading and navigation when motion is disabled, unsupported, interrupted by fast scrolling, or driven by keyboard rather than touch.
- **Rule:** calibrate ranges, thresholds, travel, and properties to content and viewport behavior. Prefer a stable static state first; no particular entry percentage, parallax ratio, opacity, or duration is a quality gate.
- **Implementation:** prefer CSS `scroll()` or `view()` timelines when target support is verified, layer them over semantic document flow, provide a no-support fallback, and avoid synchronous scroll listeners, repeated geometry reads, layout shifts, and speculative `will-change`.
- **Exceptions:** under reduced motion, remove parallax, large panning, zoom, and unnecessary scrubbing while preserving progress information. Continuous or flashing content must satisfy pause and flash requirements; essential motion needs explicit justification.
- **Verify:** test wheel, trackpad, touch, keyboard, scrollbar dragging, zoom, nested scrollers, fast reversal, reduced motion, and fallback browsers; profile main-thread work, frames, and layout stability on representative devices.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/scroll-driven-animations), [local motion guidance](../motion.md), [local accessibility guidance](../accessibility.md), [MDN scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll-driven_animations), and [WCAG 2.2](https://www.w3.org/TR/WCAG22/).
