# A report the reader can use

Read before synthesis. Write in the user's language and respect their format.
Organize around decisions and consequences, not the order of persona sessions.
The first layer must stand on its own; depth belongs one step away. A short clean
mission can be one paragraph with a completion figure or command excerpt.

## First layer: outcome and what deserves attention

Start with what was tested, what actually happened, and whether the intended
result was verified. Identify the affected role and the most consequential
finding, or say that no material friction was observed. State these are synthetic
trials through real tool interactions, not interviews or representative research.

Make the opening paragraph itself a usable decision brief: **tested mission and
verified result; affected role and main consequence; priority improvement; decisive
limit**. Do not postpone the last two to a later list or closing disclaimer.
For example, in an unrelated document workflow: "In this synthetic trial, the
editor submitted the document, but publication remained pending. The reviewer
could not use its public link; prioritize a status that distinguishes submission
from publication. We verified the pending state, not eventual public availability."
For a clean mission, state its supported result and boundary without manufacturing
a recommendation. Use natural prose rather than repeating these field labels.

A label such as "inconsistent result" is not the consequence: say which decision
the affected role could make incorrectly or which work they cannot finish.
When also writing a detailed artifact, reuse its decision brief in the final
message instead of shortening away the operational effect or decisive limit.

For the few findings that change a decision, use concrete consequence titles:
"The register counts rejected items as delivered" rather than "Feedback issue".
Keep these together and visible:

- Who is affected, at which decision, and the consequence for their mission.
- What the evidence establishes, with a direct evidence link; confidence and any
  uncertainty that would change the reader's interpretation or priority.
- The proposed improvement and why it merits attention. Explain the concrete
  change, expected benefit, and how to check whether it helps.

Include observed strengths worth preserving and material scope limits here.
If delivering a short chat message that links a longer report, that message is
also a first layer: include the affected role, main consequence, concrete priority
and furthest verified outcome. Do not let an accurate appendix silently qualify
an overconfident opening. A compact sentence can state both result and boundary.
Do not hide a partial result, missing artifact, contaminated trial, or unknown
business rule in an appendix when it changes the main conclusion. Impact and
confidence are different: a potentially serious consequence may have weak proof.
Prioritize by mission consequence, recovery cost and reach of the tested workflow;
persona counts are not prevalence. Do not invent impact numbers or a roadmap.

Group repetitions that share the same evidence and consequence. Keep differences
that change interpretation, remedy, permissions or outcome. Do not repeat the
entire finding under every persona or turn the summary into a transcript.

Keep each selected improvement and its check together, including in the final
message. A compact shape is: **problem and consequence | concrete change and
expected benefit | observable check**. "Improve feedback" and "test again" leave
the decision unspecified: name the state to reproduce and what the user should
be able to distinguish or achieve. Do not add a secondary recommendation merely
to fill the table; unresolved rules can remain explicit questions. Before sending,
check every recommendation, not just the highest-priority one, for a missing test.

## One level deeper: the evidence behind each conclusion

Give stable finding and evidence IDs. Each material finding's detail contains:

1. **Context and expectation:** role, mission, starting state, relevant knowledge
   and the cue behind the expectation recorded before acting.
2. **Observed sequence:** consequential actions and results, including recovery.
   Link exact screenshots, command/exit/output or HTTP method/route/status/body.
   An excerpt must contain enough context to support the claim, not just an ID.
3. **Consequence:** what could be completed, what the persona believed happened,
   and what the evidence verifies. Distinguish observation, inference, preference
   and tool failure. Retain justified disagreement and inconclusive outcomes.
4. **Improvement hypothesis:** the problem, concrete change or direction, expected
   benefit and an observable check. Include relevant tradeoffs or uncertainty,
   and what result would show the proposal did not help. Do not diagnose code
   or prescribe architecture without supporting evidence.

For example: "Label accepted requests as pending and link to item results so the
coordinator can distinguish submission from delivery. Repeat a partially rejected
batch: the reader should identify the rejected items before using the manifest.
Retain a concise success message for fully accepted batches." This is a testable
direction, not proof that a wording change fixes the underlying result.

For visual findings, place the annotated figure and caption together here using
`visual-evidence.md`; preserve the original. Evidence IDs link directly to the
figure or excerpt, not a folder or the top of a long document. For a clean path,
show its completion evidence without problem markers or mandatory suggestions.

## Supporting scope and trail

Put the detailed charter, actor/mission coverage, assumptions, isolation protocol,
persona debriefs and extended traces in a clearly labeled appendix. Each persona
needs an outcome and situated assessment, but shared evidence is linked once.
An evidence index maps IDs to the corresponding mission step and figure/excerpt.
Important limitations already appear in the first layer; expand their basis here.

Severity describes the mission consequence, independently of confidence:

- **Blocker:** the mission cannot be completed safely.
- **High:** a wrong result or unsafe workaround compromises the mission.
- **Medium:** material confusion, delay or recovery work.
- **Low:** localized friction or preference with little mission impact.

Useful behavior and completed clean missions have no defect severity. Absence
of observed friction does not prove all workflows or all users are covered.

## Choose disclosure to fit the content

| Content | Default | When to choose something else |
|---|---|---|
| Essential conclusion, impact, decisive limit | Visible plain text | Never move it behind a control to shorten the page. |
| Short definition | Inline at first use | A tooltip may repeat it, but must not be the only touch or keyboard access. |
| Brief complementary context | Inline sentence or labeled disclosure | Use a popover only if it improves proximity; test activation, dismissal and focus return. No hover-only content or nested overlays. |
| Steps, annotated figures, evidence excerpts | One native details/summary per finding in HTML | Static Markdown uses a directly linked detail section or appendix. Use concrete summary labels such as "E02 — compare the count and listed items". |
| Long traces and methodological material | Named appendix or direct file link | Embed a short supporting excerpt so the raw file is optional. |

Do not nest disclosures. A link into a collapsed section must reveal its target
and leave the reader at that target, including when opening the URL with a hash.
Keep focus visible and ordered; native controls should work with Enter/Space and
touch. Any overlay needs an accessible label, Escape dismissal and sensible focus
return. Use captions and text alternatives so the evidence is comprehensible
without relying on color or interpreting markers alone.

Use actual native absolute file paths in the chat message (on Windows,
`[Evidence](<C:/trial/outputs/evidence.md>)`, without an extra slash before the
drive). Inside an exported report, resolve relative links against that report's
directory, not the shell's working directory. Verify the targets exactly as
written in the delivered Markdown or HTML using the filesystem and, when available,
the renderer. Do not silently fix a prefix while checking, or mistake existence
of the intended file for validity of its link. Keep portable reports and their
local evidence together; final chat links should locate that package unambiguously.

Provide a static representation containing the same conclusions and readable
evidence, such as a complete Markdown companion or expanded HTML. It must not
depend on scripts opening hidden content or on print CSS that was never checked.
Respect the requested format; interactive HTML is not mandatory for CLI/API.

## Test the report before delivering

Open the actual artifact. Inspect image loading, annotation alignment, readable
text, direct evidence links and return paths. Exercise the disclosure by keyboard
and at a narrow touch-sized viewport; inspect the static representation as well.
If these checks cannot run, state precisely what remains unverified.

Use four questions as a reading check: What is the main problem (or clean
outcome)? Why does it matter? Where is its evidence? What change is proposed
and how would we know it helps (or what should we preserve)? Answering should
not require reconstructing the trial. When an independent reviewer is available,
give only the delivered report and those questions, not the intended answers.
Describe agent reading checks as agent checks, never as human comprehension data.
Read the opening alone once before delivery. If it could be mistaken for a more
complete success than was verified, or leaves the main consequence or priority
unclear, fix that paragraph rather than adding another disclaimer to the appendix.
