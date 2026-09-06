import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const initialState = () => ({
  orders: [
    { id: 'PK-21', recipient: 'Aster', address: '12 Grove Road', eligible: true },
    { id: 'PK-22', recipient: 'Birch', address: '', eligible: true },
    { id: 'PK-23', recipient: 'Cedar', address: '9 Lake Road', eligible: false, reason: 'Customer requested a hold' }
  ], batches: [], jobs: [], nextId: 1
});

export async function createServer(statePath = resolve('.parcel-state.json')) {
  let state;
  try { state = JSON.parse(await readFile(statePath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw error; state = initialState(); }
  const save = () => writeFile(statePath, JSON.stringify(state, null, 2));
  return http.createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    const url = new URL(req.url, 'http://localhost');
    const role = req.headers['x-role'] ?? 'coordinator';
    let body = {};
    try {
      let text = ''; for await (const chunk of req) text += chunk;
      if (text) body = JSON.parse(text);
    } catch { res.writeHead(400); res.end(JSON.stringify({ message: 'Body must be JSON.' })); return; }
    const send = async (status, payload) => { await save(); res.writeHead(status); res.end(JSON.stringify(payload)); };
    if (req.method === 'GET' && url.pathname === '/help') return send(200, {
      product: 'Parcel Desk',
      routes: {
        'GET /orders': 'List orders and eligibility. Exclude held orders.',
        'POST /batches': 'Coordinator: {orderIds: [...]}; saves a draft.',
        'GET /batches': 'List saved batches.',
        'POST /batches/:id/approve': 'Supervisor approval required before dispatch.',
        'POST /batches/:id/dispatch': 'Coordinator: submit approved orders; returns job location.',
        'GET /jobs/:id': 'Poll after retryAfterMs; inspect item outcomes.',
        'PATCH /orders/:id': 'Coordinator: {address: "..."}; correct an address.',
        'POST /jobs/:id/retry': 'Coordinator: retry rejected items only, after correction.',
        'GET /manifests/:jobId': 'Carrier-accepted parcels for the warehouse; quantities count parcels.'
      }, roles: ['coordinator', 'supervisor', 'viewer'], processing: 'Local jobs settle after 300 ms.'
    });
    if (req.method === 'GET' && url.pathname === '/orders') return send(200, { orders: state.orders });
    if (req.method === 'GET' && url.pathname === '/batches') return send(200, { batches: state.batches });
    if (!['coordinator', 'supervisor', 'viewer'].includes(role)) return send(403, { message: 'Choose a documented role.' });
    if (req.method !== 'GET' && role === 'viewer') return send(403, { message: 'Viewer access is read-only. A coordinator can prepare a batch.' });
    if (req.method === 'POST' && url.pathname === '/batches') {
      if (role !== 'coordinator') return send(403, { message: 'A coordinator prepares the batch.' });
      if (!Array.isArray(body.orderIds) || body.orderIds.length === 0 || body.orderIds.some(id => !state.orders.some(o => o.id === id))) return send(400, { message: 'Provide known orderIds from GET /orders.' });
      if (body.orderIds.some(id => !state.orders.find(o => o.id === id).eligible)) return send(409, { message: 'Held orders cannot be dispatched. Remove them from this batch.' });
      const batch = { id: `B${state.nextId++}`, orderIds: [...new Set(body.orderIds)], status: 'draft' };
      state.batches.push(batch); return send(201, batch);
    }
    const batchRoute = /^\/batches\/([^/]+)\/(approve|dispatch)$/.exec(url.pathname);
    if (req.method === 'POST' && batchRoute) {
      const batch = state.batches.find(b => b.id === batchRoute[1]);
      if (!batch) return send(404, { message: 'Batch not found. GET /batches lists saved batches.' });
      if (batchRoute[2] === 'approve') {
        if (role !== 'supervisor') return send(403, { message: 'Supervisor approval required. The draft is saved.' });
        batch.status = 'approved'; return send(200, batch);
      }
      if (role !== 'coordinator') return send(403, { message: 'A coordinator dispatches approved batches.' });
      if (batch.status !== 'approved') return send(409, { message: 'Ask a supervisor to approve this saved batch first.' });
      const job = { id: `J${state.nextId++}`, batchId: batch.id, readyAt: Date.now() + 300, items: batch.orderIds.map(id => ({ orderId: id, outcome: 'pending' })) };
      state.jobs.push(job); batch.status = 'submitted';
      return send(202, { message: 'Dispatch complete', job: `/jobs/${job.id}`, retryAfterMs: 300 });
    }
    const orderRoute = /^\/orders\/([^/]+)$/.exec(url.pathname);
    if (req.method === 'PATCH' && orderRoute) {
      if (role !== 'coordinator') return send(403, { message: 'A coordinator corrects addresses.' });
      const order = state.orders.find(o => o.id === orderRoute[1]);
      if (!order) return send(404, { message: 'Order not found.' });
      if (typeof body.address !== 'string' || !body.address.trim()) return send(400, { message: 'Provide a nonempty address.' });
      order.address = body.address; return send(200, order);
    }
    const jobRoute = /^\/(jobs|manifests)\/([^/]+)(\/retry)?$/.exec(url.pathname);
    if (jobRoute) {
      const job = state.jobs.find(j => j.id === jobRoute[2]);
      if (!job) return send(404, { message: 'Job not found.' });
      if (Date.now() >= job.readyAt) for (const item of job.items) {
        if (item.outcome !== 'pending') continue;
        item.outcome = state.orders.find(o => o.id === item.orderId).address ? 'accepted' : 'rejected';
        if (item.outcome === 'rejected') item.reason = 'Address missing. Correct order address and retry rejected items.';
      }
      if (jobRoute[1] === 'jobs' && jobRoute[3] && req.method === 'POST') {
        if (role !== 'coordinator') return send(403, { message: 'A coordinator retries rejected items.' });
        for (const item of job.items) if (item.outcome === 'rejected') { item.outcome = 'pending'; delete item.reason; }
        job.readyAt = Date.now() + 300; return send(202, { job: `/jobs/${job.id}`, retryAfterMs: 300 });
      }
      if (req.method === 'GET' && !jobRoute[3]) {
        if (jobRoute[1] === 'jobs') return send(200, { id: job.id, status: job.items.some(i => i.outcome === 'pending') ? 'processing' : 'complete', items: job.items, manifest: `/manifests/${job.id}` });
        return send(200, { job: job.id, heading: 'Carrier-accepted parcels', quantity: job.items.length, parcels: job.items.filter(i => i.outcome === 'accepted').map(i => i.orderId) });
      }
    }
    return send(404, { message: 'Route not found. GET /help lists supported actions.' });
  });
}
