import assert from 'node:assert/strict';
import { collaborationFromJsonl, graderPrompt } from '../scripts/evaluate-skills.ts';

const sessions = [
  { thread_id: 'parent', parent_thread_id: null, completed: true },
  { thread_id: 'worker', parent_thread_id: 'parent', agent_path: '/root/executor_001', completed: true },
  { thread_id: 'reviewer', parent_thread_id: 'parent', agent_path: '/root/auditor_001', completed: false }
];
const recorded = collaborationFromJsonl('', '', sessions);
assert.equal(recorded.spawned_agents, 2);
assert.equal(recorded.completed_agents, 1);
assert.equal(recorded.unfinished_agents, 1);
assert.deepEqual(recorded.agents.map(a => a.thread_id), ['worker', 'reviewer']);
const prompt = graderPrompt({ expected_output: 'A verified result.', assertions: [] },
  { output: 'I claim both agents finished.', collaboration: recorded });
assert.match(prompt, /Harness-recorded collaboration/);
assert.match(prompt, /"thread_id":"reviewer"[^\n]+"completed":false/);
assert.match(prompt, /not proof of audit quality or enforced permissions/);
const unrecorded = graderPrompt({ expected_output: 'A result.', assertions: [] },
  { output: 'I used two independent agents.' });
assert.doesNotMatch(unrecorded, /Harness-recorded collaboration/);
assert.equal(collaborationFromJsonl('I used two agents.').spawned_agents, 0);
console.log('collaboration grading evidence checks passed');
