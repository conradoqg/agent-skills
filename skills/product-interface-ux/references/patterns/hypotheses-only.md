# Quarantined hypotheses and visual directions

Opt in to this reference only when an explicit visual brief requests one of these directions or explicit research frames it as a hypothesis. Otherwise leave it unloaded. Apply the admission and evidence rules in [the ledger](../evidence-ledger.md), preserve the constraints in [the visual system](../visual-system.md), and adjudicate consequences through [the review protocol](../review-protocol.md). These entries are prompts for exploration, never a checklist.

### Peak-End Rule

- **Use when:** Explicit research asks whether the most intense or final moment changes how a completed journey is remembered, and the product has a consented outcome to study.
- **Force:** `contextual` — product evidence must identify the journey, candidate moment, audience, and outcome before this lens influences design.
- **Rule:** Not an automatic quality gate; absence never generates a finding. A supported finding must concern an observed consequence or manipulative use, not missing delight.
- **Implementation:** State a falsifiable hypothesis, such as “a clearer completion summary improves one-week recall of next steps,” while preserving truthful status, choice, pricing, and recovery; never fabricate rewards, urgency, or emotional pressure.
- **Exceptions:** Safety, loss, rejection, and regulated outcomes should end plainly; accurate warnings and unresolved work must not be softened to manufacture a positive memory.
- **Verify:** Pre-register the measure, compare an ethical control, test delayed recall and task understanding, and inspect complaints or regret for adverse effects.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/peak-end-rule), [evidence policy](../evidence-ledger.md), and [review policy](../review-protocol.md).

### Zeigarnik Effect

- **Use when:** Explicit research asks whether truthful, user-valued unfinished work helps people resume a voluntary multi-session task without losing orientation.
- **Force:** `contextual` — use only when completion state already exists, return is beneficial to the user, and abandoning the task remains easy and consequence-free.
- **Rule:** Not an automatic quality gate; absence never generates a finding. Completion, not perpetual engagement, remains the product goal.
- **Implementation:** Form a testable hypothesis such as “showing two accurate remaining setup steps increases successful resumption within seven days”; display real progress and a dismissible resume path, never fake incompleteness, withhold completion, nag, or create anxiety.
- **Exceptions:** Do not apply to compulsive-use risks, marketing chores, mandatory compliance, completed work, or situations where reminders could expose sensitive activity.
- **Verify:** Compare against a neutral saved-state control; measure resumed completion, dismissals, opt-outs, and distress or complaint signals, then remove the prompt if benefit is not user-centered.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/zeigarnik-effect), [evidence policy](../evidence-ledger.md), and [review policy](../review-protocol.md).

### Golden Ratio

- **Use when:** An explicit visual brief asks to explore proportional rhythm in layout or spacing and the existing design system leaves those choices open.
- **Force:** `contextual` — treat 1.618 or a 62/38 split as one sketching constraint, never as universal evidence of polish.
- **Rule:** Not an automatic quality gate; absence never generates a finding. Only objective consequences involving contrast, legibility, hierarchy, or performance can support one.
- **Implementation:** Prototype the ratio through existing tokens where possible, round values to the platform grid, and let content, localization, responsive reflow, and established hierarchy override the sequence.
- **Exceptions:** Preserve current tokens, dense operational layouts, native controls, and content-driven dimensions when the ratio would add drift, clipping, weak hierarchy, or needless variants.
- **Verify:** Compare representative content at narrow and wide viewports, zoom, long translations, and text-spacing overrides; confirm reading order and usable line lengths rather than judging “balance” by taste.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/golden-ratio), [visual-system policy](../visual-system.md), and [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

### Gradient Design

- **Use when:** An explicit visual brief calls for gradients as atmosphere or emphasis and a flat token is not already the required product convention.
- **Force:** `contextual` — direction, hue travel, lightness, grain, and placement depend on brand, content, theme, display quality, and rendering budget.
- **Rule:** Not an automatic quality gate; absence never generates a finding. Only objective consequences involving contrast, legibility, hierarchy, or performance can support one.
- **Implementation:** Keep text on a measured stable surface or test every point behind it; implement with existing color tokens and the simplest CSS that preserves intended hierarchy across themes.
- **Exceptions:** Prefer a solid fill when forced colors, low-end hardware, printing, compression, animation cost, or unpredictable media makes the gradient obscure content or waste resources.
- **Verify:** Measure text and non-text contrast at gradient extremes and transitions; inspect banding, themes, forced colors, reduced motion if animated, paint cost, and representative low-quality displays.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/gradient-design), [visual-system policy](../visual-system.md), and [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

### Border Radius

- **Use when:** An explicit visual brief requests a corner language within an established radius scale.
- **Force:** `contextual` — radius communicates brand and containment only within the product’s geometry; component size, padding, clipping, and platform conventions decide the value.
- **Rule:** Not an automatic quality gate; absence never generates a finding. Only objective consequences involving contrast, legibility, hierarchy, or performance can support one.
- **Implementation:** Reuse existing radius tokens; if the brief requests concentric corners, prototype inner geometry from actual padding but adjust optically when borders, asymmetric spacing, or content make the formula misleading.
- **Exceptions:** Native controls, compact elements, irregular shapes, edge-to-edge regions, and legacy components may need square or independent corners to preserve operation and consistency.
- **Verify:** Inspect clipping, focus indicators, touch targets, nested backgrounds, zoom, responsive sizes, and themes; report only a measurable loss of state visibility, content legibility, hierarchy, or rendering efficiency.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/border-radius), [visual-system policy](../visual-system.md), and [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

### Von Restorff Effect

- **Use when:** Explicit research asks whether differentiating one truthful, user-relevant option improves discovery or recall in a set.
- **Force:** `contextual` — the emphasized item must serve the user’s task, and the product must justify why it deserves attention.
- **Rule:** Not an automatic quality gate; absence never generates a finding. A supported finding must show an observed consequence or deceptive emphasis, not uniform styling alone.
- **Implementation:** Write a falsifiable hypothesis such as “distinct treatment improves discovery of the safest default without reducing comparison accuracy”; keep prices, tradeoffs, and alternatives equally legible, and never use false popularity, visual obstruction, preselection, or pressure.
- **Exceptions:** Avoid isolation when options require neutral comparison, informed consent, or accessibility would suffer.
- **Verify:** Test discovery plus comprehension and choice quality, not clicks alone; check keyboard and screen-reader order, color independence, regret, reversals, and whether users can explain alternatives.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/von-restorff), [evidence policy](../evidence-ledger.md), [review policy](../review-protocol.md), and [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

### Perfect Card

- **Use when:** An explicit visual brief requests a dimensional or interactive card treatment.
- **Force:** `contextual` — padding, type contrast, border, shadow, radius, and hover behavior must follow content density, brand direction, input modes, and existing tokens.
- **Rule:** Not an automatic quality gate; absence never generates a finding. Only objective consequences involving contrast, legibility, hierarchy, or performance can support one.
- **Implementation:** Start from the current card component, change the fewest tokens needed to establish the requested hierarchy, and add hover treatment only when the whole card is genuinely interactive with equivalent focus and touch cues.
- **Exceptions:** Dense data, static content, nested cards, low-power surfaces, and products with flat visual language should not inherit large padding, layered shadows, scaling, or reduced-opacity body text.
- **Verify:** Check text contrast, reading order, focus visibility, target geometry, layout shift, narrow screens, themes, long content, pointer and keyboard parity, and paint/compositing cost.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/perfect-card), [visual-system policy](../visual-system.md), and [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

### Depth Layers

- **Use when:** An explicit visual brief requests depth to clarify containment, overlap, modality, or interaction state.
- **Force:** `contextual` — choose borders, shadows, scrims, blur, motion, or z-order according to the actual layering model, hardware budget, input mode, and brand.
- **Rule:** Not an automatic quality gate; absence never generates a finding. Only objective consequences involving contrast, legibility, hierarchy, or performance can support one.
- **Implementation:** Establish a small semantic elevation order first, then use the cheapest visual cue that communicates it; diagnose stacking contexts before changing z-index and avoid parallax or 3D transforms unless explicitly briefed.
- **Exceptions:** Flat systems, reduced-motion preferences, dense workspaces, low-power devices, and content requiring stable spatial relationships may be clearer and faster without dimensional effects.
- **Verify:** Test overlap, clipping, focus containment, contrast, scroll and hover behavior, reduced motion, zoom, themes, GPU/paint cost, and low-end hardware; distinguish hierarchy failures from aesthetic preference.
- **Sources:** [Design Motion HQ corpus](https://designmotionhq.com/patterns/depth-layers), [visual-system policy](../visual-system.md), [review policy](../review-protocol.md), and [MDN](https://developer.mozilla.org/).
