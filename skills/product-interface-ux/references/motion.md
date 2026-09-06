# Purposeful motion

Motion is optional until it solves a named problem. This reference decides both
whether to animate and how to implement the minimum useful motion.

Sources include [WCAG 2.2](https://www.w3.org/TR/WCAG22/),
[MDN prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion),
and calibrated examples from Atlassian, Carbon, Fluent, Material, and NN/g.
Values below are starting ranges, not cross-product laws. Last checked 2026-09-06.

## Gate: should it move?

Require a concrete answer to each applicable question:

1. **Purpose:** does it provide input feedback, explain state change, preserve
   spatial context/continuity, reveal relationship, or prevent a jarring change?
2. **Frequency:** will it occur hundreds, tens, a few times, or once? Repetition
   reduces the value and exposes delay.
3. **Control:** can the user act immediately, reverse/retrigger it, and interrupt
   it where the interaction demands?
4. **Accessibility:** what removes, reduces, or replaces displacement, scaling,
   parallax, flashing, or continuous movement?
5. **Performance:** does it preserve input response, stable layout, and smooth
   rendering on representative hardware?
6. **Consistency:** does the existing design system already define a motion
   token/pattern?
7. **Verification:** what repeated action, trace, or reduced-motion test proves it
   helps rather than delays?

Reject the proposal if its only purpose is “premium”, “alive”, “delight”, or
“three layers”. Expressive motion can be an approved visual choice, but its
absence is not a UX defect.

## Frequency calibration

- Very frequent keyboard/navigation actions: instant or nearly instant by
  default; a transition must not become repeated waiting.
- Repeated panel/state changes: brief functional feedback or continuity only.
- Occasional completion/milestone: richer feedback may be appropriate if it
  does not block the next task.
- First-use/marketing/illustrative moments: may be expressive under an explicit
  brief, with controls and accessibility safeguards.

Use a rapid repetition test (for example, 20–50 activations appropriate to the
component). If motion feels like a queue, shorten, simplify, or remove it. This
is a calibration method, not a universal daily-use threshold.

## Timing and easing defaults

For frequent product UI, begin inside these broad ranges and tune with content,
distance, input, hardware, and the existing system:

- direct press/focus feedback: roughly 50–150ms;
- small state/component transition: roughly 100–250ms;
- larger overlay/view transition: roughly 150–400ms;
- expressive or explanatory sequence: may exceed 400ms only when deliberately
  rare, non-blocking, and reduced-motion safe.

Entrances often decelerate and exits often complete faster, but symmetry can be
correct for reversible toggles/shared movement. Linear easing is appropriate for
constant-rate progress, spinners, marquees, or timeline-synchronized motion; it
is not a blanket defect. Springs fit interruptible/velocity-aware motion, but
overshoot is optional and can be wrong for precise or serious interactions.

No universal curve, 70% exit ratio, 50ms stagger, 400ms ceiling, or distance
multiplier is a quality gate. Use design-system tokens when available.

## Spatial logic and interruptibility

Animate from/to a real source when that relationship helps orientation. Reverse
entry on dismissal when the conceptual path is the same. Use crossfade or instant
change when origin is ambiguous; never invent geography.

Interactive transitions should retarget from their current visual state. CSS
transitions and physical animations often fit; fixed keyframes fit deliberate
one-shot sequences. Do not require exit animation, shared-element morph, or
overshoot when immediate removal is clearer.

Direction depends on hierarchy, writing mode, RTL, platform, and gesture—not a
hardcoded right/left rule.

## Properties and performance

Prefer `transform` and `opacity` for routine movement because they are commonly
compositor-friendly, but measure rather than ban every other property.

- Layout properties can trigger reflow; use them when real geometry must change
  and the measured cost is acceptable.
- Paint/filter/backdrop effects can be expensive; test target devices.
- Avoid `transition: all`; list intended properties to prevent accidental motion.
- Avoid speculative `will-change`; promote only during a known expensive motion
  and release it when possible.
- Prevent layout shift that moves targets or reading position.
- CSS/WAAPI can reduce main-thread dependence for suitable properties, but no
  API guarantees smoothness without profiling.

Intrinsic size transitions are no longer impossible: `interpolate-size` can opt
into length-to-intrinsic interpolation, but MDN marks it limited/experimental as
of 2026-09-06. Use target-browser support and a stable fallback.

## Reduced motion and continuous motion

Under `prefers-reduced-motion: reduce`:

- remove large panning, scaling, parallax, simulated depth, and unnecessary
  travel;
- replace spatial transitions with instant change, opacity/color, or another
  non-vestibular cue where feedback remains necessary;
- pause/stop/hide qualifying auto-start continuous content;
- preserve progress, state, and completion information;
- avoid a global duration override that breaks event-driven logic.

WCAG 2.3.1 flashing limits are required at A. Interaction-triggered motion being
disableable is WCAG 2.3.3 AAA; label the level correctly while still treating
system reduced-motion preference as a strong default.

## Conditional recipes

- **Overlay:** small position/scale/opacity can preserve source relationship;
  instant is valid for high frequency. Focus/inertness must not wait for motion.
- **List reorder:** track direct manipulation; animate other items to valid slots;
  provide non-drag path and reduced travel.
- **Loading:** spinner/progress may use constant motion; skeleton shimmer is
  optional and replaceable. Never use motion to fake progress.
- **Icon/state swap:** animate only if it clarifies continuity. Instant swap plus
  accessible state is valid; `mode=wait` can add harmful delay.
- **Error:** do not default to shake. Text, association, focus, and correction
  matter; motion can feel punitive or trigger vestibular symptoms.
- **Success:** do not require particles, bounce, green, or celebration. Confirm
  the actual outcome and next step first.
- **Scroll-linked:** use only when progress/spatial relation depends on scroll;
  preserve reading, reduced motion, performance, and non-support fallback.
- **Hover:** never reveal required action only by hover; subtle feedback is
  optional and capability-gated.

## Review checks

Static: purpose comment/design token is supporting evidence, not proof; inspect
properties, reduced variants, event/state model, transition scope, and fallback.
Browser: repeat, interrupt, reverse, keyboard versus pointer, reduced motion,
slow hardware/network, layout shift, input latency, and frame trace when needed.
Report “not verified” rather than calling code smooth or accessible from reading.
