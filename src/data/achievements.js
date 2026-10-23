import { getMissionById } from './missions.js';
import { subjects } from './subjects.js';

// Critério v1 deliberadamente fixo: expansões não acrescentam requisitos.
export const MASTER_MISSION_IDS_V1 = Object.freeze([
  'mission-01', 'mission-02', 'mission-03', 'mission-04',
  'mission-05', 'mission-06', 'mission-07', 'mission-08',
]);

export const achievements = Object.freeze([
  Object.freeze({ id: 'first-steps', name: 'Primeiros Passos', description: 'Conclua sua primeira missão.', ruleVersion: 1, icon: 'Footprints', order: 1, criterion: 'first-completion' }),
  Object.freeze({ id: 'perfect-score', name: 'Precisão Absoluta', description: 'Acerte todas as questões de uma missão.', ruleVersion: 1, icon: 'CircleCheck', order: 2, criterion: 'perfect-score' }),
  Object.freeze({ id: 'knowledge-explorer', name: 'Explorador do Conhecimento', description: 'Conclua pelo menos uma missão de cada disciplina.', ruleVersion: 1, icon: 'Compass', order: 3, criterion: 'all-subjects' }),
  Object.freeze({ id: 'praiateca-master', name: 'Mestre da PraiaTeca', description: 'Conclua as oito missões do catálogo inicial.', ruleVersion: 1, icon: 'Trophy', order: 4, criterion: 'initial-catalog', requiredMissionIds: MASTER_MISSION_IDS_V1 }),
]);

// Núcleo único dos critérios; recebe registros de progresso já validados.
export function getEligibleAchievements(progress) {
  const completedIds = Object.keys(progress.missions);
  const completedSubjects = new Set(completedIds.map((id) => getMissionById(id)?.subjectId));
  return achievements.filter((achievement) => {
    switch (achievement.criterion) {
      case 'first-completion': return completedIds.length > 0;
      case 'perfect-score': return Object.values(progress.missions).some(({ bestResult }) => bestResult.correctCount === bestResult.totalQuestions);
      case 'all-subjects': return subjects.every(({ id }) => completedSubjects.has(id));
      case 'initial-catalog': return achievement.requiredMissionIds.every((id) => Object.hasOwn(progress.missions, id));
      default: return false;
    }
  });
}
