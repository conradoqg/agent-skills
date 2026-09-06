# Objective visual system

Use visual guidance only when presentation changes comprehension, operation,
consistency, accessibility, responsive behavior, or data integrity. Preserve the
product's visual direction. A different aesthetic is not automatically better.

## Hierarchy and proximity

A screen needs a discernible reading and action order. Establish it with the
smallest combination of semantic structure, content order, size, weight,
contrast, and space that makes the primary task clear.

- Group related content more tightly than unrelated content when distance is the
  grouping signal.
- Align controls and data that users compare or scan.
- Use whitespace, headings, lists, fieldsets, and regions before decorative boxes.
- Ensure primary and secondary actions remain distinguishable without making
  every element loud.
- Preserve DOM/reading/focus order; CSS rearrangement cannot create a conflicting
  operational sequence.

No universal 2x headline, 62/38 split, 12-column grid, weight number, or gap makes
hierarchy correct. Verify with real content, localization, zoom, and task order.

## Legibility and state differentiation

- Meet text/non-text contrast and color-independent meaning from the
  accessibility reference.
- Text must wrap/reflow without clipping controls or hiding outcomes.
- Truncation requires a reachable way to obtain material information.
- Current, selected, focused, pending, unavailable, invalid, and destructive
  states must be distinguishable when they exist; do not encode them through one
  low-contrast color shift.
- Icons need accessible names when they act alone and consistent meaning across
  the product. Optical/style choices are design-system decisions, not audit
  thresholds.

Muted text, pure white/black, saturation, serif/sans-serif, icon stroke, and dark
surface values are contextual. Measure contrast and readability; do not report
personal comfort as universal evidence.

## Design tokens and consistency

Use existing semantic tokens and component variants before raw one-off values.
Tokens are valuable when the same decision recurs or themes/platforms map one
role to different values. Prefer primitive -> semantic -> component layering
when the system has enough reuse to justify it.

Do not create a token for every literal or impose one spacing/color/type scale on
a small local component. A hardcoded value is a finding only when it causes drift,
breaks theming/accessibility, or violates the project's established contract.

Consistency serves predictability, not sameness. Same function should keep name,
state, and behavior. Intentional variants are valid when their context or
consequence differs.

## Responsive layout

- Content and controls reflow without loss, overlap, inaccessible offscreen
  actions, or accidental two-axis scrolling.
- Preserve task priority across breakpoints; do not hide primary navigation or
  actions merely to fit a desktop composition.
- Touch, pointer, keyboard, virtual keyboard, safe areas, sticky headers/footers,
  and long/localized content all affect the usable viewport.
- Reserve space or stabilize geometry for async content where layout shift would
  move a target or lose reading position.
- Tables, canvases, maps, and diagrams may need controlled two-dimensional
  operation or an alternate representation rather than forced stacking.

A 12→6→4→1 grid and fixed breakpoint set are recipes, not quality gates.

## Layering and depth

Elevation is valid when it communicates containment, modality, overlap, or
interaction state. Shadows, blur, border, scrim, and z-order are implementations,
not requirements.

- For a modal, background inertness and focus containment matter; a particular
  shadow does not.
- Diagnose stacking contexts and clipping before raising `z-index`.
- Use `isolation` when it intentionally contains component stacking, not as a
  blanket fix.
- Blur/backdrop effects can be expensive and reduce readability; test hardware
  and contrast.

Do not prescribe multiple shadows, colored glow, parallax, 3D tilt, or hover lift
as evidence of quality.

## Dark mode and themes

If dark mode exists, maintain semantic tokens, readable contrast, state
recognition, image/media treatment, native control color scheme, and parity of
function. Do not invert mechanically. Near-black, off-white, or desaturation
percentages are visual-direction choices unless measurement demonstrates a
problem.

Test both themes independently, including forced colors, charts, focus, errors,
hover, disabled/busy, screenshots/media, and system preference changes.

## Explicit non-rules

Never create findings from absence of:

- golden ratio;
- a particular border radius or nested-corner formula;
- gradient hue limits, grain, or brand glow;
- “perfect card” padding/shadow/hover recipes;
- depth layers, parallax, or 3D transforms;
- one isolated CTA designed to steer a choice;
- a “premium”, playful, corporate, or energetic look.

These can belong to an approved visual brief. Manipulative emphasis, hidden
costs, false hierarchy, or choice architecture that misleads can be findings
because of the consequence—not because a named psychological effect was absent.

## Verify

Static: token use, semantic structure, state variants, overflow rules, reserved
space. Browser: real content, narrow/wide viewport, zoom, text spacing,
localization/RTL, themes, focus, forced colors, layout shift. Product: primary
task and brand direction. If hierarchy comprehension was not tested with users,
describe it as an evidence-backed design inference, not proven usability.
