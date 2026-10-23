import { getMissionById, missions } from '../data/missions.js';
import { isValidEvaluation } from './quizEvaluation.js';

const XP_PER_LEVEL = 100;

export function getMaxXp() {
  return missions.reduce((total, mission) => total + mission.xpReward, 0);
}

// Recebe o ID, consultando a recompensa exclusivamente no catálogo real.
export function calculateAttemptXp(missionId, evaluation) {
  const mission = getMissionById(missionId);
  if (!mission) throw new RangeError('Missão desconhecida.');
  if (!isValidEvaluation(evaluation) || evaluation.missionId !== mission.id
    || evaluation.totalQuestions !== mission.questionIds.length
    || new Set(evaluation.evaluations.map(({ questionId }) => questionId)).size !== evaluation.totalQuestions
    || evaluation.evaluations.some((item) => !mission.questionIds.includes(item.questionId)
      || item.isCorrect !== (item.selectedOption.id === item.correctOption.id))
    || evaluation.evaluations.filter(({ isCorrect }) => isCorrect).length !== evaluation.correctCount) {
    throw new TypeError('Avaliação inválida ou incompatível com a missão.');
  }
  return Math.floor(mission.xpReward * evaluation.correctCount / evaluation.totalQuestions);
}

export function getLevelProgress(totalXp) {
  const maxXp = getMaxXp();
  if (!Number.isSafeInteger(totalXp) || totalXp < 0 || totalXp > maxXp) {
    throw new RangeError('XP total deve ser um inteiro dentro dos limites do catálogo.');
  }
  const level = 1 + Math.floor(totalXp / XP_PER_LEVEL);
  const isMaxLevel = totalXp === maxXp;
  const currentLevelXp = (level - 1) * XP_PER_LEVEL;
  const nextLevelXp = isMaxLevel ? null : Math.min(currentLevelXp + XP_PER_LEVEL, maxXp);

  return {
    totalXp,
    maxXp,
    level,
    maxLevel: 1 + Math.floor(maxXp / XP_PER_LEVEL),
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel: totalXp - currentLevelXp,
    xpToNextLevel: isMaxLevel ? null : nextLevelXp - totalXp,
    progressPercentage: isMaxLevel ? 100 : (totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp) * 100,
    isMaxLevel,
  };
}
