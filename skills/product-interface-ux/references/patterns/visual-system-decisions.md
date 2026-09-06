# Visual system decisions

Use these entries only after applying the source precedence and admission test in [the evidence ledger](../evidence-ledger.md). Pair them with [visual-system](../visual-system.md) for presentation contracts, [accessibility](../accessibility.md) for normative perception and operation requirements, and [forms-navigation-and-data](../forms-navigation-and-data.md) when controls, navigation, tables, or charts are involved. Design Motion HQ is an editorial discovery corpus, not normative authority.

### Charts That Lie

- **Use when:** A chart supports comparison, trend reading, distribution, or a consequential decision.
- **Force:** `required` — The encoding can exaggerate, conceal, or misstate values when scale, baseline, units, missing data, or uncertainty are unclear.
- **Rule:** Choose the chart and scale from the analytical question and data semantics; preserve proportional meaning and disclose context needed to interpret the result.
- **Implementation:** Label axes, units, time range, source, filters, missing values, and uncertainty. Use a zero baseline for length encodings such as ordinary bars, and provide a structured text or tabular alternative.
- **Exceptions:** Non-length positional encodings may use a nonzero domain when it remains honest and conspicuously labeled; specialized audiences may need domain conventions.
- **Verify:** Compare plotted marks with source data, test extrema and missing values, inspect responsive rendering, and confirm the text alternative conveys values, relationships, and trends.
- **Sources:** [Corpus](https://designmotionhq.com/patterns/charts-that-lie), [local data policy](../forms-navigation-and-data.md), [W3C complex images](https://www.w3.org/WAI/tutorials/images/complex/), [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

### Design System Kit

- **Use when:** Repeated interface decisions or shared components must remain consistent across screens, teams, themes, or platforms.
- **Force:** `contextual` — Uncoordinated values and variants create drift in meaning, states, behavior, and maintenance rather than merely visual difference.
- **Rule:** Standardize recurring semantic decisions and component contracts, while preserving intentional variants whose task or consequence differs.
- **Implementation:** Inventory existing patterns first; define names, roles, content guidance, supported states, responsive behavior, accessibility semantics, and ownership. Reuse current components and tokens before adding another variant.
- **Exceptions:** A small local surface does not need a comprehensive system, and one-off values are acceptable when they do not create drift or block theming.
- **Verify:** Exercise every documented state with real content, keyboard, zoom, narrow viewports, themes, and failure conditions; check that implementations and documentation agree.
- **Sources:** [Corpus](https://designmotionhq.com/patterns/design-system-kit), [local visual policy](../visual-system.md), [local accessibility contracts](../accessibility.md), [W3C Design Tokens Community Group](https://www.w3.org/community/design-tokens/).

### Grid System

- **Use when:** A page needs repeatable alignment, comparison, reflow, or coordination among regions with changing content.
- **Force:** `contextual` — Arbitrary placement can obscure relationships, while rigid layout can clip content, reorder operation, or create inaccessible overflow.
- **Rule:** Use the simplest layout structure that preserves task order, alignment, readable line flow, and access to controls across supported viewports.
- **Implementation:** Prefer normal flow, Flexbox, or Grid according to the relationship being expressed. Keep DOM and focus order meaningful, use logical properties, and let content determine wrapping or track changes.
- **Exceptions:** Tables, maps, canvases, and diagrams may require controlled two-dimensional scrolling or an alternate representation instead of forced stacking.
- **Verify:** Test narrow and wide viewports, zoom, text resize, localization, RTL, virtual keyboards, sticky regions, and long content for overlap, loss, or accidental two-axis scrolling.
- **Sources:** [Corpus](https://designmotionhq.com/patterns/grid-system), [local responsive policy](../visual-system.md), [WCAG Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html), [MDN Grid accessibility](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Grid_layout_and_accessibility).

### Proximity Rule

- **Use when:** Users must infer which labels, controls, values, or actions belong together.
- **Force:** `strong-default` — Equal or ambiguous separation can flatten groups, associate a label with the wrong control, or increase scanning effort.
- **Rule:** Make within-group relationships clearer than between-group relationships, and expose the same relationships semantically rather than relying on distance alone.
- **Implementation:** Start with headings, lists, fieldsets, legends, regions, and source order. Then use spacing, alignment, or containment consistently to reinforce those programmatic groups.
- **Exceptions:** Dense comparison tasks may require tighter presentation; remote relationships may need explicit labels, connectors, or shared regions because proximity cannot communicate them reliably.
- **Verify:** Remove decorative boundaries and confirm grouping remains understandable, inspect the accessibility tree, and test reflow, zoom, localization, and responsive rearrangement for accidental reassociation.
- **Sources:** [Corpus](https://designmotionhq.com/patterns/proximity-rule), [local hierarchy policy](../visual-system.md), [WCAG Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html), [WAI form grouping](https://www.w3.org/WAI/tutorials/forms/grouping/).

### Shadow Elevation

- **Use when:** Overlap, containment, modality, or an interaction state needs a depth cue that complements stronger structural signals.
- **Force:** `contextual` — Decorative elevation can imply false priority, while shadow-only boundaries disappear in forced colors, low contrast, or constrained rendering.
- **Rule:** Treat shadow as an optional implementation cue, never as the sole evidence of hierarchy, interactivity, selection, or modal behavior.
- **Implementation:** Reuse existing elevation roles when present and pair depth with semantics, placement, borders, scrims, labels, or state attributes appropriate to the contract. Keep geometry stable during state changes.
- **Exceptions:** Flat presentation is valid when containment and state remain clear; platform rendering, forced colors, or performance constraints may require another cue.
- **Verify:** Test all overlapping states, forced colors, both themes, zoom, clipping, scroll containers, and representative hardware; confirm focus, inertness, and reading order do not depend on shadow.
- **Sources:** [Corpus](https://designmotionhq.com/patterns/shadow-elevation), [local layering policy](../visual-system.md), [WCAG Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html), [MDN box-shadow](https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow).

### Visual Hierarchy

- **Use when:** A screen contains competing information or actions and users need a discernible reading and decision order.
- **Force:** `strong-default` — Equal emphasis or conflicting visual and semantic order can hide the primary task, misrepresent priority, or make state changes hard to locate.
- **Rule:** Establish hierarchy from truthful content importance and task sequence, using the minimum combination of semantic structure, order, contrast, weight, size, and space.
- **Implementation:** Put meaningful headings and landmarks in source order, distinguish primary from secondary actions, and reserve emphasis for information that actually changes the decision. Keep status and error content near its context.
- **Exceptions:** Exploration and dense monitoring may support several peer entry points; product evidence can justify a non-linear reading path.
- **Verify:** Check heading and focus order, keyboard traversal, zoom, reflow, localization, themes, and each reachable state. Treat comprehension without user research as an inference, not proof.
- **Sources:** [Corpus](https://designmotionhq.com/patterns/visual-hierarchy), [local visual policy](../visual-system.md), [WCAG Meaningful Sequence](https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence.html), [WAI page structure](https://www.w3.org/WAI/tutorials/page-structure/).

### Z-Index Mastery

- **Use when:** Content overlaps incorrectly, is clipped, appears behind another branch, or must participate in an overlay contract.
- **Force:** `contextual` — `z-index` values rank within stacking contexts, so escalation cannot free a descendant from an ancestor context and may conceal the actual cause.
- **Rule:** Diagnose the stacking-context hierarchy, clipping ancestors, and top-layer participation before changing layer values; rank only intentional peers.
- **Implementation:** Inspect context creators including positioned elements, flex or grid items, opacity, transforms, containment, container queries, and isolation. Prefer native dialog or popover top-layer behavior when its semantics fit; isolate components only deliberately.
- **Exceptions:** A local component scale is useful for known peer layers, but it cannot order independent contexts or override the browser top layer.
- **Verify:** Reproduce every overlay combination, inspect computed styles and context ancestors, and test scrolling, sticky content, transforms, clipping, focus containment, and dismissal.
- **Sources:** [Corpus](https://designmotionhq.com/patterns/z-index-mastery), [local layering policy](../visual-system.md), [MDN stacking context](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Stacking_context), [MDN top layer](https://developer.mozilla.org/en-US/docs/Glossary/Top_layer).

### Icon Design Rules

- **Use when:** Icons repeat across controls, navigation, statuses, or data and must retain consistent meaning.
- **Force:** `contextual` — Inconsistent metaphors, unlabeled icon controls, or color-only variants can make actions and states ambiguous even when artwork is crisp.
- **Rule:** Optimize for semantic clarity, accessible naming, and set-wide consistency; optical style and drawing geometry remain design-system choices rather than usability thresholds.
- **Implementation:** Use familiar local symbols, stable view boxes, predictable alignment, and reusable assets. Give functional icons an accessible name through the control, hide redundant decorative SVG from assistive technology, and pair state icons with text or programmatic state.
- **Exceptions:** Decorative icons need no announced name; specialist symbols may be valid when users are trained or a reachable label explains them.
- **Verify:** Test computed names, keyboard and pointer states, zoom, high contrast, themes, localization, and replacement by text; confirm the same symbol never changes meaning across contexts.
- **Sources:** [Corpus](https://designmotionhq.com/patterns/icon-design-rules), [local legibility policy](../visual-system.md), [WAI functional images](https://www.w3.org/WAI/tutorials/images/functional/), [WCAG Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html).

### Design Tokens

- **Use when:** The same visual or state decision recurs, must map across themes or platforms, or needs controlled system-wide change.
- **Force:** `strong-default` — Raw repeated values drift, while value-named aliases become misleading when meaning changes; excessive tokens add indirection without reuse.
- **Rule:** Name reusable decisions by stable role and preserve a traceable source of truth; tokenize semantic contracts, not every literal.
- **Implementation:** Reuse the repository convention. Where scale justifies it, map primitives to semantic roles and component uses, document scope and states, preserve typed aliases, and detect unresolved or circular references during generation.
- **Exceptions:** A one-off local value can remain local when it has no theming, consistency, or accessibility consequence. Do not adopt an interchange draft as authoritative without tool support evidence.
- **Verify:** Change each source role and inspect all consumers, themes, states, generated targets, deprecations, fallbacks, and contrast-sensitive pairs; compare design and shipped output.
- **Sources:** [Corpus](https://designmotionhq.com/patterns/design-tokens), [local token policy](../visual-system.md), [DTCG published format](https://www.designtokens.org/TR/2025.10/format/), [CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*).

### Color Accessibility

- **Use when:** Color affects text, controls, graphical objects, focus, selection, validation, status, or data encoding.
- **Force:** `required` — Low contrast can erase content or boundaries, and color-only meaning fails when colors are not perceived, distinguished, or preserved by the platform.
- **Rule:** Under WCAG AA scope, meet applicable text and non-text contrast criteria with their documented exceptions, and provide an equivalent non-color signal for meaning.
- **Implementation:** Measure actual foreground and background pairs in every reachable state. Add text, shape, pattern, icon, or programmatic state that carries the same information; keep labels and relationships semantic.
- **Exceptions:** Inactive, decorative, logo, incidental, and user-agent-controlled content has criterion-specific exceptions; do not apply text thresholds to every pixel or prescribe a palette.
- **Verify:** Test computed colors, gradients and imagery, themes, hover, focus, invalid, unavailable, selected, charts, forced colors, and high-contrast settings with automated checks plus visual inspection.
- **Sources:** [Corpus](https://designmotionhq.com/patterns/color-accessibility), [local accessibility policy](../accessibility.md), [WCAG Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html), [WCAG Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

### Gestalt Laws

- **Use when:** Visual grouping, continuity, figure-ground separation, or similarity affects how relationships and regions are inferred.
- **Force:** `contextual` — Pre-attentive grouping can contradict semantics, merge unrelated controls, split related content, or make an overlay compete with its background.
- **Rule:** Use perceptual cues to reinforce truthful structure, never to substitute for headings, labels, source order, state, or accessible relationships.
- **Implementation:** Combine only the cues needed for the relationship: proximity or common region for belonging, alignment for scanning, similarity for shared role, and scrim or containment for overlap. Keep repeated cues semantically consistent.
- **Exceptions:** Perceptual laws are heuristics, not automatic quality gates; domain conventions, dense data, or tested product patterns may require different grouping.
- **Verify:** Compare visible groups with DOM and accessibility-tree relationships, remove color or decoration, and test zoom, reflow, localization, themes, forced colors, and overlay states for contradictory grouping.
- **Sources:** [Corpus](https://designmotionhq.com/patterns/gestalt-laws), [local grouping policy](../visual-system.md), [WCAG Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html), [WAI page structure](https://www.w3.org/WAI/tutorials/page-structure/).

### Dark Mode

- **Use when:** The product offers a dark theme, follows system preference, or must support multiple color schemes with functional parity.
- **Force:** `contextual` — Mechanical inversion or incomplete overrides can break contrast, state recognition, charts, media, focus, and browser-provided controls while reporting the wrong preference.
- **Rule:** Theme semantic roles independently and preserve content, behavior, hierarchy, and state meaning across schemes; no particular dark palette or luminance direction is mandatory.
- **Implementation:** Map theme tokens by role, declare supported schemes with `color-scheme`, use `prefers-color-scheme` for system preference, and reconcile any explicit user choice. Set early metadata or equivalent initialization to avoid an incorrect-theme flash; theme native controls and embedded media intentionally.
- **Exceptions:** A product may support one scheme only, and embedded or branded content may retain its own scheme when contrast and semantics remain valid.
- **Verify:** Test initial load, live system changes, stored overrides, forms, scrollbars, focus, statuses, charts, images, forced colors, zoom, and every async state in each theme.
- **Sources:** [Corpus](https://designmotionhq.com/patterns/dark-mode), [local theme policy](../visual-system.md), [MDN color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme), [MDN prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme), [WCAG 2.2](https://www.w3.org/TR/WCAG22/).
