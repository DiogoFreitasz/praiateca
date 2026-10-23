import assert from 'node:assert/strict';

import { missions } from '../src/data/missions.js';
import { questions } from '../src/data/questions.js';
import { createQuizAttempt, updateQuizAttempt } from '../src/utils/quizAttempt.js';
import { getCompletedResult, getPerformanceMessage, getResultForMission } from '../src/utils/quizResults.js';

const originalData = JSON.stringify({ missions, questions });
const fundamentals = getPerformanceMessage(0);
const progress = getPerformanceMessage(40);
const good = getPerformanceMessage(60);
const excellent = getPerformanceMessage(80);
assert.equal(new Set([fundamentals, progress, good, excellent]).size, 4);
for (const [percentage, message] of [[0, fundamentals], [39, fundamentals], [39.99, fundamentals], [40, progress], [59, progress], [59.99, progress], [60, good], [79, good], [79.99, good], [80, excellent], [100, excellent]]) {
  assert.equal(getPerformanceMessage(percentage), message);
}
for (const percentage of [undefined, null, NaN, Infinity, -1, 101, '60']) {
  assert.ok(getPerformanceMessage(percentage).includes('indisponível'));
}
assert.equal(getCompletedResult(null).status, 'empty');
for (const result of [null, undefined, {}, { status: 'ready' }]) {
  assert.equal(getResultForMission(result, 'mission-01').status, 'invalid');
}
for (const completion of [{}, { missionId: 'mission-99', answers: {} }, { missionId: 'mission-01', answers: {} }]) {
  assert.equal(getCompletedResult(completion).status, 'invalid');
}

for (const mission of missions) {
  const missionQuestions = questions.filter(({ missionId }) => missionId === mission.id);
  for (const correctCount of [0, 1, 2, 3, 4, 5]) {
    let attempt = createQuizAttempt(mission.id, `results-${mission.id}`);
    assert.equal(getCompletedResult(attempt.completion).status, 'empty');
    for (const [index, question] of missionQuestions.entries()) {
      const optionId = index < correctCount ? question.correctOptionId : question.options.find(({ id }) => id !== question.correctOptionId).id;
      attempt = updateQuizAttempt(attempt, { type: 'select', optionId }, missionQuestions);
      attempt = updateQuizAttempt(attempt, { type: 'next' }, missionQuestions);
    }
    attempt = updateQuizAttempt(attempt, { type: 'finish', completedAt: '2026-10-22T12:00:00.000Z' }, missionQuestions);
    const result = getCompletedResult(attempt.completion);
    assert.equal(result.status, 'ready');
    assert.equal(result.mission.id, mission.id);
    assert.equal(result.subject.id, mission.subjectId);
    assert.equal(result.evaluation.totalQuestions, 5);
    assert.equal(result.evaluation.correctCount, correctCount);
    assert.equal(result.evaluation.incorrectCount, 5 - correctCount);
    assert.equal(result.evaluation.percentage, correctCount * 20);
    assert.equal(getResultForMission(result, mission.id), result);
    assert.equal(getResultForMission(result), result);
    assert.equal(getResultForMission({ ...result, evaluation: { ...result.evaluation, missionId: 'mission-99' } }).status, 'invalid');
    assert.equal(getResultForMission({ ...result, evaluation: null }).status, 'invalid');
    assert.equal(getResultForMission({ ...result, subject: { id: 'invalida' } }).status, 'invalid');
    const otherMission = missions.find(({ id }) => id !== mission.id);
    assert.equal(getResultForMission(result, otherMission.id).status, 'mismatch');
    assert.equal(getResultForMission(result, 'mission-99').status, 'mismatch');
    assert.equal(result.evaluation.evaluations[0].explanation, missionQuestions[0].explanation);
    assert.equal(result.evaluation.evaluations[0].selectedOption.id, attempt.completion.answers[missionQuestions[0].id]);
    const badCompletion = { ...attempt.completion, answers: { ...attempt.completion.answers, [missionQuestions[0].id]: 'invalida' } };
    assert.equal(getCompletedResult(badCompletion).status, 'invalid');
    const restarted = updateQuizAttempt(attempt, { type: 'restart', attemptId: 'results-restarted' }, missionQuestions);
    assert.equal(getCompletedResult(restarted.completion).status, 'empty');
    assert.deepEqual(restarted.answers, {});
    assert.equal(restarted.currentIndex, 0);
  }
}

// Um gabarito inválido não produz totais aparentemente válidos.
const originalKey = questions[0].correctOptionId;
try {
  questions[0].correctOptionId = 'invalido';
  const completion = {
    missionId: 'mission-01',
    answers: Object.fromEntries(questions.filter(({ missionId }) => missionId === 'mission-01').map(({ id }) => [id, 'a'])),
  };
  assert.equal(getCompletedResult(completion).status, 'invalid');
} finally {
  questions[0].correctOptionId = originalKey;
}
assert.equal(JSON.stringify({ missions, questions }), originalData);
console.log('Resultados validados: 0–100%, faixas e limites, totais, tentativas inválidas, reinício e isolamento nas oito missões.');
