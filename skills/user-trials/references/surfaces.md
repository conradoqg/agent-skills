# Surface-specific trial evidence

Read only the section for each surface in the current trial.

## Browser

- Prefer a clean or isolated browser context per persona. Use a real profile
  only when authenticated state is essential and the user accepts the exposure.
- Capture the accessible page structure before acting and inspect the rendered
  screen when judging appearance. A DOM or accessibility snapshot cannot prove
  visual hierarchy, clipping, contrast, density, or aesthetics.
- Save screenshots for material interface findings, including confusing copy,
  business information, navigation, errors and feedback, not only visual defects.
  Follow `visual-evidence.md` for capture, annotation and delivery.
- Use the latest snapshot identifiers and record the label or visible cue that
  led to each action.
- Keep viewport and product version consistent across comparable personas.
- If the mission involves mobile, keyboard use or another interaction context,
  exercise it explicitly or mark it untested. Do not infer accessibility
  conformance or mobile usability from a desktop screenshot.
- For delayed actions, record the feedback, observation window and any available
  completion/download evidence. Distinguish "not available during this trial"
  from "will never complete"; transport latency is not measured human effort.
- Do not infer a click, navigation, loading state, or error from source code.

## CLI

- Use a temporary configuration/data directory unless the user explicitly asks
  to test their real environment.
- Record the exact command, exit code, and relevant stdout/stderr. Redact tokens,
  credentials, private URLs, and user data.
- Test help and recovery behavior as the persona would encounter them; do not
  read implementation code to bypass discovery during the trial.
- Never run destructive flags or commands against real resources without
  explicit authorization.

## API

- Prefer a sandbox, mock, or read-only endpoint. Treat write methods as mutations
  even when the payload appears harmless.
- Record method, route, status, relevant response shape, and documentation cue.
  Never include authorization values or sensitive response bodies in the report.
- Evaluate the experience of the actual API consumer: discoverability,
  consistency, error recovery, contract clarity, and task completion.
- Distinguish transport/tool failure from a response produced by the API.
