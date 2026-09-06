#!/usr/bin/env node
import { createServer, initialState } from './server.mjs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [method = 'GET', path = '/help', body, role = 'coordinator'] = process.argv.slice(2);
const statePath = resolve('.parcel-state.json');
if (method === 'reset') {
  await writeFile(statePath, JSON.stringify(initialState(), null, 2));
  console.log('Local Parcel Desk sandbox reset.');
} else {
  const server = await createServer(statePath);
  await new Promise(resolveListen => server.listen(0, '127.0.0.1', resolveListen));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
      method, headers: { 'content-type': 'application/json', 'x-role': role },
      ...(body && !['GET', 'HEAD'].includes(method) ? { body } : {})
    });
    console.log(`${method} ${path}\nHTTP ${response.status}\n${await response.text()}`);
  } finally { await new Promise(resolveClose => server.close(resolveClose)); }
}
