import { isValidAttemptId } from './attemptMetadata.js';
import { isValidProgressDate } from './progressValidation.js';

export function createQuizAttempt(missionId, attemptId) {
  if (!isValidAttemptId(attemptId)) throw new TypeError('Identificador de tentativa inválido.');
  return { missionId, attemptId, currentIndex: 0, answers: {}, completion: null };
}

function hasValidAnswer(question, answers) {
  return question.options.some((option) => option.id === answers[question.id]);
}

export function getAttemptProgress(attempt, questions) {
  const answeredCount = questions.filter((question) => hasValidAnswer(question, attempt.answers)).length;

  return {
    answeredCount,
    percentage: questions.length ? (answeredCount / questions.length) * 100 : 0,
    canFinish: questions.length > 0 && answeredCount === questions.length && !attempt.completion,
  };
}

// Regras puras compartilhadas pelo hook e pelos testes, sem corrigir respostas.
export function updateQuizAttempt(attempt, action, questions) {
  if (action.type === 'restart') {
    if (action.attemptId === attempt.attemptId) throw new TypeError('Reiniciar exige um novo identificador.');
    return createQuizAttempt(attempt.missionId, action.attemptId);
  }
  if (attempt.completion) return attempt;

  const question = questions[attempt.currentIndex];
  if (!question) return attempt;

  switch (action.type) {
    case 'select':
      if (!question.options.some((option) => option.id === action.optionId)) return attempt;
      return { ...attempt, answers: { ...attempt.answers, [question.id]: action.optionId } };
    case 'previous':
      return { ...attempt, currentIndex: Math.max(0, attempt.currentIndex - 1) };
    case 'next':
      if (!hasValidAnswer(question, attempt.answers)) return attempt;
      return { ...attempt, currentIndex: Math.min(questions.length - 1, attempt.currentIndex + 1) };
    case 'finish': {
      if (!getAttemptProgress(attempt, questions).canFinish) return attempt;
      if (!isValidProgressDate(action.completedAt)) throw new TypeError('Data de conclusão inválida.');
      const answers = Object.freeze({ ...attempt.answers });
      const completion = Object.freeze({ missionId: attempt.missionId, attemptId: attempt.attemptId, completedAt: action.completedAt, answers });
      return { ...attempt, answers, completion };
    }
    default:
      return attempt;
  }
}
