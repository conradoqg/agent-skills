#!/usr/bin/env python3
"""Check long-horizon record consistency; does not certify evidence or isolation."""
import argparse
import json
from pathlib import Path

UNIT_STATES = {'pending', 'in_progress', 'awaiting_audit', 'verified', 'blocked'}
WORK_STATES = {'planning', 'ready', 'running', 'paused', 'blocked', 'completed'}


def validate(state, base):
    errors = []
    def check(condition, message):
        if not condition:
            errors.append(message)
    def member(value, choices):
        return isinstance(value, str) and value in choices
    def text(value):
        return isinstance(value, str) and bool(value.strip())
    def records(key):
        value = state.get(key)
        if not isinstance(value, list):
            errors.append(f'{key}: expected array')
            return {}
        result = {}
        for row in value:
            if not isinstance(row, dict) or not text(row.get('id')):
                errors.append(f'{key}: every record needs an id')
                continue
            ident = row['id']
            check(ident not in result, f'{key}: duplicate id {ident}')
            result[ident] = row
        return result
    def refs(row, key, target, label, nonempty=False):
        value = row.get(key)
        if not isinstance(value, list) or not all(text(x) for x in value):
            errors.append(f'{label}.{key}: expected string array')
            return []
        check(len(value) == len(set(value)), f'{label}.{key}: duplicate reference')
        if nonempty:
            check(bool(value), f'{label}.{key}: must not be empty')
        for ident in value:
            check(ident in target, f'{label}.{key}: unknown reference {ident}')
        return value
    def local_file(value, label):
        if not text(value):
            errors.append(f'{label}: expected local relative file')
            return
        path = Path(value)
        # Reject Windows paths even when validation runs on POSIX.
        if path.is_absolute() or ':' in value or '\\' in value or '..' in path.parts:
            errors.append(f'{label}: must stay inside work directory')
            return
        resolved = (base / path).resolve()
        check(resolved.is_relative_to(base.resolve()) and resolved.is_file(),
              f'{label}: missing file or path escapes work directory: {value}')

    if not isinstance(state, dict):
        return ['state: expected object']
    check(type(state.get('version')) is int and state['version'] == 1, 'version: expected 1')
    check(text(state.get('id')), 'id: required')
    revision = state.get('plan_revision')
    check(type(revision) is int and revision > 0, 'plan_revision: positive integer required')
    check(member(state.get('status'), WORK_STATES), 'status: invalid work status')
    check(isinstance(state.get('approved'), bool), 'approved: expected boolean')
    check(text(state.get('next_step')), 'next_step: required (use none when complete)')
    if state.get('status') != 'planning':
        check(state.get('approved') is True, 'work outside planning requires approval')
    local_file(state.get('plan'), 'plan')
    requirements = records('requirements')
    units = records('units')
    evidence = records('evidence')
    audits = records('audits')
    check(bool(requirements), 'requirements: must not be empty')
    for ident, row in requirements.items():
        check(text(row.get('criterion')), f'{ident}: criterion required')
        check(isinstance(row.get('required'), bool), f'{ident}: required must be boolean')
    for ident, row in evidence.items():
        check(text(row.get('source')), f'{ident}: source required')
        check(text(row.get('observed_version')), f'{ident}: observed_version required')
        local_file(row.get('record'), f'{ident}.record')
    for ident, row in audits.items():
        local_file(row.get('report'), f'{ident}.report')
        check(type(row.get('plan_revision')) is int, f'{ident}: plan_revision required')
        check(member(row.get('integrity'), {'clean', 'suspect', 'violation'}), f'{ident}: invalid integrity')
        check(text(row.get('auditor')), f'{ident}: auditor identity required')
        check(member(row.get('scope'), {'unit', 'integration', 'reconciliation'}), f'{ident}: invalid audit scope')
        checks = row.get('checks')
        if not isinstance(checks, list) or not checks:
            errors.append(f'{ident}: nonempty checks required')
            continue
        seen = set()
        for item in checks:
            if not isinstance(item, dict):
                errors.append(f'{ident}: invalid check')
                continue
            req = item.get('requirement')
            check(isinstance(req, str) and req in requirements, f'{ident}: unknown requirement {req}')
            if isinstance(req, str):
                check(req not in seen, f'{ident}: duplicate criterion {req}')
                seen.add(req)
            check(member(item.get('verdict'), {'pass', 'fail', 'blocked'}), f'{ident}: invalid verdict')
            refs(item, 'evidence', evidence, f'{ident}/{req}', item.get('verdict') == 'pass')

    def passing(audit_id, needed, label):
        if not isinstance(audit_id, str) or audit_id not in audits:
            errors.append(f'{label}: verified state requires known audit')
            return
        audit = audits[audit_id]
        check(audit.get('integrity') == 'clean', f'{label}: audit is not clean')
        check(audit.get('plan_revision') == revision, f'{label}: audit revision is stale')
        passed = {item.get('requirement') for item in audit.get('checks', [])
                  if isinstance(item, dict) and isinstance(item.get('requirement'), str)
                  and item.get('verdict') == 'pass'} if isinstance(audit.get('checks'), list) else set()
        check(set(needed).issubset(passed), f'{label}: audit does not pass every criterion')

    for ident, row in units.items():
        check(text(row.get('goal')), f'{ident}: goal required')
        check(member(row.get('status'), UNIT_STATES), f'{ident}: invalid unit status')
        needed = refs(row, 'requirements', requirements, ident, True)
        dependencies = refs(row, 'depends_on', units, ident)
        check(ident not in dependencies, f'{ident}: self dependency')
        if row.get('audit') is not None:
            check(isinstance(row['audit'], str) and row['audit'] in audits, f'{ident}: unknown audit reference')
        if row.get('status') == 'blocked':
            check(text(row.get('blocker')), f'{ident}: blocked unit needs blocker')
        if row.get('status') == 'verified':
            passing(row.get('audit'), needed, ident)
        if member(row.get('status'), {'in_progress', 'awaiting_audit', 'verified'}):
            check(all(units.get(dep, {}).get('status') == 'verified' for dep in dependencies),
                  f'{ident}: dependencies are not verified')

    # Kahn traversal avoids recursion limits on large inventories.
    pending = {ident: set(x for x in row.get('depends_on', []) if isinstance(x, str) and x in units)
               for ident, row in units.items() if isinstance(row.get('depends_on'), list)}
    while pending:
        ready = {ident for ident, deps in pending.items() if not deps}
        if not ready:
            errors.append('units: dependency cycle')
            break
        pending = {ident: deps - ready for ident, deps in pending.items() if ident not in ready}
    for key in ('facts', 'hypotheses'):
        check(isinstance(state.get(key), list), f'{key}: expected array')
    for fact in state.get('facts', []) if isinstance(state.get('facts'), list) else []:
        if not isinstance(fact, dict) or not text(fact.get('statement')):
            errors.append('facts: statement required')
            continue
        audit_id = fact.get('audit')
        check(isinstance(audit_id, str) and audit_id in audits and audits[audit_id].get('integrity') == 'clean'
              and audits[audit_id].get('plan_revision') == revision, 'facts: current clean audit required')
        refs(fact, 'evidence', evidence, 'fact', True)
    for hypothesis in state.get('hypotheses', []) if isinstance(state.get('hypotheses'), list) else []:
        check(text(hypothesis), 'hypotheses: expected nonempty strings')
    if state.get('final_audit') is not None:
        check(isinstance(state['final_audit'], str) and state['final_audit'] in audits,
              'final_audit: unknown audit reference')
    if state.get('status') == 'completed':
        check(bool(units), 'completed: units must not be empty')
        check(all(row.get('status') == 'verified' for row in units.values()), 'completed: unresolved units')
        needed = [ident for ident, row in requirements.items() if row.get('required') is True]
        check(bool(needed), 'completed: at least one required criterion expected')
        covered = {req for row in units.values() if isinstance(row.get('requirements'), list) for req in row['requirements'] if isinstance(req, str)}
        check(set(needed).issubset(covered), 'completed: required criteria missing from units')
        final_id = state.get('final_audit')
        passing(final_id, needed, 'completed')
        check(isinstance(final_id, str) and audits.get(final_id, {}).get('scope') == 'integration',
              'completed: final audit must inspect integration')
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('state', type=Path)
    args = parser.parse_args()
    try:
        state = json.loads(args.state.read_text(encoding='utf-8-sig'))
        errors = validate(state, args.state.parent)
    except (OSError, ValueError) as exc:
        errors = [str(exc)]
    if errors:
        print('\n'.join('FAIL: ' + error for error in errors))
        return 1
    print('PASS: records are consistent; evidence truth, freshness and isolation are not certified.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
