// Controlled disclosure comparison. Authored report, not a candidate trial result.
import http from 'node:http';

const modes = new Set(['inline', 'tooltip', 'popover', 'details', 'appendix', 'static', 'definition-tooltip', 'context-popover']);
const evidence = `<h3 id="e01" tabindex="-1">E01 — o arquivo ainda não está disponível</h3>
<p>Exemplo autoral: a coordenadora solicitou um arquivo para a reunião. Esperava
obter o documento após a confirmação. O aviso mostrou “Solicitação recebida”;
a consulta seguinte mostrou “Processando”, sem arquivo disponível.</p>
<p>Esses estados sustentam apenas o recebimento e o processamento da solicitação.
Não estabelecem entrega, atraso definitivo ou perda de dados.</p>
<p><a href="#finding">Voltar à conclusão</a></p>`;

function page(mode) {
  const definition = 'Resultado assíncrono significa que o trabalho termina depois do pedido inicial.';
  const briefHelp = mode === 'definition-tooltip'
    ? `<button id="definition-trigger" aria-describedby="definition">Rever definição de assíncrono</button><span id="definition" role="tooltip" class="brief-tooltip" hidden>${definition}</span>`
    : mode === 'context-popover'
      ? `<button popovertarget="definition">Rever definição de assíncrono</button><p id="definition" popover>${definition}</p>` : '';
  const disclosure = {
    inline: `<section aria-label="Evidência">${evidence}</section>`,
    tooltip: `<p><button aria-describedby="proof" class="tooltip-trigger">Ver E01 — estados da solicitação</button></p><section id="proof" role="tooltip">${evidence}</section>`,
    popover: `<button popovertarget="proof">Ver E01 — estados da solicitação</button><section id="proof" popover>${evidence}<button popovertarget="proof" popovertargetaction="hide">Fechar evidência</button></section>`,
    details: `<details><summary>Ver E01 — estados da solicitação</summary>${evidence}</details>`,
    appendix: `<p><a class="target" href="#e01">Ver E01 — estados da solicitação</a></p><section class="appendix" aria-label="Evidência">${evidence}</section>`,
    static: `<section aria-label="Evidência">${evidence}</section>`,
  }[mode] ?? `<details><summary>Ver E01 — estados da solicitação</summary>${evidence}</details>`;
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ensaio de aprofundamento — ${mode}</title><style>
body{font:18px/1.55 system-ui,sans-serif;color:#182c38;background:#f6f8fa;margin:0}
main{max-width:760px;margin:auto;padding:28px}h1,h2,h3{line-height:1.2}a{color:#005b87}
button,summary,.target{font:inherit;min-height:44px;box-sizing:border-box;padding:10px 12px;cursor:pointer}
button,details{border:1px solid #647b88;border-radius:5px;background:white;color:inherit}
details{margin:20px 0}details> :not(summary){margin:18px}summary{font-weight:600}
:focus-visible{outline:3px solid #914500;outline-offset:4px}section{padding:12px 0}
[popover]{max-width:min(650px,80vw);max-height:70vh;padding:24px;overflow:auto;border:2px solid #647b88}
[role=tooltip]{display:none;position:absolute;background:white;max-width:650px;padding:20px;border:1px solid #647b88;box-shadow:0 8px 24px #0004}
.brief-tooltip:not([hidden]){display:block}.brief-tooltip[hidden]{display:none}
body:has(.tooltip-trigger:hover) [role=tooltip],body:has(.tooltip-trigger:focus) [role=tooltip],[role=tooltip]:hover{display:block}
.appendix{margin-top:45vh}.label{font-size:14px;color:#415866}nav{display:flex;gap:16px;flex-wrap:wrap}
@media(max-width:480px){main{padding:18px}h1{font-size:28px}[role=tooltip]{max-width:80vw}}
</style><main><p class="label">PROTÓTIPO AUTORAL · comparação de controles, sem trial de produto</p>
<h1>A reunião ainda depende de um arquivo não entregue</h1>
<p>A solicitação foi recebida e continuava processando. A coordenadora ainda não
podia usar o arquivo na reunião. Não verificamos a entrega posterior.</p>
<h2 id="finding" tabindex="-1">Distinguir solicitação recebida de arquivo disponível</h2>
<p>Manter o estado “Processando” e oferecer acesso ao arquivo quando estiver
disponível ajuda a coordenadora a decidir se já pode preparar a reunião. Verificar
com uma solicitação pendente e outra concluída: o leitor deve identificar em qual
delas consegue obter o arquivo. Preservar a confirmação imediata de recebimento.</p>
<p>${definition}</p>${briefHelp}
${disclosure}<hr><nav aria-label="Representações"><a href="/?mode=static">Versão estática completa</a><a href="/?mode=${mode}#e01">Link direto para E01</a></nav>
</main>${mode === 'static' ? '' : `<script>
function reveal(){const id=decodeURIComponent(location.hash.slice(1));const target=document.getElementById(id);if(!target)return;const details=target.closest('details');if(details)details.open=true;const popup=target.closest('[popover]');if(popup&&!popup.matches(':popover-open'))popup.showPopover();target.scrollIntoView();target.focus({preventScroll:true});}
addEventListener('hashchange',reveal);addEventListener('DOMContentLoaded',reveal);
const trigger=document.getElementById('definition-trigger'),tip=document.getElementById('definition');
if(trigger){for(const event of ['focus','pointerenter'])trigger.addEventListener(event,()=>tip.hidden=false);for(const event of ['blur','pointerleave'])trigger.addEventListener(event,()=>tip.hidden=true);trigger.addEventListener('keydown',event=>{if(event.key==='Escape')tip.hidden=true});trigger.addEventListener('click',()=>tip.hidden=false)}
</script>`}</html>`;
}

http.createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1');
  if (url.pathname === '/health') { response.end('report-navigation'); return; }
  const mode = url.searchParams.get('mode') ?? 'details';
  if (url.pathname !== '/' || !modes.has(mode)) { response.writeHead(404); response.end('Not found'); return; }
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(page(mode));
}).listen(4177, '127.0.0.1', () => console.log('Disclosure fixture http://127.0.0.1:4177'));
