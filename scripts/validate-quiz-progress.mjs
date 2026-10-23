import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { createServer } from 'vite';

import { createAttemptId } from '../src/utils/attemptMetadata.js';
import { createQuizAttempt, updateQuizAttempt } from '../src/utils/quizAttempt.js';
import { getQuestionsByMission, questions } from '../src/data/questions.js';
import { getTotalXp } from '../src/utils/progress.js';
import { createProgressStorage, PROGRESS_STORAGE_KEY } from '../src/services/progressStorage.js';
import { createProgressStore } from '../src/services/progressStore.js';
import { createQuizCompletionStore, getCompletionDeliveryMessage, getCompletionDeliveryState } from '../src/services/quizCompletionStore.js';

const originalQuestions = JSON.stringify(questions);
const date = '2026-10-22T12:00:00.000Z';
const now = () => '2026-10-24T12:00:00.000Z';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const generated = Array.from({ length: 100 }, () => createAttemptId());
assert.equal(new Set(generated).size, generated.length);
generated.forEach((id) => assert.match(id, uuidPattern));
const fallbackRandom = { getRandomValues(bytes) { bytes.forEach((_, index) => { bytes[index] = index; }); return bytes; } };
assert.equal(createAttemptId(fallbackRandom), '00010203-0405-4607-8809-0a0b0c0d0e0f');
assert.match(createAttemptId({ ...fallbackRandom, randomUUID() { throw new Error('indisponível'); } }), uuidPattern);
assert.throws(() => createAttemptId(null), { code: 'SECURE_RANDOM_UNAVAILABLE' });
assert.throws(() => createQuizAttempt('mission-01'), TypeError);

function finishQuiz(missionId, correctCount, attemptId = createAttemptId(), completedAt = date) {
  const list = getQuestionsByMission(missionId);
  let attempt = createQuizAttempt(missionId, attemptId);
  for (const [index, question] of list.entries()) {
    const optionId = index < correctCount ? question.correctOptionId : question.options.find(({ id }) => id !== question.correctOptionId).id;
    const previous = attempt;
    attempt = updateQuizAttempt(attempt, { type: 'select', optionId }, list);
    assert.equal(attempt.attemptId, attemptId);
    assert.notEqual(previous.answers, attempt.answers);
    attempt = updateQuizAttempt(attempt, { type: 'next' }, list);
    assert.equal(attempt.attemptId, attemptId);
  }
  assert.throws(() => updateQuizAttempt(attempt, { type: 'finish' }, list), TypeError);
  attempt = updateQuizAttempt(attempt, { type: 'finish', completedAt }, list);
  assert.equal(attempt.completion.attemptId, attemptId);
  assert.equal(attempt.completion.completedAt, completedAt);
  assert.ok(Object.isFrozen(attempt.completion));
  assert.ok(Object.isFrozen(attempt.completion.answers));
  assert.equal(updateQuizAttempt(attempt, { type: 'finish', completedAt: now() }, list), attempt);
  assert.equal(updateQuizAttempt(attempt, { type: 'select', optionId: 'a' }, list), attempt);
  return attempt;
}

class MemoryStorage {
  constructor(raw = null) { this.raw = raw; this.writes = 0; this.failWrite = false; this.failRead = false; }
  getItem(key) { assert.equal(key, PROGRESS_STORAGE_KEY); if (this.failRead) throw new Error('Leitura bloqueada'); return this.raw; }
  setItem(key, value) { assert.equal(key, PROGRESS_STORAGE_KEY); if (this.failWrite) throw new Error('Gravação bloqueada'); this.raw = value; this.writes += 1; }
}

function setup(memory = new MemoryStorage()) {
  const progress = createProgressStore({ storage: createProgressStorage(memory), now });
  let calls = 0;
  const completion = createQuizCompletionStore({
    processCompletedAttempt: (event) => { calls += 1; return progress.processCompletedAttempt(event); },
    retrySave: progress.retrySave,
  });
  return { memory, progress, completion, calls: () => calls,
    delivery: () => getCompletionDeliveryState(completion.getSnapshot().delivery, progress.getSnapshot()) };
}

const attempt = finishQuiz('mission-01', 0);
const restartedId = createAttemptId();
const restarted = updateQuizAttempt(attempt, { type: 'restart', attemptId: restartedId }, getQuestionsByMission('mission-01'));
assert.notEqual(restarted.attemptId, attempt.attemptId);
assert.equal(restarted.attemptId, restartedId);
assert.equal(restarted.currentIndex, 0);
assert.equal(restarted.completion, null);
assert.deepEqual(restarted.answers, {});
assert.throws(() => updateQuizAttempt(attempt, { type: 'restart', attemptId: attempt.attemptId }, getQuestionsByMission('mission-01')), TypeError);

// Conclusão preservada antes da hidratação; efeitos repetidos não duplicam entrega.
const queued = setup();
assert.equal(queued.completion.completeAttempt(attempt), true);
assert.equal(queued.delivery().status, 'waiting-hydration');
assert.equal(queued.completion.getSnapshot().result.status, 'ready');
assert.equal(queued.calls(), 1);
const waitingSnapshot = queued.completion.getSnapshot();
assert.equal(queued.completion.completeAttempt(structuredClone(attempt)), true);
assert.equal(queued.completion.getSnapshot(), waitingSnapshot);
assert.equal(queued.calls(), 1);
assert.equal(queued.memory.writes, 0);
queued.progress.hydrate();
queued.completion.retryPending();
queued.completion.retryPending();
assert.equal(queued.calls(), 2);
assert.equal(queued.delivery().saved, true);
assert.equal(getTotalXp(queued.progress.getSnapshot().progress), 0);
assert.ok(queued.progress.getSnapshot().progress.unlockedAchievements['first-steps']);
assert.equal(queued.completion.getSnapshot().result.evaluation.correctCount, 0);
assert.equal(queued.completion.getSnapshot().completion.attemptId, attempt.attemptId);

const perfect = finishQuiz('mission-01', 5);
assert.equal(queued.completion.completeAttempt(perfect), true);
assert.equal(queued.delivery().xpDelta, 100);
assert.ok(queued.delivery().newAchievements.includes('perfect-score'));
const perfectSnapshot = queued.completion.getSnapshot();
const callsBeforeRepeat = queued.calls();
const writesBeforeRepeat = queued.memory.writes;
for (let index = 0; index < 5; index += 1) {
  assert.equal(queued.completion.completeAttempt(structuredClone(perfect)), true);
  assert.equal(queued.completion.getSnapshot(), perfectSnapshot);
}
assert.equal(queued.calls(), callsBeforeRepeat);
assert.equal(queued.memory.writes, writesBeforeRepeat);
assert.equal(getTotalXp(queued.progress.getSnapshot().progress), 100);

queued.completion.clearResult();
assert.equal(queued.completion.getSnapshot().result.status, 'empty');
assert.equal(getTotalXp(queued.progress.getSnapshot().progress), 100);
queued.completion.completeAttempt(finishQuiz('mission-01', 2));
assert.equal(queued.delivery().xpDelta, 0);
queued.completion.completeAttempt(finishQuiz('mission-02', 1));
assert.equal(queued.delivery().xpDelta, 30);
queued.completion.completeAttempt(finishQuiz('mission-02', 4));
assert.equal(queued.delivery().xpDelta, 90);
assert.equal(getTotalXp(queued.progress.getSnapshot().progress), 220);

// Cache novo/remontagem: o registro persistido continua sendo a defesa definitiva.
const fresh = setup(queued.memory);
fresh.progress.hydrate();
fresh.completion.completeAttempt(perfect);
assert.equal(fresh.delivery().processingStatus, 'duplicate');
assert.equal(fresh.delivery().xpDelta, 0);
assert.equal(getTotalXp(fresh.progress.getSnapshot().progress), 220);
const conflict = finishQuiz('mission-01', 1, perfect.attemptId);
fresh.completion.completeAttempt(conflict);
assert.equal(fresh.delivery().error.code, 'ATTEMPT_CONFLICT');
assert.equal(fresh.completion.getSnapshot().result.status, 'ready');
assert.equal(getTotalXp(fresh.progress.getSnapshot().progress), 220);
const persistedConflict = setup(queued.memory);
persistedConflict.progress.hydrate();
persistedConflict.completion.completeAttempt(conflict);
assert.equal(persistedConflict.delivery().error.code, 'ATTEMPT_CONFLICT');
assert.equal(persistedConflict.completion.getSnapshot().result.evaluation.correctCount, 1);

const invalid = setup();
invalid.progress.hydrate();
for (const candidate of [
  {}, { missionId: 'mission-99', completion: perfect.completion },
  { ...perfect, completion: { ...perfect.completion, attemptId: '' } },
  { ...perfect, completion: { ...perfect.completion, completedAt: 'ontem' } },
  { ...perfect, completion: { ...perfect.completion, answers: {} } },
  { ...perfect, attemptId: 'different' },
]) {
  assert.equal(invalid.completion.completeAttempt(candidate), false);
  assert.equal(invalid.completion.getSnapshot().result.status, 'invalid');
}
assert.equal(invalid.calls(), 0);
assert.equal(invalid.memory.writes, 0);
const invalidChoice = { id: 'a' };
assert.equal(invalid.completion.completeAttempt({ ...perfect, completion: { ...perfect.completion, answers: { ...perfect.answers, q01: invalidChoice } } }), false);
assert.equal(Object.isFrozen(invalidChoice), false);

const failed = setup();
failed.progress.hydrate();
failed.memory.failWrite = true;
failed.completion.completeAttempt(perfect);
assert.equal(failed.delivery().saved, false);
assert.equal(failed.delivery().accepted, true);
assert.equal(failed.completion.getSnapshot().result.status, 'ready');
assert.ok(getCompletionDeliveryMessage(failed.delivery()).includes('memória'));
assert.equal(getTotalXp(failed.progress.getSnapshot().progress), 100);
assert.deepEqual(failed.progress.getSnapshot().pendingAttemptIds, [perfect.attemptId]);
failed.memory.failWrite = false;
const callsBeforeRetry = failed.calls();
assert.equal(failed.completion.retryDelivery().saved, true);
assert.equal(failed.calls(), callsBeforeRetry); // Retenta gravação, não a conclusão.
assert.equal(failed.delivery().saved, true);
assert.equal(getCompletionDeliveryMessage(failed.delivery()), null);
const changedStorage = failed.memory.raw;
failed.memory.raw = '{corrupted after confirmation';
failed.progress.reconcile();
assert.equal(failed.delivery().saved, false);
assert.ok(getCompletionDeliveryMessage(failed.delivery()).includes('corrompidos'));
failed.memory.raw = changedStorage;
failed.completion.retryDelivery();
assert.equal(failed.delivery().saved, true);

for (const raw of ['{invalid', JSON.stringify({ schemaVersion: 2, rulesVersion: 1 })]) {
  const broken = setup(new MemoryStorage(raw));
  broken.progress.hydrate();
  broken.completion.completeAttempt(perfect);
  assert.equal(broken.delivery().saved, false);
  assert.equal(broken.delivery().accepted, true);
  assert.ok(getCompletionDeliveryMessage(broken.delivery()));
  assert.equal(broken.completion.getSnapshot().result.status, 'ready');
  assert.equal(broken.memory.raw, raw);
  assert.equal(broken.memory.writes, 0);
}
const unavailable = setup();
unavailable.memory.failRead = true;
unavailable.progress.hydrate();
unavailable.completion.completeAttempt(perfect);
assert.equal(unavailable.delivery().saved, false);
assert.equal(unavailable.completion.getSnapshot().result.status, 'ready');

// Limpar a tela não elimina uma entrega que aguarda hidratação.
const pending = setup();
pending.completion.completeAttempt(perfect);
pending.completion.clearResult();
pending.progress.hydrate();
pending.completion.retryPending();
assert.equal(getTotalXp(pending.progress.getSnapshot().progress), 100);
assert.equal(pending.completion.getSnapshot().result.status, 'empty');

// Rotas reais em memória: renderizar/navegar consulta dados sem processar eventos.
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { AppRoutes } = await server.ssrLoadModule('/src/routes/AppRouter.jsx');
  const { QuizResultContext } = await server.ssrLoadModule('/src/context/QuizResultContext.js');
  const { ProgressProvider } = await server.ssrLoadModule('/src/context/ProgressProvider.jsx');
  const { QuizResultProvider } = await server.ssrLoadModule('/src/context/QuizResultProvider.jsx');
  const router = createMemoryRouter([{ path: '*', element: createElement(AppRoutes) }], { initialEntries: ['/resultados/mission-01'] });
  try {
    const calls = fresh.calls();
    const writes = fresh.memory.writes;
    const render = (source = fresh) => renderToStaticMarkup(createElement(ProgressProvider, null, createElement(QuizResultContext.Provider, { value: {
      ...source.completion.getSnapshot(), delivery: source.delivery(), clearResult: source.completion.clearResult, completeAttempt: source.completion.completeAttempt,
      deliveryMessage: getCompletionDeliveryMessage(source.delivery()), retryDelivery: source.completion.retryDelivery,
    } }, createElement(RouterProvider, { router }))));
    for (const path of ['/resultados/mission-01', '/resultados/mission-01/revisao', '/resultados/mission-01', '/missoes', '/resultados/mission-01/revisao']) {
      await router.navigate(path);
      const html = render();
      if (path.endsWith('/revisao')) {
        assert.ok(html.includes('Sua resposta'));
        assert.ok(!html.includes('type="radio"'));
      } else if (path.includes('/resultados')) assert.ok(html.includes('Seu desempenho'));
    }
    await router.navigate(-1);
    render();
    await router.navigate(1);
    render();
    assert.equal(fresh.calls(), calls);
    assert.equal(fresh.memory.writes, writes);

    const errorView = setup();
    errorView.progress.hydrate();
    errorView.memory.failWrite = true;
    errorView.completion.completeAttempt(perfect);
    await router.navigate('/resultados/mission-01');
    const errorHtml = render(errorView);
    assert.ok(errorHtml.includes('role="status"'));
    assert.ok(errorHtml.includes('aplicado em memória'));
    assert.ok(errorHtml.includes('Tentar salvar novamente'));
    assert.ok(errorHtml.includes('Seu desempenho'));
    const cold = setup(fresh.memory);
    cold.progress.hydrate();
    const coldWrites = cold.memory.writes;
    assert.ok(render(cold).includes('Resultado indisponível'));
    assert.equal(cold.calls(), 0);
    assert.equal(cold.memory.writes, coldWrites);
  } finally { router.dispose(); }

  const ssrMemory = new MemoryStorage();
  const html = renderToStaticMarkup(createElement(ProgressProvider, { storage: createProgressStorage(ssrMemory), now },
    createElement(QuizResultProvider, null, createElement('p', null, 'Providers integrados'))));
  assert.ok(html.includes('Providers integrados'));
  assert.equal(ssrMemory.writes, 0);

  const cryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  const noCryptoRouter = createMemoryRouter([{ path: '*', element: createElement(AppRoutes) }], { initialEntries: ['/quiz/mission-01'] });
  try {
    Object.defineProperty(globalThis, 'crypto', { configurable: true, value: {} });
    const unsupportedHtml = renderToStaticMarkup(createElement(ProgressProvider, { storage: createProgressStorage(ssrMemory), now },
      createElement(QuizResultProvider, null, createElement(RouterProvider, { router: noCryptoRouter }))));
    assert.ok(unsupportedHtml.includes('Não foi possível iniciar a missão'));
    assert.ok(unsupportedHtml.includes('role="alert"'));
    assert.equal(ssrMemory.writes, 0);
  } finally {
    if (cryptoDescriptor) Object.defineProperty(globalThis, 'crypto', cryptoDescriptor);
    else Reflect.deleteProperty(globalThis, 'crypto');
    noCryptoRouter.dispose();
  }
} finally { await server.close(); }
assert.equal(JSON.stringify(questions), originalQuestions);
console.log('Integração validada: IDs seguros e estáveis, snapshots, reinício, entrega, hidratação pendente, idempotência, melhorias, falhas, conflitos e navegação sem premiação.');
