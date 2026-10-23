# Sessão 04 — Etapa 04: persistência e progresso compartilhado

## Escopo

O `ProgressProvider` envolve o `QuizResultProvider`, acima das rotas. A Etapa 04 estabeleceu a persistência; a Etapa 05 passou a entregar a conclusão válida do quiz ao comando de progresso. A apresentação de XP, níveis e conquistas em Dashboard, Header, Missões e Resultados continua aguardando a Etapa 06. Resultados e Revisão receberam somente diagnóstico de falha e opção de retentar o salvamento, sem novos indicadores de gamificação.

O serviço adicional `src/services/progressStore.js` contém a coordenação usada pelo Provider. Essa separação permite testar hidratação, comandos e recuperação sem instalar bibliotecas de testes ou duplicar a implementação dentro dos testes.

## Adaptador

`createProgressStorage(storageOpcional)` aceita um objeto com `getItem` e `setItem`. Sem injeção, procura `window.localStorage` somente durante a operação. Importar os módulos e construir o serviço não acessa o navegador nem o armazenamento.

A chave é `praiateca.progress.v1`. `read()` retorna `loaded` com `state`, `empty`, `corrupted`, `incompatible` ou `unavailable`. `write(state)` valida o documento de entrada, lê novamente o conteúdo existente para proteger documentos inválidos e retorna `saved` apenas após `setItem` terminar sem exceção. Uma entrada inválida retorna `invalid-state`. Mensagens e a operação com falha permitem diagnosticar indisponibilidade.

O adaptador não executa merge, reset, remoção ou migração. JSON inválido, esquema corrompido ou versão incompatível bloqueiam a escrita automática. A validação não é uma proteção antifraude contra alterações intencionais feitas pelo usuário.

## Context e comandos

`useProgress()` expõe:

- `progress`: documento atual em memória, protegido contra mutações acidentais.
- `isHydrated` e `hydrationStatus`: `loading` ou `ready`.
- `persistenceStatus`: `loading`, `saved`, `unsaved`, `error` ou `incompatible`.
- `hasPersistedData`: houve leitura válida ou gravação confirmada; sozinho não significa que o estado atual inteiro esteja salvo.
- `hasPendingChanges` e `pendingAttemptIds`: alterações e tentativas ainda não confirmadas no armazenamento.
- `error`: código e mensagem da falha mais recente.
- `catalogProgress`, `levelProgress`, `getMissionBestResult(id)` e `getMissionAwardedXp(id)`: seletores existentes, sem novos cálculos de XP.
- `processCompletedAttempt(event)`, `retrySave()` e `reconcile()`.

Os objetos `storage` e `now` opcionais do Provider configuram sua instância; para trocá-los, deve-se remontar o Provider. `storage` recebe o adaptador, enquanto `createProgressStorage` recebe a interface Storage.

Antes da hidratação, o comando rejeita de forma recuperável: `{ accepted: false, status: 'not-ready', code: 'PROGRESS_NOT_HYDRATED', saved: false }`. O chamador é responsável por reenviar após `isHydrated`; não existe fila silenciosa de eventos precoces.

Após a hidratação, o comando relê e reconcilia o estado disponível, chama `applyCompletedAttempt`, atualiza a memória e tenta salvar. O retorno preserva os campos da transição, acrescentando `accepted`, `saved`, `persistenceStatus` e `pendingAttemptIds`. Conflitos continuam lançando `ATTEMPT_CONFLICT`. Falhas de I/O não apagam a conclusão aplicada em memória: o documento e os IDs pendentes permanecem para `retrySave()`.

Um evento duplicado não acrescenta XP, não cria outra conquista e não exige nova gravação quando já existe um documento equivalente salvo. Equivalência é verificada independentemente da ordem das propriedades.

## Hidratação

O estado inicial é `loading`; nenhuma gravação acontece durante renderização ou antes da leitura. Na ausência de documento, começa-se com progresso vazio e status `unsaved`, sem escrever um documento vazio automaticamente.

Um documento válido é carregado e passa pelo reconhecimento retroativo com horário fornecido pelo coordenador. Se o relógio estiver antes da última atualização registrada, usa-se essa última data externa conhecida. Sem novas conquistas, a hidratação não grava. Havendo novidades, o estado é validado antes da gravação.

Corrupção, incompatibilidade ou indisponibilidade encerram a hidratação com estado seguro em memória e diagnóstico explícito. Novas conclusões podem ficar pendentes em memória, mas o documento problemático não é sobrescrito. Quando o armazenamento voltar a ser legível e válido, uma nova tentativa de gravação reconcilia os dados recuperados com os pendentes.

Repetir `hydrate()` na mesma instância não relê nem regrava o estado. A construção é isenta de I/O, o que evita gravar durante inicializadores repetidos em StrictMode. A assinatura de eventos é removida no cleanup do efeito do Provider.

## Reconciliação entre abas

`mergeProgress(left, right)` é pura e valida ambas as entradas. Une os IDs de tentativas, preserva a maior recompensa por missão e os desbloqueios existentes. O mesmo ID com conteúdo diferente gera `ATTEMPT_CONFLICT` e impede a sobrescrita.

Empates de melhor resultado entre documentos usam a data da tentativa e, depois, o ID como desempate determinístico. Isso não altera a regra de empate da transição de uma nova tentativa. Desbloqueios repetidos preservam a primeira data válida de reconhecimento. A revisão mesclada usa o máximo das revisões e da quantidade de tentativas unidas; é metadado, não um contador global transacional.

A mesclagem opera nos campos definidos pelo esquema v1. Não inventa datas nem reconhece novas conquistas por conta própria; o coordenador faz o reconhecimento depois, usando o horário externo. Os testes cobrem idempotência, comutatividade e associatividade nos documentos do domínio.

O Provider escuta `storage` para a chave de progresso e para remoções gerais. Relê a chave atual, evitando aplicar o `newValue` de um evento antigo. Se a união já corresponder ao documento salvo, não grava outra vez. IDs pendentes não são descartados antes de confirmação. Um documento removido externamente não é tratado como comando de reset: uma instância ativa preserva seu progresso e pode restaurá-lo na próxima reconciliação.

**localStorage não oferece transações reais.** Releitura, merge e `setItem` não formam uma operação indivisível. Outra aba pode escrever entre essas operações ou logo após a confirmação. A estratégia oferece reconciliação prática enquanto as instâncias continuam ativas; não garante consistência absoluta em escritas simultâneas seguidas de fechamento. `saved` informa a última confirmação disponível, não um bloqueio contra escritas futuras.

## Validação e limites

Executar `npm run validate:progress-storage`, além de todos os validadores anteriores, lint, build e `git diff --check`.

Os testes usam Storage em memória e a mesma coordenação consumida pelo Provider: primeiro acesso, documentos inválidos, exceções, duplicação, recarga, pendências, recuperação, retroatividade, merge, conflitos e estabilização das gravações. A renderização React em servidor verifica que Provider e consumidores não acessam Storage antes dos efeitos.

Não foram instaladas dependências. O teste SSR não monta o ciclo de vida React em um navegador. Permanecem pendentes:

- Verificar hidratação e cleanup sob StrictMode em navegador real.
- Abrir duas abas e concluir comandos concorrentes, observando eventos `storage`, convergência e ausência de gravações em loop.
- Bloquear armazenamento, aplicar uma conclusão e restabelecer acesso antes de chamar `retrySave()`.
- Recarregar depois de salvar e confirmar recuperação de XP, conquistas e IDs processados.
- Confirmar que documentos corrompidos/incompatíveis permanecem intactos e que as rotas existentes continuam funcionando.

Pendências em memória podem ser perdidas ao fechar ou recarregar antes de uma gravação bem-sucedida. A leitura e validação completa do registro de tentativas têm custo crescente; limites e compactação exigirão política explícita futura. Não há servidor, sincronização remota ou migrações hipotéticas nesta etapa.

## Etapa 05 — conclusão do quiz integrada

### Identidade e snapshot

`createQuizAttempt(missionId, attemptId)` agora exige um ID externo. O hook cria esse ID antes de inicializar o reducer; seleção e navegação o preservam. `restart` exige outro ID. `finish` recebe `completedAt` externo em ISO UTC canônico, sem acessar relógio no reducer. O snapshot congelado contém `{ missionId, attemptId, completedAt, answers }`.

`createAttemptId`, em `src/utils/attemptMetadata.js`, prefere `crypto.randomUUID()`. O fallback produz UUID v4 com 16 bytes de `crypto.getRandomValues()`, sem `Math.random` ou IDs baseados em horário. Sem ambas as fontes, a tentativa é recusada com mensagem amigável. A fonte criptográfica não é acessada ao importar módulos. Inicializadores podem ser repetidos pelo StrictMode; IDs de inicializações descartadas não representam conclusões nem concedem recompensas.

### Fronteira única e leitura dos resultados

`QuizSession` continua entregando o snapshot apenas ao `QuizResultProvider`. O coordenador `src/services/quizCompletionStore.js`, utilizado pelo Provider e pelos testes, valida missão e metadados, chama `getCompletedResult` e reutiliza sua avaliação para construir `{ missionId, attemptId, evaluation, completedAt }`. Não implementa outra correção.

A avaliação e uma cópia protegida do snapshot permanecem disponíveis em memória para Resultados e Revisão, mesmo quando o progresso falha. Os objetos originais do catálogo não são congelados nem modificados. A composição dos Providers não mudou.

`completeAttempt(attempt)` mantém o retorno booleano: `true` significa que o resultado pedagógico válido foi preservado, não que o progresso foi salvo. `false` indica snapshot inválido; o quiz apresenta a mensagem de erro em vez de ficar indefinidamente preparando resultados.

O Context também expõe `completion`, `delivery`, `deliveryMessage` e `retryDelivery()`. A entrega distingue espera pela hidratação, aplicação salva, aplicação somente em memória e erro antes da aplicação. O resultado do comando contém XP adicional e novos desbloqueios para uso futuro; não há apresentação desses indicadores nesta etapa.

### Pendências e idempotência

Antes da hidratação, o comando do ProgressProvider continua rejeitando recuperavelmente com `PROGRESS_NOT_HYDRATED`. O coordenador da conclusão preserva o evento e o reenvia quando `isHydrated` passa a verdadeiro. Limpar a tela ou iniciar outra missão não remove essas entregas pendentes.

Depois de o comando aceitar a conclusão em memória, o coordenador deixa a recuperação de gravação a cargo do ProgressProvider. `retryDelivery()` chama `retrySave()` nesse caso; não reenvia a conclusão. Resultados e Revisão somente consultam o estado, com mensagens explícitas para falhas, corrupção e incompatibilidade. Nenhum documento inválido é apagado ou substituído automaticamente.

Um cache transitório de IDs e assinaturas evita entregas repetidas por efeitos ou chamadas duplicadas. Não substitui a proteção definitiva: uma nova instância do coordenador ainda envia o evento ao domínio, cujo registro de `processedAttempts` impede nova recompensa. IDs conflitantes mantêm o código `ATTEMPT_CONFLICT`, sem eliminar a revisão pedagógica ou sobrescrever os registros existentes. Não há geração de metadados, persistência ou concessão de XP em renderizações, reducers ou funções atualizadoras React.

Recarregar recupera o progresso salvo, mas não reconstrói a tela pedagógica da tentativa: Resultados e Revisão continuam dependendo do snapshot temporário. A hidratação pode reconhecer conquistas retroativas, mas não concede XP por abrir uma rota. O contrato persistido permanece na versão 1, sem migrações ou campos adicionais.

### Testes e verificações pendentes

`npm run validate:quiz-progress` cobre geração e fallback de IDs, estabilidade e reinício, data externa, snapshots congelados, conclusões com zero/100%, melhorias e resultados inferiores, espera por hidratação, cache de duplicações, remontagem do coordenador, falhas de leitura/escrita, corrupção, incompatibilidade, conflitos e preservação do resultado. A navegação pelas rotas reais é exercitada com roteador em memória e renderização React, verificando ausência de chamadas de premiação durante leitura/revisão/histórico. Também há renderização dos diagnósticos e do caso sem fonte criptográfica.

Os validadores anteriores foram adaptados para fornecer metadados determinísticos às transições puras. O motor de correção e as 40 questões não foram modificados. Nenhuma biblioteca foi instalada.

Os testes do coordenador chamam explicitamente a retomada pós-hidratação. Eles não simulam montagem de efeitos no DOM, cliques, teclado ou StrictMode em navegador. Permanecem manuais:

- Concluir o quiz sob StrictMode e confirmar um único registro/XP no armazenamento.
- Percorrer Resultados → Revisão → Resultados, usar o histórico e confirmar ausência de recompensas adicionais.
- Reiniciar e conferir novo ID, primeira questão, respostas vazias e reconhecimento apenas da melhoria.
- Bloquear escrita, concluir, revisar respostas e retentar salvamento após restabelecer acesso.
- Recarregar após sucesso e conferir progresso recuperado sem repetir premiação; Resultados sem snapshot deve orientar uma nova missão.
- Exercitar duas abas e as limitações de concorrência já descritas.
