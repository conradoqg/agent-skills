# Protocolo pré-registrado

Registrado antes de observar qualquer resultado candidato desta evolução.
Snapshot inicial: `C:/Users/conta/AppData/Local/Temp/user-trials-previous-20260906`.
Registro persistente e resultados efêmeros: `.skill-evals/user-trials-evolution/`.
Limite: 50 ciclos experimentais; retries de infraestrutura não contam como ciclos.
Reservar as últimas 10 rodadas disponíveis para validação e entrega. Parar antes
se as três dimensões forem comprovadas sem regressão material.

## Gates de melhoria

Cada critério obrigatório precisa alcançar seu próprio threshold. Não baixar
threshold após observar resultados. Qualquer revisão de rubrica deve explicar
o erro de medição e reavaliar todas as variantes com a mesma versão.

| Critério | Threshold | Âncoras (0 / 5 / threshold / 10) |
|---|---:|---|
| Jornada e resultado | 8 | 0: sem operação; 5: etapa isolada; 8: decisões, dependências e resultado final ou limite explícito, cobrindo consequências materiais do caso; 10: também recuperação e diferença legítima entre papéis sustentadas. |
| Precisão | 9 | 0: inventa defeitos; 5: mistura hipótese e fato; 9: sem falso positivo material, sem elevar regra justificável a defeito, preserva fluxo correto; 10: distingue incertezas relevantes e alternativas explicativas com provas. |
| Rastreabilidade | 9 | 0: inventa evidência; 5: referências vagas; 9: cada achado material liga contexto, expectativa, ação, evidência existente e consequência; 10: reproduzível e limita explicitamente o alcance de cada prova. |
| Sugestões | 8 | 0: sem vínculo; 5: conselho genérico; 8: problema, mudança concreta, benefício e verificação para cada sugestão material; 10: também tradeoff relevante e resultado que refutaria a hipótese. |
| Compreensão principal | 9 | 0: conclusão errada/ausente; 5: depende de ler todo o apêndice; 9: escopo, resultado, maior impacto, afetados, proposta e limitação decisiva visíveis e corretamente recuperados; 10: também distingue o que preservar e prioridade sem precisão inventada. |
| Concisão e navegação | 8 | 0: ilegível/inacessível; 5: duplicação ou evidência difícil de achar; 8: síntese sem repetição material, evidência localizável em no máximo uma expansão ou link direto, alternativa estática compreensível; 10: mesmo sucesso em teclado, toque, impressão e links externos ao fragmento. |

Não exigir achados ou sugestões em fluxos corretos. Nesses casos, especificidade
significa sustentar o sucesso e não inventar um problema para preencher campos.
Gates determinísticos: produto operável, reset isolado, evidência existente,
links válidos, ausência de gabarito no pacote da persona, sem ações proibidas.

## Casos e comparações

- Regressão inicial: quatro casos CLI/API/descoberta/fora de escopo e três browser
  existentes, preservando as rubricas originais.
- Desenvolvimento: relatório compacto com aprofundamento primeiro; depois
  jornadas persistentes com autorização, entrega parcial e recuperação.
- Reserva: outro domínio, missão complexa e fluxo correto. Congelar prompts,
  fixtures e critérios antes de executar candidatos; não usar resultado reservado
  para tuning repetido. Falha impede alegação de generalização e exige novo caso
  reservado se houver nova alteração de comportamento.
- Marcos: `without_skill`, `old_skill`, `with_skill` na mesma suite. Rodar ambos
  os comandos exigidos pelo AGENTS.md e o runner de browser pertinente.
- Inspecionar cada critério, não apenas exit code ou média. Registrar tokens das
  tarefas e graders, duração e falhas separadamente; valores indisponíveis são
  desconhecidos, nunca zero. Não converter execução de agente em tempo humano.

## Ensaio do relatório

Avaliadores independentes recebem somente o relatório entregue, seus anexos e
quatro perguntas: qual o principal problema (ou resultado correto), qual sua
consequência, onde está a evidência e qual melhoria proposta (ou por que manter).
Não recebem gabarito, rubric de defeitos ou conclusões do autor. Registrar suas
respostas e caminhos usados; conferir com evidência separadamente. Inspeção real
de HTML renderizado, capturas anotadas, teclado/toque e fallback é obrigatória
e não é substituída pela nota do grader. Resultados descrevem agentes leitores,
não compreensão de pessoas.

## Registro de ciclo

Número, hipótese, alternativas, mudança, casos executados, resultado por
critério, tokens de tarefa/grader, tempo, falhas e decisão de manter/ajustar/
descartar. Estado pendente não equivale a aprovação. Antes/depois de um caso
complexo e de um correto devem ficar disponíveis como artefatos locais.
