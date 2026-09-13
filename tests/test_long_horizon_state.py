import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'skills/long-horizon/scripts/validate-state.py'
spec = importlib.util.spec_from_file_location('long_horizon_state', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class StateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        for name in ('plan.md', 'audit.md', 'observation.txt'):
            (self.base / name).write_text('fixture observation', encoding='utf-8')
        self.state = {
            'version': 1, 'id': 'test', 'plan': 'plan.md', 'plan_revision': 1,
            'approved': True, 'status': 'completed', 'next_step': 'none',
            'requirements': [{'id': 'R1', 'criterion': 'sum equals 12', 'required': True}],
            'units': [{'id': 'U1', 'goal': 'calculate sum', 'requirements': ['R1'],
                       'depends_on': [], 'status': 'verified', 'audit': 'A1'}],
            'evidence': [{'id': 'E1', 'source': 'result.csv', 'observed_version': 'sha256:abc',
                          'record': 'observation.txt'}],
            'audits': [{'id': 'A1', 'report': 'audit.md', 'plan_revision': 1,
                        'auditor': 'child-2', 'scope': 'integration', 'integrity': 'clean', 'checks': [
                            {'requirement': 'R1', 'verdict': 'pass', 'evidence': ['E1']}]}],
            'facts': [{'statement': 'sum is 12', 'audit': 'A1', 'evidence': ['E1']}],
            'hypotheses': [], 'final_audit': 'A1'}

    def reject(self, fragment):
        self.assertTrue(any(fragment in x for x in module.validate(self.state, self.base)),
                        module.validate(self.state, self.base))

    def test_valid_completed(self):
        self.assertEqual([], module.validate(self.state, self.base))

    def test_template(self):
        state = json.loads((SCRIPT.parent.parent / 'assets/state-template.json').read_text(encoding='utf-8-sig'))
        self.assertEqual([], module.validate(state, self.base))

    def test_duplicate_ids(self):
        self.state['units'].append(copy.deepcopy(self.state['units'][0]))
        self.reject('duplicate id')

    def test_unknown_dependency(self):
        self.state['units'][0]['depends_on'] = ['missing']
        self.reject('unknown reference')

    def test_cycle(self):
        self.state['units'][0]['depends_on'] = ['U2']
        second = copy.deepcopy(self.state['units'][0])
        second.update(id='U2', depends_on=['U1'])
        self.state['units'].append(second)
        self.reject('dependency cycle')

    def test_missing_evidence_file(self):
        (self.base / 'observation.txt').unlink()
        self.reject('missing file')

    def test_unknown_evidence(self):
        self.state['audits'][0]['checks'][0]['evidence'] = ['absent']
        self.reject('unknown reference')

    def test_verified_without_audit(self):
        self.state['units'][0]['audit'] = None
        self.reject('requires known audit')

    def test_unknown_audit_in_pending_unit(self):
        self.state['status'] = 'paused'
        self.state['units'][0].update(status='pending', audit='missing')
        self.reject('unknown audit reference')

    def test_unknown_final_audit_before_completion(self):
        self.state['status'] = 'paused'
        self.state['final_audit'] = 'missing'
        self.reject('unknown audit reference')

    def test_hypotheses_are_unverified_text(self):
        self.state['hypotheses'] = [{'verified': True}]
        self.reject('expected nonempty strings')

    def test_failed_audit(self):
        self.state['audits'][0]['checks'][0]['verdict'] = 'fail'
        self.reject('does not pass')

    def test_integrity_violation(self):
        self.state['audits'][0]['integrity'] = 'violation'
        self.reject('not clean')

    def test_stale_revision(self):
        self.state['plan_revision'] = 2
        self.reject('stale')

    def test_pending_completion(self):
        self.state['units'][0]['status'] = 'pending'
        self.reject('unresolved units')

    def test_required_uncovered(self):
        self.state['requirements'].append({'id': 'R2', 'criterion': 'other result', 'required': True})
        self.reject('missing from units')

    def test_unit_audit_not_integration(self):
        self.state['audits'][0]['scope'] = 'unit'
        self.reject('must inspect integration')

    def test_no_final_audit(self):
        self.state['final_audit'] = None
        self.reject('requires known audit')

    def test_blocker_required(self):
        self.state['status'] = 'blocked'
        self.state['units'][0]['status'] = 'blocked'
        self.reject('needs blocker')

    def test_path_escape(self):
        self.state['audits'][0]['report'] = '../outside.md'
        self.reject('must stay inside')

    def test_unapproved_execution(self):
        self.state['approved'] = False
        self.reject('requires approval')

    def test_malformed_fields(self):
        for collection, field, bad in [('units', 'status', []), ('units', 'requirements', 42),
                                       ('audits', 'integrity', {}), ('audits', 'checks', None)]:
            with self.subTest(collection=collection, field=field):
                state = copy.deepcopy(self.state)
                state[collection][0][field] = bad
                self.assertTrue(module.validate(state, self.base))
        self.assertTrue(module.validate([], self.base))

    def test_cli_exit_codes(self):
        path = self.base / 'state.json'
        path.write_text(json.dumps(self.state), encoding='utf-8')
        result = subprocess.run([sys.executable, str(SCRIPT), str(path)], capture_output=True, text=True)
        self.assertEqual(0, result.returncode, result.stdout)
        self.assertIn('not certified', result.stdout)
        path.write_text('{', encoding='utf-8')
        result = subprocess.run([sys.executable, str(SCRIPT), str(path)], capture_output=True, text=True)
        self.assertEqual(1, result.returncode)
        self.assertNotIn('Traceback', result.stderr)


if __name__ == '__main__':
    unittest.main()
