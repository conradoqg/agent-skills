#!/usr/bin/env node
// Regrade recorded trials without replaying product actions or changing old grades.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { collectGradingArtifacts, createRuntime, safeId, loadManifest } from '../../../scripts/evaluate-skills.ts';

const [evaluationPath, suitePath, destination] = process.argv.slice(2);
if (!evaluationPath || !suitePath || !destination) throw new Error('Usage: node regrade-reports.mjs <evaluation.json> <suite.json> <new-output-directory>');
const evaluation = JSON.parse(await readFile(evaluationPath, 'utf8'));
const suite = await loadManifest(resolve(import.meta.dirname, '..'), suitePath);
const output = resolve(destination);
await mkdir(output); // Fail if this regrade destination already exists.
const runtime = createRuntime({ runtime: 'codex', codexBin: 'codex', codexConfigs: [], grader: 'runtime', timeoutMs: 300_000 });
const results = [];
for (const previous of evaluation.results) {
  const test = suite.evals.find(test => String(test.id) === String(previous.eval_id));
  if (!test) throw new Error(`No rubric for ${previous.eval_id}`);
  const source = join(resolve(evaluationPath, '..'), `eval-${safeId(test.id)}`, ...(test.repetitions > 1 ? [`repetition-${previous.repetition}`] : []), previous.variant, 'outputs');
  const variantDir = join(output, `${safeId(test.id)}-${previous.variant}-${previous.repetition}`);
  await mkdir(variantDir);
  const gradingArtifacts = await collectGradingArtifacts(source, test.grading_artifacts);
  const finalText = previous.code === 0 && !previous.timed_out
    ? await readFile(join(source, 'last-message.md'), 'utf8') : '';
  const run = { output: finalText, code: previous.code, timedOut: previous.timed_out, gradingArtifacts };
  await writeFile(join(variantDir, 'grading-artifacts.json'), JSON.stringify(gradingArtifacts, null, 2));
  const grade = await runtime.grade({ variantDir, test, run });
  results.push({ eval_id: previous.eval_id, variant: previous.variant, previous_grading: previous.grading, grading: grade.results, grader_timing: grade.timing, candidate_timing: previous.timing, passed: previous.code === 0 && !previous.timed_out && grade.results.every(item => item.passed === true) });
  console.log(`${previous.variant}: ${grade.results.map(item => `${item.score}/${item.threshold}`).join(', ')}`);
}
await writeFile(join(output, 'regrade.json'), JSON.stringify({ source: resolve(evaluationPath), suite: resolve(suitePath), results }, null, 2));
