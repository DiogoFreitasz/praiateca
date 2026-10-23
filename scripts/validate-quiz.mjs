import assert from 'node:assert/strict';

import { missions } from '../src/data/missions.js';
import { questions } from '../src/data/questions.js';
import { subjects } from '../src/data/subjects.js';
import { getQuizData } from '../src/data/quiz.js';
import { createQuizAttempt, getAttemptProgress, updateQuizAttempt } from '../src/utils/quizAttempt.js';

const originalData = JSON.stringify({ missions, questions, subjects });
const loadedQuestionIds = [];

for (const mission of missions) {
  const data = getQuizData(mission.id);

  assert.equal(data.status, 'ready');
  assert.equal(data.mission.id, mission.id);
  assert.equal(data.subject.id, mission.subjectId);
  assert.equal(data.questions.length, 5);
  assert.deepEqual(data.questions.map(({ id }) => id), mission.questionIds);
  assert.ok(data.questions.every((question) => (
    question.missionId === mission.id && question.subjectId === mission.subjectId
  )));
  loadedQuestionIds.push(...data.questions.map(({ id }) => id));

  // Uma nova consulta não depende de navegação nem de estado anterior.
  assert.deepEqual(getQuizData(mission.id), data);
}

assert.equal(loadedQuestionIds.length, 40);
assert.equal(new Set(loadedQuestionIds).size, 40);

for (const id of [undefined, null, '']) {
  assert.equal(getQuizData(id).status, 'no-mission');
}

for (const id of ['mission-99', 'mission-00', 'mission-1', 'MISSION-01', 'invalido', '../missoes', '%', ' mission-01 ', 1, {}]) {
  assert.equal(getQuizData(id).status, 'not-found');
}

// Simulações apenas em memória, com restauração dos dados após cada cenário.
const removedQuestions = questions.splice(0);
try {
  assert.equal(getQuizData('mission-01').status, 'unavailable');
} finally {
  questions.push(...removedQuestions);
}

const removedSubjects = subjects.splice(0);
try {
  assert.equal(getQuizData('mission-01').status, 'unavailable');
} finally {
  subjects.push(...removedSubjects);
}

assert.equal(JSON.stringify({ missions, questions, subjects }), originalData);

const firstQuestion = questions[0];
const originalOptions = firstQuestion.options;
for (const options of [undefined, null, [], [originalOptions[0]], [null, originalOptions[1]], [{ id: 'a', text: '' }, originalOptions[1]], [originalOptions[0], originalOptions[0]]]) {
  try {
    firstQuestion.options = options;
    assert.equal(getQuizData('mission-01').status, 'invalid-questions');
  } finally {
    firstQuestion.options = originalOptions;
  }
}

for (const mission of missions) {
  const { questions: missionQuestions } = getQuizData(mission.id);
  const initial = createQuizAttempt(mission.id, `initial-${mission.id}`);
  let attempt = initial;
  const act = (type, optionId) => {
    attempt = updateQuizAttempt(attempt, { type, optionId, attemptId: `restart-${mission.id}`, completedAt: '2026-10-22T12:00:00.000Z' }, missionQuestions);
    return attempt;
  };
  assert.deepEqual(getAttemptProgress(attempt, missionQuestions), { answeredCount: 0, percentage: 0, canFinish: false });
  assert.equal(act('next'), initial);
  assert.equal(act('finish'), initial);
  assert.equal(act('select', 'invalida'), initial);
  act('previous');
  assert.equal(attempt.currentIndex, 0);

  act('select', missionQuestions[0].options[0].id);
  assert.equal(attempt.answers[missionQuestions[0].id], missionQuestions[0].options[0].id);
  const beforeChange = attempt;
  act('select', missionQuestions[0].options[1].id);
  assert.equal(attempt.answers[missionQuestions[0].id], missionQuestions[0].options[1].id);
  assert.equal(beforeChange.answers[missionQuestions[0].id], missionQuestions[0].options[0].id);
  assert.equal(getAttemptProgress(attempt, missionQuestions).answeredCount, 1);
  assert.equal(act('finish').completion, null);
  act('next');
  assert.equal(attempt.currentIndex, 1);
  act('previous');
  assert.equal(attempt.currentIndex, 0);
  assert.equal(attempt.answers[missionQuestions[0].id], missionQuestions[0].options[1].id);
  act('next');

  for (let index = 1; index < missionQuestions.length; index += 1) {
    act('select', missionQuestions[index].options[0].id);
    if (index === 2) {
      assert.equal(getAttemptProgress(attempt, missionQuestions).percentage, 60);
      assert.equal(getAttemptProgress(attempt, missionQuestions).answeredCount, 3);
    }
    if (index < missionQuestions.length - 1) act('next');
  }
  act('next');
  assert.equal(attempt.currentIndex, missionQuestions.length - 1);
  assert.equal(getAttemptProgress(attempt, missionQuestions).percentage, 100);
  assert.equal(getAttemptProgress(attempt, missionQuestions).canFinish, true);

  // Revisar não reduz o progresso; é possível concluir a partir de qualquer questão.
  act('previous');
  act('select', missionQuestions[attempt.currentIndex].options[1].id);
  const liveAnswers = attempt.answers;
  const answersBeforeFinish = { ...attempt.answers };
  const finished = act('finish');
  assert.deepEqual(finished.completion, { missionId: mission.id, attemptId: initial.attemptId, completedAt: '2026-10-22T12:00:00.000Z', answers: answersBeforeFinish });
  assert.notEqual(finished.answers, liveAnswers);
  assert.ok(Object.isFrozen(finished.answers));
  assert.ok(Object.isFrozen(finished.completion));
  assert.throws(() => { finished.answers[missionQuestions[0].id] = 'invalida'; }, TypeError);
  for (const type of ['select', 'previous', 'next', 'finish']) {
    assert.equal(act(type, missionQuestions[0].options[0].id), finished);
  }
  assert.equal(getAttemptProgress(attempt, missionQuestions).canFinish, false);
  act('restart');
  assert.deepEqual(attempt, { ...initial, attemptId: `restart-${mission.id}` });
  assert.deepEqual(createQuizAttempt(mission.id, initial.attemptId), initial);
  const otherMission = missions.find(({ id }) => id !== mission.id);
  const otherAttempt = createQuizAttempt(otherMission.id, `other-${otherMission.id}`);
  assert.equal(otherAttempt.missionId, otherMission.id);
  assert.deepEqual(otherAttempt.answers, {});
  assert.equal(otherAttempt.currentIndex, 0);
  assert.equal(otherAttempt.completion, null);

  // Mesmo respostas injetadas com IDs de alternativas inexistentes não permitem concluir.
  const invalidAnswers = Object.fromEntries(missionQuestions.map(({ id }) => [id, 'invalida']));
  const invalidAttempt = { ...initial, answers: invalidAnswers };
  assert.equal(getAttemptProgress(invalidAttempt, missionQuestions).answeredCount, 0);
  assert.equal(updateQuizAttempt(invalidAttempt, { type: 'finish' }, missionQuestions), invalidAttempt);
}

const emptyAttempt = createQuizAttempt('mission-01', 'empty-attempt');
assert.equal(updateQuizAttempt(emptyAttempt, { type: 'next' }, []), emptyAttempt);
assert.equal(updateQuizAttempt(emptyAttempt, { type: 'finish' }, []), emptyAttempt);
assert.equal(getAttemptProgress(emptyAttempt, []).canFinish, false);
assert.equal(JSON.stringify({ missions, questions, subjects }), originalData);
console.log('Dados e motor validados nas oito missões: seleção, alteração, navegação, preservação, progresso, conclusão, bloqueios, reinício e inicialização independente por missão.');

await import('./validate-quiz-evaluation.mjs');
await import('./validate-quiz-results.mjs');
await import('./validate-quiz-audit.mjs');
await import('./validate-quiz-ui.mjs');
