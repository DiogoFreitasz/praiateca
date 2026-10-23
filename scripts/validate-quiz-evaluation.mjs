import assert from 'node:assert/strict';

import { missions } from '../src/data/missions.js';
import { questions } from '../src/data/questions.js';
import { getQuizData } from '../src/data/quiz.js';
import { createQuizAttempt, updateQuizAttempt } from '../src/utils/quizAttempt.js';
import { evaluateAttempt, evaluateQuestion } from '../src/utils/quizEvaluation.js';

const originalQuestions = JSON.stringify(questions);

for (const question of questions) {
  const correctOption = question.options.find(({ id }) => id === question.correctOptionId);
  const wrongOption = question.options.find(({ id }) => id !== question.correctOptionId);
  const correct = evaluateQuestion(question, correctOption.id);
  const wrong = evaluateQuestion(question, wrongOption.id);
  assert.equal(correct.status, 'evaluated');
  assert.equal(correct.isCorrect, true);
  assert.equal(wrong.isCorrect, false);
  assert.deepEqual(correct.correctOption, correctOption);
  assert.deepEqual(wrong.selectedOption, wrongOption);
  assert.equal(correct.statement, question.statement);
  assert.equal(correct.explanation, question.explanation);
  assert.equal(correct.hasExplanation, true);
  assert.notEqual(correct.correctOption, correctOption);
  assert.notEqual(wrong.selectedOption, wrongOption);
  correct.correctOption.text = 'Alteração apenas na avaliação';
  assert.equal(JSON.stringify(questions), originalQuestions);

  for (const answer of [undefined, null, '', 'invalida', {}, 1]) {
    const invalid = evaluateQuestion(question, answer);
    assert.equal(invalid.status, 'invalid-answer');
    assert.equal(invalid.isCorrect, undefined);
    assert.ok(invalid.message);
  }
}

for (const explanation of [undefined, null, '', '   ', 123]) {
  const item = evaluateQuestion({ ...questions[0], explanation }, questions[0].correctOptionId);
  assert.equal(item.hasExplanation, false);
  assert.equal(item.explanation, 'A justificativa desta questão não está disponível.');
}

for (const correctOptionId of [undefined, null, '', 'inexistente']) {
  assert.equal(evaluateQuestion({ ...questions[0], correctOptionId }, 'a').status, 'invalid-key');
}
for (const question of [undefined, null, {}, { ...questions[0], options: [] }, { ...questions[0], options: [null, null] }, { ...questions[0], options: [questions[0].options[0], questions[0].options[0]] }]) {
  assert.equal(evaluateQuestion(question, 'a').status, 'invalid-question');
}

for (const mission of missions) {
  const { questions: missionQuestions } = getQuizData(mission.id);
  const initial = createQuizAttempt(mission.id, `evaluation-${mission.id}`);
  assert.equal(evaluateAttempt(initial, missionQuestions).status, 'not-completed');

  for (const expectedCorrectCount of [0, 2, 5]) {
    let attempt = initial;
    for (let index = 0; index < missionQuestions.length; index += 1) {
      const question = missionQuestions[index];
      const optionId = index < expectedCorrectCount
        ? question.correctOptionId
        : question.options.find(({ id }) => id !== question.correctOptionId).id;
      attempt = updateQuizAttempt(attempt, { type: 'select', optionId }, missionQuestions);
      attempt = updateQuizAttempt(attempt, { type: 'next' }, missionQuestions);
    }
    // Mesmo com todas as respostas selecionadas, a correção exige finalização.
    assert.equal(evaluateAttempt(attempt, missionQuestions).status, 'not-completed');
    attempt = updateQuizAttempt(attempt, { type: 'finish', completedAt: '2026-10-22T12:00:00.000Z' }, missionQuestions);
    const attemptBeforeEvaluation = JSON.stringify(attempt);
    const evaluation = evaluateAttempt(attempt, missionQuestions);
    assert.equal(evaluation.status, 'evaluated');
    assert.equal(evaluation.missionId, mission.id);
    assert.equal(evaluation.totalQuestions, 5);
    assert.equal(evaluation.correctCount, expectedCorrectCount);
    assert.equal(evaluation.incorrectCount, 5 - expectedCorrectCount);
    assert.equal(evaluation.percentage, expectedCorrectCount * 20);
    assert.deepEqual(evaluation.evaluations.map(({ questionId }) => questionId), mission.questionIds);
    assert.equal(JSON.stringify(attempt), attemptBeforeEvaluation);

    // A avaliação usa exclusivamente o snapshot congelado, não um mapa externo.
    assert.deepEqual(evaluateAttempt({ ...attempt, answers: {} }, missionQuestions), evaluation);
    assert.equal(updateQuizAttempt(attempt, { type: 'select', optionId: 'a' }, missionQuestions), attempt);

    const otherMission = missions.find(({ id }) => id !== mission.id);
    const otherQuestions = getQuizData(otherMission.id).questions;
    assert.equal(evaluateAttempt(attempt, otherQuestions).status, 'invalid-attempt');
    assert.equal(evaluateAttempt(createQuizAttempt(otherMission.id, 'other-attempt'), otherQuestions).status, 'not-completed');
    const restarted = updateQuizAttempt(attempt, { type: 'restart', attemptId: 'restarted-attempt' }, missionQuestions);
    assert.deepEqual(restarted, { ...initial, attemptId: 'restarted-attempt' });
    assert.equal(evaluateAttempt(restarted, missionQuestions).status, 'not-completed');

    const incompleteAnswers = { ...attempt.completion.answers };
    delete incompleteAnswers[missionQuestions[0].id];
    const withAnswers = (answers) => ({ ...attempt, completion: { ...attempt.completion, answers } });
    assert.equal(evaluateAttempt(withAnswers(incompleteAnswers), missionQuestions).status, 'invalid-attempt');
    assert.equal(evaluateAttempt(withAnswers({ ...attempt.answers, extra: 'a' }), missionQuestions).status, 'invalid-attempt');
    assert.equal(evaluateAttempt(withAnswers({ ...attempt.answers, [missionQuestions[0].id]: 'invalida' }), missionQuestions).status, 'invalid-evaluation');
    const invalidQuestions = missionQuestions.map((question, index) => index === 0 ? { ...question, correctOptionId: 'invalido' } : question);
    const invalidKey = evaluateAttempt(attempt, invalidQuestions);
    assert.equal(invalidKey.status, 'invalid-evaluation');
    assert.equal(invalidKey.evaluations[0].status, 'invalid-key');
    assert.equal(invalidKey.correctCount, undefined);
    assert.equal(evaluateAttempt(attempt, []).status, 'invalid-attempt');
    assert.equal(evaluateAttempt(attempt, [missionQuestions[0], missionQuestions[0]]).status, 'invalid-attempt');
  }
}

// Dados congelados também podem ser avaliados, sem necessidade de mutação.
const frozenQuestion = structuredClone(questions[0]);
frozenQuestion.options.forEach(Object.freeze);
Object.freeze(frozenQuestion.options);
Object.freeze(frozenQuestion);
assert.equal(evaluateQuestion(frozenQuestion, frozenQuestion.correctOptionId).isCorrect, true);
assert.equal(evaluateAttempt(null, questions).status, 'not-completed');
assert.equal(JSON.stringify(questions), originalQuestions);
console.log('Correção validada: 40 questões, acertos/erros/percentuais, justificativas, entradas inválidas, bloqueio antes de finalizar, imutabilidade, reinício e isolamento entre missões.');
