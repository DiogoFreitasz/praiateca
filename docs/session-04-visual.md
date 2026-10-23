# Sessão 04 — Etapa 06: integração visual

## Implementado

- Dashboard usa `catalogProgress` e `levelProgress` para XP, nível, progresso do nível e do catálogo; conta desbloqueios somente no catálogo existente. Nível máximo tem barra completa, sem próxima meta.
- Header consulta XP real e mostra `… XP` durante hidratação, mantendo navegação e composição existentes.
- Missões consulta `getMissionBestResult` e `getMissionAwardedXp`: conclusão independe de XP, melhor desempenho é mostrado em acertos/total e missões concluídas continuam repetíveis.
- Resultados mantém a avaliação e revisão originais. `AttemptRewards` apresenta exclusivamente `delivery.xpDelta` e `delivery.newAchievements` confirmados, além dos seletores globais. Nunca entrega eventos ou recalcula recompensas.
- Conquistas exibe as quatro definições reais, critérios descritivos (sem avaliação na interface), ícones, estados textuais e data de reconhecimento quando disponível.
- `ProgressStatus` centraliza apresentação dos estados de leitura/gravação e oferece somente a tentativa não destrutiva de salvamento existente. Dados corrompidos/incompatíveis não são sobrescritos.

Enquanto a hidratação estiver pendente, indicadores usam placeholders; não anunciam zero como progresso definitivo. Falhas de leitura deixam explícito que os indicadores representam somente dados disponíveis na sessão. Recompensas em memória são diferenciadas das efetivamente salvas.

O contrato atual não contém nível anterior ou um evento confirmado de avanço. Por isso Resultados mostra o nível atual, sem inferir avanço a partir do XP global, que pode ter mudado em outra aba. Datas das conquistas são datas de reconhecimento, não datas históricas inventadas.

## Testes automatizados

`npm run validate:gamification-ui` usa os stores e seletores reais, renderização React no servidor e as rotas reais em memória. Cobre progresso vazio, parcial e completo, nível máximo, Header, zero XP com conclusão, melhor resultado, repetição, melhorias, conquistas, hidratação, gravação malsucedida e recuperação, documentos inválidos/incompatíveis e revisão pedagógica. Compara estado, contadores de entrega e gravações antes/depois de renderizar. Os testes de fluxo anteriores continuam ativos.

Essa cobertura não monta um cliente React nem executa efeitos/interações no DOM. Não é uma auditoria visual ou declaração de conformidade WCAG. Nenhuma biblioteca foi instalada.

## Checklist manual pendente (Etapa 07)

- Verificar as cinco páginas em 320, 375, 430, 768 e 1280px: textos longos, filtros com rolagem, cards, Header e botões sem cortes.
- Navegar somente por teclado: menu, filtros, quiz, revisão, links e ações de recuperação; conferir foco visível e retorno do foco.
- Conferir leitura dos títulos, estados, ícones decorativos e barras com leitor de tela; medir contraste na renderização real.
- Concluir missão com zero acertos, melhorar, repetir com resultado inferior e revisar: XP não deve duplicar e escolhas devem permanecer imutáveis.
- Verificar hidratação sob StrictMode, recarga, histórico do navegador, duas abas e atualização automática de indicadores após uma conclusão.
- Simular armazenamento bloqueado/cheio, corrupção e versão incompatível: preservar dados existentes, mostrar memória versus salvamento e testar recuperação sem ações destrutivas.

Regras de XP, níveis, conquistas, esquema persistido, lógica de avaliação e as 40 questões não foram alterados. Não foi iniciada a Etapa 07.
