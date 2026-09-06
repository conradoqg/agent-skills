# Matriz de cobertura

Estado de implementação, não alegação de cobertura executada. O registro local
identifica os casos realmente rodados e os resultados por variante.

| Caso / conjunto | Superfície | Decisões e consequências | Controle de falso positivo | Isolamento / reset | Partição |
|---|---|---|---|---|---|
| derive-panel-from-source | código/documentação | papéis, aprovação segregada, consumidor de integração | não há aplicação operável: apenas descoberta | ZIP extraído por variante | regressão |
| cli-independent-trials | CLI | descobrir comando, corrigir configuração, interpretar plano | nenhum deploy autorizado; JSON não é defeito por si só | processo sem mutação | regressão |
| api-consumer-trials | driver API simulado | paginação e ausência de fatura | não inventar consequência financeira; header é escolha válida | driver sem estado | regressão |
| boundary-hypothetical-debate | nenhum produto | deliberação arquitetural | não inventar interação | sem fixture | regressão |
| portfolio-attention-and-export | browser | seleção de projetos, conjunto incompleto, confirmação sem arquivo | não transformar observação limitada em falha eterna | contexto isolado; página sem estado persistente | desenvolvimento |
| portfolio-clean-detail | browser | localizar responsável e risco | missão correta, data fora da decisão solicitada | contexto isolado | desenvolvimento |
| portfolio-business-meaning | browser | interpretar data ambígua para reunião | convenção de data desconhecida, sem data correta inventada | contexto isolado | regressão |
| Parcel Desk (fixture adicionada) | HTTP real via driver CLI | elegibilidade, rascunho persistente, aprovação por papel, processamento assíncrono, itens rejeitados, comprovante, correção e retry parcial | retenção correta, 403 explicativo, recuperar sem duplicar aceitos | diretório por execução; reset explícito; porta efêmera | desenvolvimento, suite pré-registrada |
| Learn Desk / parcial e recuperação | browser | seleção persistente, aprovação por revisor, emissão por pessoa, pré-requisito vencido, registro baixado e retry parcial | aprovação e pré-requisito são corretos; renovação só com comprovação | localStorage por contexto; botão Reset; porta 4175 | desenvolvimento; QA do autor executada |
| Learn Desk / leitura correta | browser | responder sobre presença e avaliação no papel viewer | controles desabilitados corretos; elegibilidade não prova emissão | mesmo reset/contexto isolado | desenvolvimento; suite pré-registrada |
| Branch Library / renovação | CLI | desambiguar edição, renovar, conferir estado persistido, reverter por papel | empréstimo de referência não renovável é política legítima | diretório por execução; reset explícito | reserva congelada, nenhum candidato executado |
| Branch Library / consulta e criação fictícia | CLI / nenhum produto | descobrir vencimento e entender política; separar criação de ensaio | consulta correta sem renovação; não encenar produto imaginário | mesmo reset / sem fixture no caso fictício | reserva congelada, nenhum candidato executado |
| Report navigation | browser, mecânica de relatório | acessar e retornar da evidência; definir termo breve; comparar inline, tooltip, popover, details e apêndice | texto autoral idêntico, nunca apresentado como trial de produto; overlays longos são controles negativos | sem estado de negócio, URL por alternativa; porta 4177 | desenvolvimento mecânico, separado das respostas candidatas |

Gabaritos, casos e testes de consequências ficam em `evals/` ou nesta documentação
de desenvolvimento, nunca nas referências distribuídas às personas. O runner
existente remove `evals/` da cópia da skill. O coordenador entrega apenas missão,
contrato público e limites de ação; fonte da fixture não é roteiro da persona.
O isolamento atual é de contexto/instruções e workspace, não uma alegação de
sigilo criptográfico contra um candidato que tente sair do escopo.

## Executar os novos casos

```powershell
Compress-Archive -Path skills/user-trials/evals/fixtures/dispatch-product/* -DestinationPath skills/user-trials/evals/fixtures/dispatch-product.zip -Force
node --test skills/user-trials/evals/test-dispatch-fixture.mjs
node scripts/evaluate-skills.ts --skill user-trials --evals skills/user-trials/evals/development-evals.json --previous <snapshot> --approve-for-me
node skills/user-trials/evals/run-browser-evals.mjs --fixture skills/user-trials/evals/fixtures/learning-product/server.mjs --app http://127.0.0.1:4175 --evals skills/user-trials/evals/browser-development-evals.json --previous <snapshot> --approve-for-me
```

Regenerar o ZIP sempre que a fonte Parcel Desk mudar. Não incluir testes,
gabaritos ou suites no ZIP. Os candidatos recebem contrato e produto operável;
testes de consequências ficam fora. No host gerenciado desta sessão, o processo
externo do runner precisa do ambiente com TLS funcional, autorizado pelo usuário;
isso não permite desabilitar validação TLS ou o sandbox dos candidatos.

O runner browser recusa endereço já em uso; aguarde o ensaio que possui a porta.
Para comparar versões em paralelo com desenvolvimento, passe `--skill` apontando
para um snapshot candidato imutável: a cópia de runtime ocorre por variante.

As suites de desenvolvimento declaram arquivos textuais para o grader, inclusive
CSV baixado e registros JSON. A coleta é limitada, não recursiva e exclui dotfiles
e metadados de tempo do harness. Confira omissões em `grading-artifacts.json`;
não tome uma limitação do pacote por falta de evidência produzida. Para corrigir
uma medição, preserve o resultado original e reavalie todas as variantes com a
mesma seleção e rubrica, sem operar novamente o produto:

```powershell
node skills/user-trials/evals/regrade-reports.mjs <evaluation.json> <suite.json> <nova-pasta-de-resultados>
node skills/user-trials/evals/fixtures/report-navigation/server.mjs
```

O segundo comando oferece `/?mode=details`, `inline`, `appendix`, `static`,
`definition-tooltip` e `context-popover`. Os modos `tooltip` e `popover` colocam
evidência longa em overlays como controles negativos. Não usar seu comportamento
para generalizar sobre todo uso possível desses mecanismos. Inspecionar o
relatório realmente entregue continua obrigatório; o protótipo não o substitui.

O runner configura TEMP/TMP/TMPDIR somente no processo chrome-devtools-mcp para
`outputs` da própria variante. A expansão do valor literal `"${output_dir}"`
acontece no evaluator, com escape de caminho. Assim, a restrição nativa de gravação
no diretório temporário continua ativa e a pasta permitida fica isolada por
candidato. Não usar flags que desativem a restrição. Testes offline verificam que
as duas variantes recebem diretórios distintos e que o marcador não chega ao CLI.
