import { getQuizData } from '../data/quiz.js';
import { evaluateAttempt, isValidEvaluation } from './quizEvaluation.js';

export function getPerformanceMessage(percentage) {
  if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
    return 'O desempenho desta tentativa está indisponível. Selecione uma missão para praticar novamente.';
  }
  if (percentage < 40) return 'Cada tentativa ajuda a aprender. Revise os fundamentos e use as justificativas para preparar sua próxima prática.';
  if (percentage < 60) return 'Você está progredindo! Reforce os conceitos das questões que precisam de atenção e pratique novamente.';
  if (percentage < 80) return 'Bom desempenho! Revise as oportunidades de melhoria para consolidar seus conhecimentos.';
  return 'Ótimo domínio do conteúdo! Continue praticando e aprofundando os conceitos estudados.';
}

// Derivado apenas do snapshot em memória; não armazena outro mapa de respostas.
export function getCompletedResult(completion) {
  if (!completion) {
    return { status: 'empty', message: 'Conclua uma missão para ver seu desempenho. Ao recarregar a página, os resultados temporários são perdidos.' };
  }
  const data = getQuizData(completion.missionId);
  if (data.status !== 'ready') {
    return { status: 'invalid', message: 'Não foi possível encontrar os dados da missão concluída. Selecione uma missão para continuar.' };
  }
  const evaluation = evaluateAttempt({ missionId: data.mission.id, completion }, data.questions);
  if (evaluation.status !== 'evaluated') {
    return { status: 'invalid', message: evaluation.message };
  }
  return { status: 'ready', mission: data.mission, subject: data.subject, evaluation };
}

export function getResultForMission(result, missionId) {
  if (!result || !['ready', 'empty', 'invalid', 'mismatch'].includes(result.status)) {
    return { status: 'invalid', message: 'Os dados deste resultado estão indisponíveis. Selecione uma missão para continuar.' };
  }
  if (result.status !== 'ready') return result;
  if (!result.mission?.id || result.subject?.id !== result.mission.subjectId
    || !isValidEvaluation(result.evaluation) || result.evaluation.missionId !== result.mission.id) {
    return { status: 'invalid', message: 'A avaliação não corresponde aos dados da missão concluída. Selecione uma missão para continuar.' };
  }
  if (missionId && missionId !== result.mission.id) {
    return { status: 'mismatch', message: 'Não há uma tentativa concluída desta missão em memória. Selecione uma missão para começar.' };
  }
  return result;
}
