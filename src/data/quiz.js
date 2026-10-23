import { getMissionById } from './missions.js';
import { getQuestionsByMission } from './questions.js';
import { getSubjectById } from './subjects.js';
import { hasText, hasValidOptions } from '../utils/questionValidation.js';

// Dados locais: a URL é suficiente para reconstruir a missão após recarregar.
export function getQuizData(missionId) {
  if (!missionId) {
    return { status: 'no-mission' };
  }

  const mission = getMissionById(missionId);

  if (!mission) {
    return { status: 'not-found' };
  }

  const subject = getSubjectById(mission.subjectId);
  const questions = getQuestionsByMission(mission.id);

  if (!subject || questions.length === 0) {
    return { status: 'unavailable' };
  }

  const validQuestions = questions.every((question) => (
    hasText(question.id)
    && hasText(question.statement)
    && question.subjectId === mission.subjectId
    && hasValidOptions(question.options)
  ));

  if (!validQuestions || new Set(questions.map(({ id }) => id)).size !== questions.length
    || !Array.isArray(mission.questionIds) || mission.questionIds.length !== questions.length
    || questions.some(({ id }) => !mission.questionIds.includes(id))) {
    return { status: 'invalid-questions' };
  }

  return { status: 'ready', mission, subject, questions };
}
