import assert from 'node:assert/strict';

import { missions } from '../src/data/missions.js';
import { questions, getQuestionsByMission } from '../src/data/questions.js';
import { evaluateAttempt } from '../src/utils/quizEvaluation.js';
import { calculateAttemptXp, getLevelProgress, getMaxXp } from '../src/utils/gamification.js';
import {
  applyCompletedAttempt,
  createInitialProgress,
  getCatalogProgress,
  getCompletedMissionCount,
  getMissionAwardedXp,
  getMissionBestResult,
  getProgressLevel,
  getTotalXp,
} from '../src/utils/progress.js';

const originalCatalog = JSON.stringify({ missions, questions });
const completedAt = '2026-10-22T12:00:00.000Z';

function evaluationFor(missionId, correctCount) {
  const missionQuestions = getQuestionsByMission(missionId);
  const answers = Object.fromEntries(missionQuestions.map((question, index) => [
    question.id,
    index < correctCount ? question.correctOptionId : question.options.find(({ id }) => id !== question.correctOptionId).id,
  ]));
  return evaluateAttempt({ missionId, completion: { missionId, answers } }, missionQuestions);
}

function eventFor(missionId, attemptId, correctCount, date = completedAt) {
  return { missionId, attemptId, evaluation: evaluationFor(missionId, correctCount), completedAt: date };
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

assert.equal(getMaxXp(), 1000);
for (const mission of missions) {
  for (let correctCount = 0; correctCount <= 5; correctCount += 1) {
    const evaluation = deepFreeze(evaluationFor(mission.id, correctCount));
    const before = JSON.stringify(evaluation);
    const xp = calculateAttemptXp(mission.id, evaluation);
    assert.equal(xp, mission.xpReward * correctCount / 5);
    assert.ok(Number.isInteger(xp) && xp >= 0 && xp <= mission.xpReward);
    assert.equal(JSON.stringify(evaluation), before);
  }
}

const validEvaluation = evaluationFor('mission-01', 2);
for (const evaluation of [
  undefined, null, {}, { ...validEvaluation, status: 'not-completed' },
  { ...validEvaluation, correctCount: -1 }, { ...validEvaluation, correctCount: 6 },
  { ...validEvaluation, correctCount: 1.5 }, { ...validEvaluation, correctCount: NaN },
  { ...validEvaluation, correctCount: Infinity }, { ...validEvaluation, correctCount: '2' },
  { ...validEvaluation, totalQuestions: 0 }, { ...validEvaluation, totalQuestions: 3 },
  { ...validEvaluation, incorrectCount: 0 }, { ...validEvaluation, percentage: 41 },
  { ...validEvaluation, missionId: 'mission-02' }, { ...validEvaluation, evaluations: [] },
  { ...validEvaluation, evaluations: Array(5) },
  { ...validEvaluation, correctCount: 3, incorrectCount: 2, percentage: 60 },
  { ...validEvaluation, evaluations: validEvaluation.evaluations.map((item) => ({ ...item, questionId: 'q01' })) },
  { ...validEvaluation, evaluations: validEvaluation.evaluations.map((item) => ({ ...item, questionId: 'q40' })) },
]) {
  assert.throws(() => calculateAttemptXp('mission-01', evaluation), TypeError);
}
for (const id of [undefined, null, '', 'mission-99', {}, 1]) {
  assert.throws(() => calculateAttemptXp(id, validEvaluation), RangeError);
}

for (const xp of [0, 1, 99, 100, 101, 199, 200, 899, 900, 999, 1000]) {
  const level = getLevelProgress(xp);
  assert.equal(level.level, 1 + Math.floor(xp / 100));
  assert.equal(level.maxLevel, 11);
  assert.equal(level.maxXp, getMaxXp());
  assert.equal(level.isMaxLevel, xp === 1000);
  assert.equal(level.xpToNextLevel, xp === 1000 ? null : 100 - xp % 100);
  assert.equal(level.nextLevelXp, xp === 1000 ? null : (Math.floor(xp / 100) + 1) * 100);
  assert.equal(level.progressPercentage, xp === 1000 ? 100 : xp % 100);
}
for (const xp of [-1, 1001, 1.5, NaN, Infinity, '100', null, undefined]) {
  assert.throws(() => getLevelProgress(xp), RangeError);
}

const empty = deepFreeze(createInitialProgress());
assert.deepEqual(createInitialProgress(), empty);
assert.notEqual(createInitialProgress().missions, createInitialProgress().missions);
assert.equal(getTotalXp(empty), 0);
assert.equal(getCompletedMissionCount(empty), 0);
assert.equal(getMissionBestResult(empty, 'mission-01'), null);
assert.equal(getMissionAwardedXp(empty, 'mission-01'), 0);
assert.equal(getProgressLevel(empty).level, 1);
assert.deepEqual(getCatalogProgress(empty), { completedMissions: 0, totalMissions: 8, completionPercentage: 0, totalXp: 0, maxXp: 1000 });

for (const mission of missions) {
  let state = empty;
  const sequence = [0, 2, 1, 4, 4, 5];
  let previousXp = 0;
  let bestAttemptId = null;
  let bestCorrectCount = -1;
  for (const [index, correctCount] of sequence.entries()) {
    const event = deepFreeze(eventFor(mission.id, `${mission.id}-${index}`, correctCount));
    const stateBefore = JSON.stringify(state);
    const eventBefore = JSON.stringify(event);
    const result = applyCompletedAttempt(deepFreeze(state), event);
    const xp = Math.max(previousXp, mission.xpReward * correctCount / 5);
    assert.equal(result.changed, true);
    assert.equal(result.status, 'applied');
    assert.equal(result.xpDelta, xp - previousXp);
    assert.equal(result.state.revision, index + 1);
    assert.equal(result.state.updatedAt, completedAt);
    assert.equal(getTotalXp(result.state), xp);
    assert.equal(getCompletedMissionCount(result.state), 1);
    assert.equal(getCatalogProgress(result.state).completionPercentage, 12.5);
    if (correctCount > bestCorrectCount) {
      bestCorrectCount = correctCount;
      bestAttemptId = event.attemptId;
    } else {
      assert.equal(result.state.missions[mission.id].bestResult, state.missions[mission.id].bestResult);
    }
    assert.equal(getMissionBestResult(result.state, mission.id).attemptId, bestAttemptId);
    assert.equal(getMissionBestResult(result.state, mission.id).correctCount, bestCorrectCount);
    assert.equal(getMissionAwardedXp(result.state, mission.id), xp);
    assert.equal(Object.keys(result.state.processedAttempts).length, index + 1);
    assert.equal(JSON.stringify(state), stateBefore);
    assert.equal(JSON.stringify(event), eventBefore);
    state = deepFreeze(result.state);
    const repeated = applyCompletedAttempt(state, structuredClone(event));
    assert.deepEqual(repeated, { state, changed: false, xpDelta: 0, status: 'duplicate', newAchievements: [] });
    assert.equal(repeated.state, state);
    const reordered = { ...event, evaluation: { ...event.evaluation, evaluations: [...event.evaluation.evaluations].reverse() } };
    assert.equal(applyCompletedAttempt(state, reordered).state, state);
    previousXp = xp;
  }
  const selectedBest = getMissionBestResult(state, mission.id);
  selectedBest.correctCount = -1;
  assert.equal(getMissionBestResult(state, mission.id).correctCount, 5);
}

const firstEvent = deepFreeze(eventFor('mission-01', 'attempt-1', 2));
const firstState = deepFreeze(applyCompletedAttempt(empty, firstEvent).state);
const beforeConflicts = JSON.stringify(firstState);
for (const event of [
  eventFor('mission-01', 'attempt-1', 3),
  eventFor('mission-02', 'attempt-1', 2),
  eventFor('mission-01', 'attempt-1', 2, '2026-10-22T13:00:00.000Z'),
]) {
  assert.throws(() => applyCompletedAttempt(firstState, event), { code: 'ATTEMPT_CONFLICT' });
}
const sameScore = structuredClone(firstEvent);
const wrongItem = sameScore.evaluation.evaluations.find(({ isCorrect }) => !isCorrect);
wrongItem.selectedOption = { ...getQuestionsByMission('mission-01').find(({ id }) => id === wrongItem.questionId).options.find(({ id }) => id !== wrongItem.correctOption.id && id !== wrongItem.selectedOption.id) };
assert.throws(() => applyCompletedAttempt(firstState, sameScore), { code: 'ATTEMPT_CONFLICT' });
assert.equal(JSON.stringify(firstState), beforeConflicts);

for (const attemptId of ['', ' ', ' padded ', null, undefined, 7]) {
  assert.throws(() => applyCompletedAttempt(firstState, { ...firstEvent, attemptId }), TypeError);
}
for (const date of ['', null, 0, 'ontem', '2026-02-30T12:00:00.000Z', '2026-10-22']) {
  assert.throws(() => applyCompletedAttempt(firstState, { ...firstEvent, completedAt: date }), TypeError);
}
assert.throws(() => applyCompletedAttempt(firstState, { ...firstEvent, missionId: 'mission-99' }), RangeError);
assert.throws(() => applyCompletedAttempt(firstState, { ...firstEvent, evaluation: {} }), TypeError);
for (const state of [null, {}, { ...empty, missions: [] }, { ...empty, revision: -1 }, { ...firstState, missions: { 'mission-99': firstState.missions['mission-01'] } }]) {
  assert.throws(() => getTotalXp(state), TypeError);
}
assert.throws(() => getMissionBestResult(empty, 'mission-99'), RangeError);
assert.throws(() => getMissionAwardedXp(empty, 'mission-99'), RangeError);
assert.equal(JSON.stringify(firstState), beforeConflicts);

const earlier = applyCompletedAttempt(firstState, eventFor('mission-01', '__proto__', 1, '2026-10-21T12:00:00.000Z')).state;
assert.equal(Object.hasOwn(earlier.processedAttempts, '__proto__'), true);
assert.equal(earlier.missions['mission-01'].firstCompletedAt, '2026-10-21T12:00:00.000Z');
assert.equal(earlier.missions['mission-01'].lastCompletedAt, completedAt);
assert.equal(earlier.updatedAt, completedAt);
assert.equal(applyCompletedAttempt(earlier, eventFor('mission-01', '__proto__', 1, '2026-10-21T12:00:00.000Z')).changed, false);

let complete = empty;
let granted = 0;
for (const mission of missions) {
  const result = applyCompletedAttempt(deepFreeze(complete), eventFor(mission.id, `perfect-${mission.id}`, 5));
  assert.equal(result.xpDelta, mission.xpReward);
  granted += result.xpDelta;
  complete = result.state;
}
assert.equal(granted, 1000);
assert.equal(getTotalXp(complete), getMaxXp());
assert.equal(getCompletedMissionCount(complete), 8);
assert.equal(getCatalogProgress(complete).completionPercentage, 100);
assert.equal(getProgressLevel(complete).level, 11);
assert.equal(getProgressLevel(complete).isMaxLevel, true);
assert.equal(getProgressLevel(complete).progressPercentage, 100);
assert.equal(getProgressLevel(complete).nextLevelXp, null);
assert.equal(getProgressLevel(complete).xpToNextLevel, null);
for (const mission of missions) {
  const repeatedPerfect = applyCompletedAttempt(deepFreeze(complete), eventFor(mission.id, `again-${mission.id}`, 5));
  assert.equal(repeatedPerfect.xpDelta, 0);
  assert.equal(getTotalXp(repeatedPerfect.state), getMaxXp());
}
assert.equal(JSON.stringify({ missions, questions }), originalCatalog);
console.log('Progresso validado: XP das oito missões, entradas inválidas, níveis 1–11, melhorias, empates, idempotência, conflitos, imutabilidade e limite global de 1.000 XP.');
