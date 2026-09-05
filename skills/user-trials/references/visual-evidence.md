# Visual evidence for interface trials

Read before visual trials so the report can show the actual state behind each
material finding. Screenshots are evaluator evidence, not product deliverables.

## Capture while the state exists

- Give findings and evidence stable IDs, such as F01 and E01. Save each capture
  with its persona, mission/step, page or route (redacted if needed), viewport,
  and the action and state it documents. Share saved paths with the coordinator.
- Prefer a capture tool's file-saving option and pass paths between delegates.
  Embed saved images locally when building the report; do not transcribe image
  bytes or large base64 strings through model messages. If file saving is
  unavailable, use a supported local persistence method or disclose the gap.
- Check the capture tool's writable roots before relying on the report directory.
  For example, Chrome DevTools MCP defaults to the OS temporary directory when
  its client does not negotiate workspace roots. In that configuration, save to
  a unique directory under the documented temporary root, then copy the capture
  into the authorized report directory using filesystem tools. Preserve path
  restrictions; a genuine authorization denial is not a reason to disable them.
- Capture material confusion about copy, business meaning, navigation and
  feedback as well as appearance. Use a context view plus a crop only when the
  full view makes the relevant detail unreadable. One image can support several
  findings; avoid a screenshot for every click or duplicate persona image.
- For a clean interface mission, a representative completion-state capture with
  a caption can show what worked; do not add problem markers or defects to fill
  the report.
- Capture before and after an action when the transition explains the issue.
  For a disappearing toast or pending operation, save the state immediately and
  pair it with the action log and bounded follow-up observation. A single still
  does not prove the absence of a download or a response over time.
- Preserve the original capture separately from report annotations. If a state
  must be revisited, label the capture as a replay and disclose relevant changes;
  never imply it was the original persona's moment of discovery.

## Annotate without altering the evidence

Use deterministic overlays (for example HTML/CSS or SVG over the saved image)
or an available annotation tool. Do not use generative image editing, redraw the
UI, modify the live page for a screenshot, or insert a suggested fix into an
evidence image. A proposed design, when requested, must be a separate mockup.

Use numbered markers, outlines or arrows tied to nearby commentary. Place them
at the actual controls or information supporting the finding, without covering
the evidence. Preserve the image's aspect ratio; overlays must stay aligned
when the report resizes. Do not depend on color alone. Check the original and
the annotated view for fidelity and legibility.

Each figure needs a plain-language caption explaining:

- The persona's goal and the action leading to this state.
- What each numbered marker points to and what is actually visible.
- Why that observation matters to the task, with interpretation distinguished
  from visible fact. Put improvement hypotheses separately from the evidence.

For example, a caption could contrast a visible total at marker 1 with the
filtered rows at marker 2, then explain the persona's unresolved question about
which records to take into a meeting. The image shows the mismatch; the trial
record supports the resulting uncertainty and recovery attempt.

Redact sensitive content in shared copies and mark that redaction. Keep originals
in the authorized local evidence location; do not link or embed an unredacted
original in a shared report. Never hide information that changes the conclusion.

## Deliver evidence the reader can use

Respect the requested format. Otherwise, for visual trials, deliver a local HTML
report with embedded screenshots and annotation overlays, plus a concise final
message linking it. Keep it portable and free of remote dependencies. Markdown
with rendered annotated images is an acceptable fallback; a folder of unexplained
image paths or an unannotated screenshot appendix is not the finished report.

Place figures beside their findings, with captions and text alternatives. Group
shared evidence once and cross-reference it from persona results. Include a
small evidence index mapping IDs to figures and steps; keep raw traces secondary.

Open the actual delivered report and inspect its rendered figures: images load,
text is readable, markers align, links resolve and sensitive content is absent.
If rendering cannot be verified, explicitly state that limitation. For missing
screenshots or unavailable annotation tools, deliver the observed textual
evidence with the affected IDs and explain the gap; do not fabricate an image
or abandon the rest of the report. CLI/API and discovery-only requests do not
require screenshots.
