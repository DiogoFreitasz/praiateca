import assert from 'node:assert/strict';

import { missions } from '../src/data/missions.js';
import { questions } from '../src/data/questions.js';
import { getQuizData } from '../src/data/quiz.js';
import { evaluateAttempt, evaluateQuestion, isValidEvaluation } from '../src/utils/quizEvaluation.js';
import { getCompletedResult, getResultForMission } from '../src/utils/quizResults.js';

const originalData = JSON.stringify({ missions, questions });
const removed = questions.shift();
try {
  assert.equal(getQuizData('mission-01').status, 'invalid-questions');
} finally {
  questions.unshift(removed);
}
const originalSubject = questions[0].subjectId;
try {
  questions[0].subjectId = 'database';
  assert.equal(getQuizData('mission-01').status, 'invalid-questions');
} finally {
  questions[0].subjectId = originalSubject;
}
const originalOptions = questions[0].options;
try {
  const sparseOptions = Array(2);
  sparseOptions[1] = originalOptions[1];
  questions[0].options = sparseOptions;
  assert.equal(getQuizData('mission-01').status, 'invalid-questions');
  assert.equal(evaluateQuestion(questions[0], 'b').status, 'invalid-question');
} finally {
  questions[0].options = originalOptions;
}
const completion = {
  missionId: missions[0].id,
  answers: Object.fromEntries(questions.filter(({ missionId }) => missionId === missions[0].id).map((question) => [question.id, question.correctOptionId])),
};
const result = getCompletedResult(completion);
assert.equal(isValidEvaluation(result.evaluation), true);
for (const evaluation of [
  { ...result.evaluation, evaluations: [] },
  { ...result.evaluation, evaluations: Array(5) },
  { ...result.evaluation, evaluations: [null, ...result.evaluation.evaluations.slice(1)] },
  { ...result.evaluation, totalQuestions: 0 },
  { ...result.evaluation, percentage: NaN },
  { ...result.evaluation, correctCount: -1 },
  { ...result.evaluation, incorrectCount: 5 },
]) {
  assert.equal(isValidEvaluation(evaluation), false);
  assert.equal(getResultForMission({ ...result, evaluation }).status, 'invalid');
}
const sparseQuestions = Array(5);
questions.filter(({ missionId }) => missionId === completion.missionId).slice(1)
  .forEach((question, index) => { sparseQuestions[index + 1] = question; });
assert.equal(evaluateAttempt({ missionId: completion.missionId, completion }, sparseQuestions).status, 'invalid-attempt');
assert.equal(JSON.stringify({ missions, questions }), originalData);
console.log('Regressões da auditoria validadas: missão parcial, disciplina divergente, arrays com lacunas e avaliações malformadas.');
