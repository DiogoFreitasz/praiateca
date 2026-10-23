import assert from 'node:assert/strict';

import { achievements, getEligibleAchievements, MASTER_MISSION_IDS_V1 } from '../src/data/achievements.js';
import { missions } from '../src/data/missions.js';
import { subjects } from '../src/data/subjects.js';
import { questions, getQuestionsByMission } from '../src/data/questions.js';
import { evaluateAttempt } from '../src/utils/quizEvaluation.js';
import { applyCompletedAttempt, createInitialProgress, getTotalXp, recognizeAchievements } from '../src/utils/progress.js';
import { validateProgress } from '../src/utils/progressValidation.js';

const originalCatalog = JSON.stringify({ missions, subjects, questions });
const date = '2026-10-22T12:00:00.000Z';
const later = '2026-10-23T12:00:00.000Z';

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function eventFor(missionId, attemptId, correctCount, completedAt = date) {
  const missionQuestions = getQuestionsByMission(missionId);
  const answers = Object.fromEntries(missionQuestions.map((question, index) => [question.id,
    index < correctCount ? question.correctOptionId : question.options.find(({ id }) => id !== question.correctOptionId).id,
  ]));
  return { missionId, attemptId, completedAt,
    evaluation: evaluateAttempt({ missionId, completion: { missionId, answers } }, missionQuestions) };
}

function apply(state, event) {
  const beforeState = JSON.stringify(state);
  const beforeEvent = JSON.stringify(event);
  const outcome = applyCompletedAttempt(deepFreeze(state), deepFreeze(event));
  assert.equal(JSON.stringify(state), beforeState);
  assert.equal(JSON.stringify(event), beforeEvent);
  assert.deepEqual(validateProgress(outcome.state), { status: 'valid', valid: true, errors: [] });
  return outcome;
}

assert.deepEqual(achievements.map(({ id }) => id), ['first-steps', 'perfect-score', 'knowledge-explorer', 'praiateca-master']);
assert.ok(Object.isFrozen(achievements));
assert.ok(Object.isFrozen(MASTER_MISSION_IDS_V1));
assert.deepEqual(MASTER_MISSION_IDS_V1, Array.from({ length: 8 }, (_, index) => `mission-${String(index + 1).padStart(2, '0')}`));
for (const definition of achievements) {
  assert.equal(definition.ruleVersion, 1);
  assert.ok(definition.name && definition.description && definition.icon && definition.criterion);
  assert.ok(Object.isFrozen(definition));
}

const empty = deepFreeze(createInitialProgress());
assert.equal(empty.schemaVersion, 1);
assert.equal(empty.rulesVersion, 1);
assert.deepEqual(getEligibleAchievements(empty), []);
assert.equal(validateProgress(empty).status, 'valid');
const noRetro = recognizeAchievements(empty, later);
assert.equal(noRetro.state, empty);
assert.equal(noRetro.changed, false);
const immediatePerfect = apply(empty, eventFor('mission-02', 'immediate-perfect', 5));
assert.deepEqual(immediatePerfect.newAchievements, ['first-steps', 'perfect-score']);
assert.equal(immediatePerfect.xpDelta, 150);

const zeroEvent = eventFor('mission-01', 'zero', 0);
const zero = apply(empty, zeroEvent);
assert.deepEqual(zero.newAchievements, ['first-steps']);
assert.equal(zero.xpDelta, 0);
assert.equal(getTotalXp(zero.state), 0);
assert.deepEqual(zero.state.unlockedAchievements['first-steps'], { ruleVersion: 1, unlockedAt: date });
const duplicate = apply(zero.state, zeroEvent);
assert.equal(duplicate.state, zero.state);
assert.deepEqual(duplicate.newAchievements, []);
assert.equal(duplicate.changed, false);
assert.throws(() => applyCompletedAttempt(zero.state, eventFor('mission-01', 'zero', 5)), { code: 'ATTEMPT_CONFLICT' });

const perfect = apply(zero.state, eventFor('mission-01', 'perfect', 5, later));
assert.deepEqual(perfect.newAchievements, ['perfect-score']);
assert.equal(perfect.xpDelta, 100);
assert.equal(getTotalXp(perfect.state), 100);
assert.equal(perfect.state.unlockedAchievements['first-steps'], zero.state.unlockedAchievements['first-steps']);
const inferior = apply(perfect.state, eventFor('mission-01', 'inferior', 1, later));
assert.deepEqual(inferior.newAchievements, []);
assert.equal(inferior.xpDelta, 0);
assert.equal(inferior.state.unlockedAchievements['perfect-score'], perfect.state.unlockedAchievements['perfect-score']);

let exploration = empty;
const firstMissions = subjects.map(({ id }) => missions.find(({ subjectId }) => subjectId === id));
for (const [index, mission] of firstMissions.entries()) {
  const outcome = apply(exploration, eventFor(mission.id, `explore-${mission.id}`, 0));
  assert.equal(outcome.newAchievements.includes('knowledge-explorer'), index === subjects.length - 1);
  assert.equal(Object.hasOwn(outcome.state.unlockedAchievements, 'perfect-score'), false);
  exploration = outcome.state;
}
assert.equal(getTotalXp(exploration), 0);
assert.equal(Object.hasOwn(exploration.unlockedAchievements, 'praiateca-master'), false);

let mastered = exploration;
for (const mission of missions.filter(({ id }) => !firstMissions.some((item) => item.id === id))) {
  const outcome = apply(mastered, eventFor(mission.id, `master-${mission.id}`, 0));
  mastered = outcome.state;
}
assert.equal(Object.hasOwn(mastered.unlockedAchievements, 'praiateca-master'), true);
assert.equal(getTotalXp(mastered), 0);
assert.equal(Object.keys(mastered.unlockedAchievements).length, 3);
missions.push({ ...missions[0], id: 'mission-09' });
try {
  assert.ok(getEligibleAchievements(mastered).some(({ id }) => id === 'praiateca-master'));
  assert.equal(achievements.find(({ id }) => id === 'praiateca-master').requiredMissionIds.length, 8);
} finally {
  missions.pop();
}
const allFour = apply(mastered, eventFor('mission-02', 'master-perfect', 5, later));
assert.deepEqual(allFour.newAchievements, ['perfect-score']);
assert.equal(Object.keys(allFour.state.unlockedAchievements).length, 4);
assert.equal(getTotalXp(allFour.state), 150);

// Simula progresso válido que ainda não reconheceu os critérios elegíveis.
const awaitingRetro = deepFreeze({ ...allFour.state, unlockedAchievements: {} });
assert.equal(validateProgress(awaitingRetro).status, 'valid');
const duplicatedBeforeRetro = apply(awaitingRetro, eventFor('mission-02', 'master-perfect', 5, later));
assert.equal(duplicatedBeforeRetro.state, awaitingRetro);
assert.deepEqual(duplicatedBeforeRetro.newAchievements, []);
const beforeRetro = JSON.stringify(awaitingRetro);
const retro = recognizeAchievements(awaitingRetro, later);
assert.equal(retro.changed, true);
assert.equal(retro.newAchievements.length, 4);
assert.equal(retro.state.missions, awaitingRetro.missions);
assert.equal(retro.state.processedAttempts, awaitingRetro.processedAttempts);
assert.equal(getTotalXp(retro.state), getTotalXp(awaitingRetro));
assert.equal(retro.state.revision, awaitingRetro.revision + 1);
assert.equal(retro.state.updatedAt, later);
assert.equal(JSON.stringify(awaitingRetro), beforeRetro);
assert.equal(validateProgress(retro.state).status, 'valid');
for (const unlock of Object.values(retro.state.unlockedAchievements)) assert.equal(unlock.unlockedAt, later);
const repeatedRetro = recognizeAchievements(deepFreeze(retro.state), later);
assert.equal(repeatedRetro.state, retro.state);
assert.equal(repeatedRetro.changed, false);
assert.deepEqual(repeatedRetro.newAchievements, []);
const partlyRecognized = deepFreeze({ ...awaitingRetro, unlockedAchievements: { 'first-steps': zero.state.unlockedAchievements['first-steps'] } });
const remaining = recognizeAchievements(partlyRecognized, later);
assert.equal(remaining.state.unlockedAchievements['first-steps'], zero.state.unlockedAchievements['first-steps']);
assert.equal(remaining.newAchievements.length, 3);
assert.throws(() => recognizeAchievements(awaitingRetro, date), TypeError);
assert.throws(() => recognizeAchievements(awaitingRetro, 'inválida'), TypeError);

// Eventos fora de ordem usam a última data externa conhecida para reconhecimento.
let outOfOrder = empty;
for (const [index, mission] of firstMissions.entries()) {
  outOfOrder = apply(outOfOrder, eventFor(mission.id, `order-${index}`, 0, index === 0 ? later : date)).state;
}
assert.equal(outOfOrder.unlockedAchievements['knowledge-explorer'].unlockedAt, later);

const validDocument = JSON.parse(JSON.stringify(allFour.state));
assert.equal(validateProgress(validDocument).status, 'valid');
for (const document of [null, undefined, [], 'not-json', '{}', 123, {}, { ...empty, missions: [] }, { ...empty, processedAttempts: null }, { ...empty, unlockedAchievements: [] }]) {
  assert.equal(validateProgress(document).status, 'corrupted');
}
function checkMutation(mutate, expectedStatus = 'corrupted') {
  const document = structuredClone(validDocument);
  mutate(document);
  const before = JSON.stringify(document);
  const validation = validateProgress(deepFreeze(document));
  assert.equal(validation.status, expectedStatus, JSON.stringify(validation));
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.length > 0);
  assert.equal(JSON.stringify(document), before);
  assert.throws(() => recognizeAchievements(document, later), TypeError);
}
checkMutation((state) => { state.schemaVersion = 2; }, 'incompatible-version');
checkMutation((state) => { state.rulesVersion = 2; }, 'incompatible-version');
checkMutation((state) => { state.unlockedAchievements['first-steps'].ruleVersion = 2; }, 'incompatible-version');
checkMutation((state) => { delete state.schemaVersion; });
checkMutation((state) => { state.rulesVersion = '1'; });
checkMutation((state) => { state.revision = -1; });
checkMutation((state) => { state.revision = 0; });
checkMutation((state) => { state.revision = 1.5; });
checkMutation((state) => { state.updatedAt = 'ontem'; });
checkMutation((state) => { state.updatedAt = date; });
checkMutation((state) => { state.missions['mission-99'] = state.missions['mission-01']; });
checkMutation((state) => { delete state.missions['mission-01']; });
checkMutation((state) => { state.unlockedAchievements.unknown = { ruleVersion: 1, unlockedAt: later }; });
checkMutation((state) => { state.unlockedAchievements['perfect-score'].unlockedAt = date; });
checkMutation((state) => { state.unlockedAchievements['first-steps'].unlockedAt = '2026-02-30T12:00:00.000Z'; });
checkMutation((state) => { state.missions['mission-02'].awardedXp = 151; });
checkMutation((state) => { state.missions['mission-02'].awardedXp = 149; });
checkMutation((state) => { state.missions['mission-02'].awardedXp = -1; });
checkMutation((state) => { state.missions['mission-02'].awardedXp = 1.5; });
checkMutation((state) => { state.missions['mission-02'].bestResult.correctCount = 6; });
checkMutation((state) => { state.missions['mission-02'].bestResult.attemptId = 'missing'; });
checkMutation((state) => { state.missions['mission-02'].bestResult.attemptId = 'explore-mission-01'; });
checkMutation((state) => { state.missions['mission-02'].bestResult.totalQuestions = 4; });
checkMutation((state) => { state.missions['mission-02'].firstCompletedAt = later; });
checkMutation((state) => { state.missions['mission-02'].lastCompletedAt = date; });
checkMutation((state) => { state.processedAttempts['master-perfect'].missionId = 'mission-99'; });
checkMutation((state) => { state.processedAttempts['master-perfect'].correctCount = 4; });
checkMutation((state) => { state.processedAttempts['master-perfect'].totalQuestions = 0; });
checkMutation((state) => { state.processedAttempts['master-perfect'].completedAt = 'invalid'; });
checkMutation((state) => { delete state.processedAttempts['master-perfect']; });
checkMutation((state) => { state.processedAttempts['master-perfect'].answerSignature = 'invalid json'; });
checkMutation((state) => { state.processedAttempts['master-perfect'].answerSignature = '[]'; });
checkMutation((state) => { state.processedAttempts['master-perfect'].answerSignature = JSON.stringify(Array(5).fill(['q01', 'a'])); });
checkMutation((state) => {
  const choices = JSON.parse(state.processedAttempts['master-perfect'].answerSignature);
  choices[0][1] = 'invalida';
  state.processedAttempts['master-perfect'].answerSignature = JSON.stringify(choices);
});
const impossibleUnlock = structuredClone(zero.state);
impossibleUnlock.unlockedAchievements['perfect-score'] = { ruleVersion: 1, unlockedAt: date };
assert.equal(validateProgress(impossibleUnlock).status, 'corrupted');
assert.equal(JSON.stringify({ missions, subjects, questions }), originalCatalog);
console.log('Conquistas e esquema validados: quatro critérios, zero acertos, melhorias, repetição, retroatividade, imutabilidade, versões, datas, XP e referências inconsistentes.');
