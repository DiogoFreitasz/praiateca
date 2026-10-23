# PraiaTeca

Plataforma acadêmica de revisão com missões gamificadas, construída com React, Vite e Tailwind CSS.

## Estado da Sessão 03

Implementados: oito missões com cinco questões cada, quiz interativo, revisão das respostas antes de concluir, progresso por questões respondidas, correção pedagógica após finalizar, Resultados e revisão educativa sem edição, nova tentativa e estado temporário compartilhado em React Context.

A auditoria técnica corrigiu carregamento parcial de missões, arrays com lacunas, avaliações malformadas e problemas verificáveis de acessibilidade do menu mobile. Os validadores, lint e build passam. O aceite visual e de interação em navegador real permanece pendente. Consulte o [relatório de auditoria e preparação da Sessão 04](docs/session-03-audit.md).

## Desenvolvimento

A Sessão 04 está implementada até a Etapa 06: XP proporcional ao desempenho, níveis, quatro conquistas, progresso versionado em localStorage e integração com a conclusão do quiz. Dashboard, Header, Missões, Resultados e Conquistas exibem dados reais, com estados de hidratação e salvamento. Consulte as [verificações e limitações da integração visual](docs/session-04-visual.md).

```bash
npm install
npm run dev
```

## Validação

```bash
npm run validate:data
npm run validate:quiz
npm run validate:progress
npm run validate:achievements
npm run validate:progress-storage
npm run validate:quiz-progress
npm run validate:gamification-ui
npm run lint
npm run build
git diff --check
```

O validador confere a integridade das disciplinas, missões, questões e de seus relacionamentos.

O validador de Quiz verifica o carregamento isolado das oito missões, IDs inválidos, dados indisponíveis e alternativas malformadas. Também exercita seleção e alteração de respostas, navegação, progresso, bloqueio de conclusão incompleta, congelamento das respostas, reinício e inicialização independente por missão.

A correção é validada nas 40 questões: identificação de acertos e erros, alternativa correta, explicação original ou mensagem neutra quando ausente, totais e percentuais, rejeição de dados inválidos, bloqueio antes da finalização e imutabilidade. A renderização também verifica que o quiz ativo não mostra correção e que a revisão não oferece edição.

Resultados são validados de 0% a 100%, incluindo limites das mensagens pedagógicas, totais, inconsistências e isolamento por missão. A navegação entre as rotas reais de Quiz, Resultados e Revisão é verificada com roteador em memória e renderização React.

`validate:quiz` também executa `validate-quiz-audit.mjs`, cobrindo missão parcial, disciplina divergente, arrays com posições ausentes e avaliações sem estrutura válida. A renderização verifica estados do menu, títulos e agrupamento acessível das alternativas; o histórico é exercitado pelo roteador em memória.

A verificação inclui renderização React sem navegador, usando o Vite já instalado. Ela não substitui testes de interação, foco e responsividade em um navegador real.

## Quiz por missão

Em `/missoes`, a ação **Iniciar missão** abre `/quiz/:missionId` (por exemplo, `/quiz/mission-01`). A página carrega os dados locais pela URL e permite responder uma questão por vez. As alternativas usam botões de rádio, com seleção por teclado e destaque visual.

**Anterior** permite revisar respostas. **Próxima** exige uma resposta na questão atual. **Finalizar** exige respostas válidas para todas as questões e pode ser usado em qualquer questão após completar as respostas. O progresso representa a quantidade respondida: três de cinco respostas correspondem a 60%.

A conclusão congela uma cópia das respostas e abre `/resultados/:missionId`. A tela mostra missão, disciplina, total de questões, acertos, erros, percentual e mensagem pedagógica. **Revisar respostas** abre `/resultados/:missionId/revisao`, preservando a mesma tentativa ao voltar aos Resultados.

A revisão mostra o enunciado, a resposta escolhida, a alternativa correta e a justificativa original, com ícones e textos para indicar acerto ou erro. **Questão anterior** e **Próxima questão** percorrem a revisão. **Tentar novamente**, nos Resultados, ou **Reiniciar missão**, na Revisão, limpam a tentativa concluída e abrem um quiz novo da mesma missão.

O endereço `/quiz` orienta a escolha de uma missão. Missões inexistentes ou sem dados disponíveis exibem uma mensagem com retorno às Missões.

O carregamento fica em `src/data/quiz.js`, reutilizando os auxiliares existentes. O hook `src/hooks/useQuiz.js` mantém o estado local com `useReducer`, cujas regras puras ficam em `src/utils/quizAttempt.js`. A apresentação fica em `src/pages/Quiz.jsx`, com a sessão identificada pela missão para reinicializar o estado ao mudar a URL.

A estrutura de conclusão contém `missionId`, `attemptId`, `completedAt` e `answers`, indexadas pelos IDs estáveis das questões. O `QuizResultProvider` preserva o snapshot em memória e coordena sua entrega única ao progresso. As funções puras `evaluateQuestion` e `evaluateAttempt`, em `src/utils/quizEvaluation.js`, continuam sendo a única lógica de correção. `src/utils/quizResults.js` resolve os dados do resultado e centraliza as mensagens das faixas de desempenho; `src/components/quiz/QuizReview.jsx` apresenta o feedback e controla apenas a posição da revisão.

O resultado permanece durante a navegação da SPA. `/resultados` mostra a tentativa concluída disponível, enquanto rotas com ID exigem uma tentativa daquela missão. Iniciar um novo quiz limpa o resultado anterior. Acessar Resultados ou Revisão sem snapshot válido, inclusive após recarregar a aplicação, mostra uma orientação para selecionar uma missão. O progresso de gamificação é persistido separadamente; respostas e revisão não são persistidas.

Para acesso direto e recarga das rotas em produção, a hospedagem deve servir `index.html` nas rotas da aplicação, conforme exigido pelo `BrowserRouter`.

## Estrutura principal

```text
src/data/                 Disciplinas, missões, questões e carregamento do quiz
src/hooks/useQuiz.js      Estado local da tentativa ativa
src/utils/quizAttempt.js  Transições e regras do motor
src/utils/quizEvaluation.js  Correção e validação do contrato da avaliação
src/utils/quizResults.js  Resolução de Resultados e mensagens de desempenho
src/utils/questionValidation.js  Validação comum de alternativas
src/context/              Snapshot concluído e avaliação derivada em memória
src/components/quiz/      Revisão pedagógica
src/components/progress/  Diagnósticos e apresentação de recompensas
src/components/ui/        Botões, cards e indicadores reutilizáveis
src/components/layout/    Menu, cabeçalho e conteúdo das rotas
src/pages/                Páginas da aplicação
src/routes/               Rotas e Provider compartilhado
scripts/                  Validadores de dados, motor, correção, resultados e interface
```

## Limitações atuais

- Não há backend ou autenticação. Recarregar descarta as respostas e o resultado pedagógico, mas recupera o progresso salvo neste navegador. localStorage não oferece transações reais nem proteção contra manipulação intencional.
- Resultados exibe o nível atual, sem afirmar avanço de nível: o contrato de entrega não registra o nível anterior. Apenas XP adicional e novas conquistas confirmados na entrega são atribuídos à tentativa.
- Não houve teste em navegador, leitor de tela ou renderização visual nos tamanhos 320, 375, 430, 768 e 1280px. A responsividade foi analisada pelas classes e pelo CSS gerado; não há declaração de conformidade WCAG completa.
- Os testes sem navegador não exercitam os efeitos de foco, cliques e ciclo de vida do Context em um cliente React montado. O checklist do relatório cobre essas verificações pendentes.

## Próxima etapa — auditoria final

A Etapa 07 deve auditar o fluxo completo, acessibilidade e responsividade em navegador real, além das falhas de armazenamento e sincronização entre abas. Ela não foi iniciada. Histórico visual de tentativas e sincronização com servidor não estão implementados.
