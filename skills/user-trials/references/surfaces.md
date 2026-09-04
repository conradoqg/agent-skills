# Surface-specific trial evidence

Read only the section for each surface in the current trial.

## Browser

- Prefer a clean or isolated browser context per persona. Use a real profile
  only when authenticated state is essential and the user accepts the exposure.
- Capture the accessible page structure before acting; use screenshots when
  layout, visual hierarchy, density, or aesthetics are part of the finding.
- Use the latest snapshot identifiers and record the label or visible cue that
  led to each action.
- Keep viewport and product version consistent across comparable personas.
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
