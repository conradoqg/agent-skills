import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const files = new Map([['/', ['index.html', 'text/html']], ['/app.js', ['app.js', 'text/javascript']]]);
const port = Number(process.env.LEARN_DESK_PORT || 4175);
http.createServer(async (request, response) => {
  if (request.url === '/health') { response.setHeader('content-type', 'application/json'); response.end('{"fixture":"learn-desk","ok":true}'); return; }
  const file = files.get(request.url);
  if (!file) { response.writeHead(404); response.end('Not found'); return; }
  response.setHeader('content-type', `${file[1]}; charset=utf-8`);
  response.end(await readFile(join(import.meta.dirname, file[0])));
}).listen(port, '127.0.0.1', () => console.log(`Learn Desk fixture ready at http://127.0.0.1:${port}`));
