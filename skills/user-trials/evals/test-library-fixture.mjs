import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

test('library fixture exposes receipt versus saved loan and reversible recovery', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'library-fixture-'));
  const entry = resolve(import.meta.dirname, 'fixtures/library-product/library.mjs');
  const run = (...args) => spawnSync(process.execPath, [entry, ...args], { cwd: workspace, encoding: 'utf8', windowsHide: true });
  const loans = () => JSON.parse(run('loans').stdout).loans;
  try {
    const original = loans();
    assert.equal(original.find(loan => loan.id === 'L20').due, '2026-09-08');
    assert.equal(run('renew', 'L30').status, 3);
    assert.deepEqual(loans(), original);
    const receipt = JSON.parse(run('renew', 'L20').stdout);
    assert.equal(receipt.due, '2026-09-15');
    assert.equal(loans().find(loan => loan.id === 'L20').due, '2026-09-08');
    assert.equal(loans().find(loan => loan.id === 'L10').due, '2026-09-15');
    assert.equal(run('undo', receipt.receipt).status, 4);
    assert.equal(run('undo', receipt.receipt, 'librarian').status, 4);
    assert.equal(run('undo', receipt.receipt, '--role', 'librarian').status, 0);
    assert.deepEqual(loans(), original);
    run('renew', 'L10'); run('reset'); assert.deepEqual(loans(), original);
  } finally {
    assert.equal(dirname(resolve(workspace)), resolve(tmpdir()));
    assert.ok(basename(workspace).startsWith('library-fixture-'));
    await rm(workspace, { recursive: true, force: true });
  }
});
