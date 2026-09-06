import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { createServer } from './fixtures/dispatch-product/server.mjs';

test('dispatch preserves handoff, partial acceptance, recovery, and isolated state', async () => {
  const root = await mkdtemp(join(tmpdir(), 'parcel-fixture-'));
  let server;
  const open = async () => {
    server = await createServer(join(root, 'state.json'));
    await new Promise(done => server.listen(0, '127.0.0.1', done));
  };
  const request = async (method, path, body, role = 'coordinator') => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, { method, headers: { 'x-role': role }, ...(body ? { body: JSON.stringify(body) } : {}) });
    return { status: response.status, body: await response.json() };
  };
  try {
    await open();
    assert.equal((await request('POST', '/batches', { orderIds: ['PK-23'] })).status, 409);
    assert.equal((await request('POST', '/batches', { orderIds: ['PK-21'] }, 'viewer')).status, 403);
    const batch = (await request('POST', '/batches', { orderIds: ['PK-21', 'PK-22'] })).body;
    assert.equal((await request('POST', `/batches/${batch.id}/approve`)).status, 403);
    await new Promise(done => server.close(done)); await open();
    assert.equal((await request('GET', '/batches')).body.batches[0].id, batch.id);
    assert.equal((await request('POST', `/batches/${batch.id}/approve`, {}, 'supervisor')).status, 200);
    const accepted = await request('POST', `/batches/${batch.id}/dispatch`);
    assert.equal(accepted.status, 202);
    const jobPath = accepted.body.job;
    assert.equal((await request('GET', jobPath)).body.status, 'processing');
    await new Promise(done => setTimeout(done, 320));
    const job = (await request('GET', jobPath)).body;
    assert.deepEqual(job.items.map(i => i.outcome), ['accepted', 'rejected']);
    const manifest = (await request('GET', job.manifest)).body;
    assert.equal(manifest.quantity, 2); assert.deepEqual(manifest.parcels, ['PK-21']);
    await request('PATCH', '/orders/PK-22', { address: '14 Elm Road' });
    await request('POST', `${jobPath}/retry`, {});
    await new Promise(done => setTimeout(done, 320));
    assert.deepEqual((await request('GET', job.manifest)).body.parcels, ['PK-21', 'PK-22']);
    const isolated = await createServer(join(root, 'separate.json'));
    await new Promise(done => isolated.listen(0, '127.0.0.1', done));
    const fresh = await (await fetch(`http://127.0.0.1:${isolated.address().port}/batches`)).json();
    assert.deepEqual(fresh.batches, []); await new Promise(done => isolated.close(done));
  } finally {
    if (server?.listening) await new Promise(done => server.close(done));
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith('parcel-fixture-'));
    await rm(root, { recursive: true, force: true });
  }
});
