import assert from 'node:assert/strict';

import { getQuestionsByMission, questions } from '../src/data/questions.js';
import { evaluateAttempt } from '../src/utils/quizEvaluation.js';
import { applyCompletedAttempt, createInitialProgress, getTotalXp, mergeProgress } from '../src/utils/progress.js';
import { validateProgress } from '../src/utils/progressValidation.js';
import { createProgressStorage, PROGRESS_STORAGE_KEY } from '../src/services/progressStorage.js';
import { createProgressStore } from '../src/services/progressStore.js';

const originalQuestions = JSON.stringify(questions);
const date = '2026-10-22T12:00:00.000Z';
const now = () => '2026-10-24T12:00:00.000Z';

function eventFor(missionId, attemptId, correctCount, completedAt = date) {
  const list = getQuestionsByMission(missionId);
  const answers = Object.fromEntries(list.map((question, index) => [question.id,
    index < correctCount ? question.correctOptionId : question.options.find(({ id }) => id !== question.correctOptionId).id,
  ]));
  return { missionId, attemptId, completedAt,
    evaluation: evaluateAttempt({ missionId, completion: { missionId, answers } }, list) };
}

class MemoryStorage {
  constructor(raw = null) { this.raw = raw; this.writes = 0; this.reads = 0; this.failRead = false; this.failWrite = false; }
  getItem(key) {
    assert.equal(key, PROGRESS_STORAGE_KEY);
    this.reads += 1;
    if (this.failRead) throw new Error('Leitura bloqueada');
    return this.raw;
  }
  setItem(key, value) {
    assert.equal(key, PROGRESS_STORAGE_KEY);
    if (this.failWrite) throw new Error('Gravação bloqueada');
    this.writes += 1;
    this.raw = value;
  }
}

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

const empty = freeze(createInitialProgress());
const eventA = freeze(eventFor('mission-01', 'a', 2));
const eventB = freeze(eventFor('mission-02', 'b', 5));
const a = freeze(applyCompletedAttempt(empty, eventA).state);
const b = freeze(applyCompletedAttempt(empty, eventB).state);
const better = freeze(applyCompletedAttempt(empty, eventFor('mission-01', 'better', 5)).state);
const equal = freeze(applyCompletedAttempt(empty, eventFor('mission-01', 'equal', 2)).state);
const before = JSON.stringify([a, b, better, equal]);
for (const [left, right] of [[a, b], [a, better], [a, equal], [a, empty]]) {
  const merged = mergeProgress(left, right);
  assert.deepEqual(merged, mergeProgress(right, left));
  assert.deepEqual(mergeProgress(merged, merged), merged);
  assert.deepEqual(mergeProgress(left, structuredClone(left)), left);
  assert.equal(validateProgress(merged).status, 'valid');
}
assert.deepEqual(mergeProgress(mergeProgress(a, b), better), mergeProgress(a, mergeProgress(b, better)));
assert.equal(getTotalXp(mergeProgress(a, b)), 190);
assert.equal(getTotalXp(mergeProgress(a, better)), 100);
assert.equal(Object.keys(mergeProgress(a, b).processedAttempts).length, 2);
assert.ok(mergeProgress(a, b).unlockedAchievements['perfect-score']);
assert.equal(JSON.stringify([a, b, better, equal]), before);
const conflict = applyCompletedAttempt(empty, eventFor('mission-01', 'a', 3)).state;
assert.throws(() => mergeProgress(a, conflict), { code: 'ATTEMPT_CONFLICT' });
assert.throws(() => mergeProgress(conflict, a), { code: 'ATTEMPT_CONFLICT' });

const memory = new MemoryStorage();
const adapter = createProgressStorage(memory);
assert.equal(memory.reads, 0);
assert.equal(adapter.read().status, 'empty');
assert.equal(adapter.write(a).status, 'saved');
assert.deepEqual(adapter.read(), { status: 'loaded', state: a });
assert.equal(adapter.write({}).status, 'invalid-state');
assert.equal(memory.writes, 1);
for (const [raw, status] of [
  ['{broken', 'corrupted'], ['[]', 'corrupted'], ['null', 'corrupted'],
  [JSON.stringify({ ...empty, missions: [] }), 'corrupted'],
  [JSON.stringify({ ...empty, schemaVersion: 2 }), 'incompatible'],
  [JSON.stringify({ ...empty, rulesVersion: 2 }), 'incompatible'],
]) {
  const storage = new MemoryStorage(raw);
  const api = createProgressStorage(storage);
  assert.equal(api.read().status, status);
  assert.equal(api.write(a).status, status);
  assert.equal(storage.raw, raw);
  assert.equal(storage.writes, 0);
  const store = createProgressStore({ storage: api, now });
  store.hydrate();
  assert.equal(store.getSnapshot().hydrationStatus, 'ready');
  assert.equal(store.getSnapshot().persistenceStatus, status === 'incompatible' ? 'incompatible' : 'error');
  const applied = store.processCompletedAttempt(eventA);
  assert.equal(applied.accepted, true);
  assert.equal(applied.saved, false);
  assert.equal(getTotalXp(store.getSnapshot().progress), 40);
  assert.deepEqual(store.getSnapshot().pendingAttemptIds, ['a']);
  assert.equal(storage.raw, raw);
  assert.equal(storage.writes, 0);
}

const blocked = new MemoryStorage();
blocked.failRead = true;
assert.equal(createProgressStorage(blocked).read().status, 'unavailable');
assert.equal(createProgressStorage(blocked).write(a).status, 'unavailable');
blocked.failRead = false;
blocked.failWrite = true;
assert.equal(createProgressStorage(blocked).write(a).status, 'unavailable');
assert.equal(blocked.raw, null);
assert.equal(createProgressStorage().read().status, 'unavailable');
// Inclusive o getter localStorage pode lançar SecurityError; a fábrica é inerte.
let getterReads = 0;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
try {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    get localStorage() { getterReads += 1; throw new Error('SecurityError'); },
  } });
  const inaccessible = createProgressStorage();
  assert.equal(getterReads, 0);
  assert.equal(inaccessible.read().status, 'unavailable');
  assert.equal(getterReads, 1);
} finally {
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
}

// Construção e comandos precoces não fazem I/O nem perdem eventos silenciosamente.
const firstStorage = new MemoryStorage();
const first = createProgressStore({ storage: createProgressStorage(firstStorage), now });
assert.equal(firstStorage.reads, 0);
assert.equal(firstStorage.writes, 0);
assert.equal(first.getSnapshot().hydrationStatus, 'loading');
assert.deepEqual(first.processCompletedAttempt(eventA), { accepted: false, status: 'not-ready', code: 'PROGRESS_NOT_HYDRATED', saved: false });
assert.equal(firstStorage.reads, 0);
first.hydrate();
assert.equal(firstStorage.writes, 0);
assert.equal(first.getSnapshot().persistenceStatus, 'unsaved');
assert.equal(first.getSnapshot().hasPendingChanges, false);
const hydrated = first.getSnapshot();
first.hydrate();
assert.equal(first.getSnapshot(), hydrated);
let notifications = 0;
const unsubscribe = first.subscribe(() => { notifications += 1; });
const completed = first.processCompletedAttempt(eventA);
assert.equal(completed.saved, true);
assert.equal(completed.xpDelta, 40);
assert.deepEqual(completed.newAchievements, ['first-steps']);
assert.equal(first.getSnapshot().hasPendingChanges, false);
assert.deepEqual(first.getSnapshot().pendingAttemptIds, []);
assert.ok(notifications > 0);
unsubscribe();
const writesBeforeRepeat = firstStorage.writes;
const repeated = first.processCompletedAttempt(structuredClone(eventA));
assert.equal(repeated.status, 'duplicate');
assert.equal(repeated.xpDelta, 0);
assert.equal(repeated.saved, true);
assert.equal(firstStorage.writes, writesBeforeRepeat);
const beforeInvalidEvent = first.getSnapshot();
const forged = eventFor('mission-01', 'forged', 5);
const incorrectOption = getQuestionsByMission('mission-01')[0].options.find(({ id }) => id !== getQuestionsByMission('mission-01')[0].correctOptionId);
forged.evaluation.evaluations[0].selectedOption = { ...incorrectOption };
forged.evaluation.evaluations[0].correctOption = { ...incorrectOption };
assert.throws(() => first.processCompletedAttempt(forged), TypeError);
assert.equal(first.getSnapshot(), beforeInvalidEvent);
assert.equal(firstStorage.writes, writesBeforeRepeat);
assert.throws(() => first.processCompletedAttempt(eventFor('mission-01', 'a', 5)), { code: 'ATTEMPT_CONFLICT' });
assert.equal(getTotalXp(first.getSnapshot().progress), 40);
const reloaded = createProgressStore({ storage: createProgressStorage(firstStorage), now });
reloaded.hydrate();
assert.equal(reloaded.getSnapshot().persistenceStatus, 'saved');
assert.equal(getTotalXp(reloaded.getSnapshot().progress), 40);
assert.equal(reloaded.processCompletedAttempt(eventA).status, 'duplicate');
assert.equal(firstStorage.writes, writesBeforeRepeat);

// Falhas mantêm o snapshot completo e IDs pendentes, inclusive após sincronização.
const failedStorage = new MemoryStorage();
const failed = createProgressStore({ storage: createProgressStorage(failedStorage), now });
failed.hydrate();
failedStorage.failWrite = true;
const unsaved = failed.processCompletedAttempt(eventA);
assert.equal(unsaved.saved, false);
assert.equal(unsaved.persistenceStatus, 'error');
assert.equal(failed.getSnapshot().hasPendingChanges, true);
assert.deepEqual(failed.getSnapshot().pendingAttemptIds, ['a']);
assert.equal(failedStorage.raw, null);
failedStorage.raw = JSON.stringify(b);
failed.reconcile();
assert.equal(getTotalXp(failed.getSnapshot().progress), 190);
assert.deepEqual(failed.getSnapshot().pendingAttemptIds, ['a']);
assert.equal(failed.getSnapshot().hasPendingChanges, true);
failedStorage.failWrite = false;
assert.equal(failed.retrySave().saved, true);
assert.equal(getTotalXp(createProgressStorage(failedStorage).read().state), 190);
assert.deepEqual(failed.getSnapshot().pendingAttemptIds, []);
assert.equal(failed.getSnapshot().hasPendingChanges, false);

// Armazenamento inicialmente ilegível não deve apagar o progresso recuperável.
const unreadableStorage = new MemoryStorage(JSON.stringify(b));
unreadableStorage.failRead = true;
const unreadable = createProgressStore({ storage: createProgressStorage(unreadableStorage), now });
unreadable.hydrate();
assert.equal(unreadable.processCompletedAttempt(eventA).saved, false);
unreadableStorage.failRead = false;
assert.equal(unreadable.retrySave().saved, true);
assert.equal(getTotalXp(unreadable.getSnapshot().progress), 190);

const retroDocument = { ...b, unlockedAchievements: {} };
const retroStorage = new MemoryStorage(JSON.stringify(retroDocument));
const retro = createProgressStore({ storage: createProgressStorage(retroStorage), now });
retro.hydrate();
assert.equal(retroStorage.writes, 1);

const retroBlockedStorage = new MemoryStorage(JSON.stringify(retroDocument));
retroBlockedStorage.failWrite = true;
const retroBlocked = createProgressStore({ storage: createProgressStorage(retroBlockedStorage), now });
retroBlocked.hydrate();
assert.equal(retroBlocked.getSnapshot().persistenceStatus, 'error');
assert.equal(retroBlocked.getSnapshot().hasPendingChanges, true);
assert.ok(retroBlocked.getSnapshot().progress.unlockedAchievements['perfect-score']);
assert.equal(retroBlockedStorage.raw, JSON.stringify(retroDocument));
retroBlockedStorage.failWrite = false;
assert.equal(retroBlocked.retrySave().saved, true);
assert.equal(retroBlocked.getSnapshot().hasPendingChanges, false);
assert.equal(retro.getSnapshot().progress.unlockedAchievements['perfect-score'].unlockedAt, now());
assert.equal(getTotalXp(retro.getSnapshot().progress), 150);
retro.hydrate();
retro.reconcile();
assert.equal(retroStorage.writes, 1);

// Duas instâncias usam o mesmo Storage; reconciliação é explícita neste teste.
const sharedStorage = new MemoryStorage();
const tabA = createProgressStore({ storage: createProgressStorage(sharedStorage), now });
const tabB = createProgressStore({ storage: createProgressStorage(sharedStorage), now });
tabA.hydrate();
tabB.hydrate();
tabA.processCompletedAttempt(eventA);
assert.equal(tabB.processCompletedAttempt(eventA).status, 'duplicate');
tabB.processCompletedAttempt(eventB);
tabA.reconcile();
tabB.reconcile();
assert.deepEqual(tabA.getSnapshot().progress, tabB.getSnapshot().progress);
assert.equal(getTotalXp(tabA.getSnapshot().progress), 190);
const stableWrites = sharedStorage.writes;
for (let index = 0; index < 4; index += 1) { tabA.reconcile(); tabB.reconcile(); }
assert.equal(sharedStorage.writes, stableWrites);
tabB.processCompletedAttempt(eventFor('mission-01', 'tab-improvement', 5));
tabA.reconcile();
assert.equal(getTotalXp(tabA.getSnapshot().progress), 250);
assert.equal(Object.keys(tabA.getSnapshot().progress.processedAttempts).length, 3);
assert.ok(tabA.getSnapshot().progress.unlockedAchievements['perfect-score']);

const conflictingStorage = new MemoryStorage(JSON.stringify(a));
const conflicted = createProgressStore({ storage: createProgressStorage(conflictingStorage), now });
conflicted.hydrate();
conflictingStorage.raw = JSON.stringify(conflict);
const conflictBefore = conflictingStorage.raw;
assert.equal(conflicted.reconcile().saved, false);
assert.equal(conflicted.getSnapshot().error.code, 'ATTEMPT_CONFLICT');
assert.equal(getTotalXp(conflicted.getSnapshot().progress), 40);
assert.equal(conflictingStorage.raw, conflictBefore);
assert.throws(() => conflicted.processCompletedAttempt(eventB), { code: 'ATTEMPT_CONFLICT' });

// SSR não deve acessar Storage: o estado inicial continua loading até o efeito.
const { createServer } = await import('vite');
const { createElement } = await import('react');
const { renderToStaticMarkup } = await import('react-dom/server');
const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { ProgressProvider } = await server.ssrLoadModule('/src/context/ProgressProvider.jsx');
  const { useProgress } = await server.ssrLoadModule('/src/context/ProgressContext.js');
  const ssrStorage = new MemoryStorage();
  function Consumer() {
    const context = useProgress();
    return createElement('p', null, `${context.isHydrated}:${context.persistenceStatus}:${context.levelProgress.level}`);
  }
  const html = renderToStaticMarkup(createElement(ProgressProvider, { storage: createProgressStorage(ssrStorage), now }, createElement(Consumer)));
  assert.ok(html.includes('false:loading:1'));
  assert.equal(ssrStorage.reads, 0);
  assert.equal(ssrStorage.writes, 0);
} finally {
  await server.close();
}
assert.equal(JSON.stringify(questions), originalQuestions);
console.log('Armazenamento e coordenação validados: hidratação, proteção de documentos, falhas, repetição, recarga, retroatividade, mesclagem, pendências, conflitos, ausência de loops e SSR sem I/O.');
