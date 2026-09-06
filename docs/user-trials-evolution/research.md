# Pesquisa e decisões experimentais

Consulta em 2026-09-06. Fontes orientam hipóteses; não demonstram que esta skill
melhorou. Os experimentos e a validação reservada precisam demonstrar isso.

| Fonte primária | Implicação prática | Hipótese a testar / alternativa |
|---|---|---|
| [Nielsen, Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) | Separar conteúdo necessário à decisão de detalhes secundários; evitar profundidade excessiva. | H01: síntese por consequência com evidência a um nível melhora localização sem perder limites; comparar com relatório linear por persona. |
| [GOV.UK, Details](https://design-system.service.gov.uk/components/details/) e [Accordion](https://design-system.service.gov.uk/components/accordion/) | Conteúdo necessário à maioria precisa permanecer visível; títulos devem explicar o conteúdo recolhido. | H01: detalhes nativos por achado versus apêndice linear com links diretos; não recolher impacto ou ressalva que muda a prioridade. |
| [W3C, Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) | A expansão precisa funcionar por teclado e expor seu estado. | Testar Enter, Space, foco visível, toque e destino de links, além de abertura por mouse. |
| [W3C, Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) e [Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | Tooltip não recebe foco; conteúdo interativo requer outro mecanismo. O padrão de tooltip ainda informa ausência de consenso. | Definição curta inline é o ponto de partida; tooltip apenas redundante. Popover acionável só se melhorar localização e passar testes de fechar/retornar foco. Não usar modal para evidências extensas. |
| [GOV.UK, Clear language](https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/) | Vocabulário concreto, voz ativa, termos especializados explicados onde aparecem. | H01: títulos descrevem efeito na missão; leitor explica problema, consequência e proposta sem glossário obrigatório. |
| [NN/g, Information architecture vs. sitemaps](https://www.nngroup.com/articles/information-architecture-sitemaps/) | Organização e rótulos devem ajudar a encontrar informação, não apenas reproduzir uma hierarquia. | Organizar relatório por decisões e consequências compartilhadas; comparar à ordem cronológica das sessões. |
| [NN/g, Mental models](https://www.nngroup.com/articles/mental-models/) | Expectativas são crenças revisáveis, distintas dos fatos do sistema. | H02: registrar previsão antes da ação e mudança de entendimento depois; comparar à crítica retrospectiva sem previsão. |
| [Wharton et al., Cognitive walkthrough practitioner's guide](https://www.colorado.edu/ics/sites/default/files/attached-files/93-07.pdf) | Examinar intenção, descoberta da ação, associação ao objetivo e reconhecimento do progresso. | H02: usar perguntas nos pontos de decisão de uma tentativa real; não substituir operação por checklist de inspeção nem dar a rota correta à persona. |
| [GOV.UK, Creating an experience map](https://www.gov.uk/service-manual/user-research/creating-an-experience-map) e [Discovery](https://www.gov.uk/service-manual/user-research/user-research-in-discovery) | Considerar etapas, canais e dependências até o resultado final. | H02: mapear passagem de responsabilidade e verificar entregável após confirmação; contrastar com encerrar na última tela. |
| [GOV.UK, Analyse a research session](https://www.gov.uk/service-manual/user-research/analyse-a-research-session) | Separar observações da interpretação e ações. | H03: gabarito baseado em resultados operados, agrupamento com evidências compartilhadas sem apagar diferenças legítimas. |
| [NN/g, Making usability findings actionable](https://www.nngroup.com/articles/actionable-usability-findings/) | Achado específico e recomendação como possibilidade de solução, não verdade única. | H03: proposta explicita mudança, benefício e verificação; comparar com conselho genérico e diagnóstico técnico não demonstrado. |

## Alternativas antes de incorporar

- **Relatório linear:** funciona sem interatividade e é fácil de buscar; pode
  repetir jornadas e afastar evidência da decisão. É o controle.
- **Síntese + detalhes por achado:** mantém consequência à vista e aproxima
  provas; precisa de links que abram o destino e versão estática completa.
- **Síntese + apêndice com âncoras:** menos controles e bom para texto; pode exigir
  deslocamento e retorno. Candidato preferido para CLI/API.
- **Tooltips:** adequados apenas para definições redundantes; hover não atende
  toque. Não são candidatos para achados, impacto ou limitações essenciais.
- **Popovers:** contexto breve acionado por botão; sobreposição, Escape e foco
  têm custo de implementação/verificação. Comparar em protótipo antes de adotar.

Não acrescentar os frameworks como seções obrigatórias. A mudança procurada é
na escolha da próxima ação, no vínculo de evidência e na decisão do leitor.
