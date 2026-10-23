import { achievements, getEligibleAchievements } from '../data/achievements.js';
import { getMissionById } from '../data/missions.js';
import { getQuestionsByMission } from '../data/questions.js';
import { evaluateAttempt } from './quizEvaluation.js';

export const PROGRESS_SCHEMA_VERSION = 1;
export const PROGRESS_RULES_VERSION = 1;

export const isValidProgressDate = (value) => typeof value === 'string'
  && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;

const isRecord = (value) => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const hasId = (id) => typeof id === 'string' && id.trim().length > 0 && id === id.trim();
const result = (status, message) => ({ valid: status === 'valid', status, errors: message ? [message] : [] });
const corrupted = (message) => result('corrupted', message);

// Recebe um documento já decodificado. Não lê, corrige ou grava armazenamento.
export function validateProgress(state) {
  if (!isRecord(state)) return corrupted('Documento de progresso deve ser um objeto.');
  if (!Number.isSafeInteger(state.schemaVersion) || state.schemaVersion < 1
    || !Number.isSafeInteger(state.rulesVersion) || state.rulesVersion < 1) return corrupted('Versões ausentes ou inválidas.');
  if (state.schemaVersion !== PROGRESS_SCHEMA_VERSION || state.rulesVersion !== PROGRESS_RULES_VERSION) {
    return result('incompatible-version', 'Versão de esquema ou de regras não suportada.');
  }
  if (!isRecord(state.missions) || !isRecord(state.processedAttempts) || !isRecord(state.unlockedAchievements)
    || !Number.isSafeInteger(state.revision) || state.revision < 0) return corrupted('Estrutura ou revisão inválida.');

  const receipts = Object.entries(state.processedAttempts);
  if (state.revision < receipts.length) return corrupted('Revisão inferior ao número de tentativas processadas.');
  if (!receipts.length) {
    if (Object.keys(state.missions).length || Object.keys(state.unlockedAchievements).length || state.revision !== 0 || state.updatedAt !== null) {
      return corrupted('Progresso vazio contém registros ou metadados inconsistentes.');
    }
    return result('valid');
  }
  if (!isValidProgressDate(state.updatedAt)) return corrupted('Data de atualização inválida.');

  const byMission = new Map();
  for (const [attemptId, receipt] of receipts) {
    if (!hasId(attemptId) || !isRecord(receipt)) return corrupted('Tentativa processada malformada.');
    const mission = getMissionById(receipt.missionId);
    if (!mission || !Object.hasOwn(state.missions, mission.id)
      || !Number.isSafeInteger(receipt.correctCount) || receipt.correctCount < 0
      || receipt.totalQuestions !== mission.questionIds.length || receipt.correctCount > receipt.totalQuestions
      || !isValidProgressDate(receipt.completedAt) || receipt.completedAt > state.updatedAt
      || typeof receipt.answerSignature !== 'string') return corrupted(`Tentativa ${attemptId} inconsistente.`);
    let choices;
    try { choices = JSON.parse(receipt.answerSignature); } catch { return corrupted(`Assinatura inválida em ${attemptId}.`); }
    if (!Array.isArray(choices) || choices.length !== receipt.totalQuestions
      || !Array.from(choices).every((pair) => Array.isArray(pair) && pair.length === 2 && hasId(pair[0]) && hasId(pair[1]))
      || new Set(choices.map(([id]) => id)).size !== choices.length
      || choices.some(([id]) => !mission.questionIds.includes(id))) return corrupted(`Escolhas inválidas em ${attemptId}.`);
    const canonical = JSON.stringify([...choices].sort(([a], [b]) => a.localeCompare(b)));
    if (canonical !== receipt.answerSignature) return corrupted(`Assinatura não canônica em ${attemptId}.`);
    const answers = Object.fromEntries(choices);
    // Reutiliza a correção existente, sem manter um segundo gabarito.
    const evaluation = evaluateAttempt({ missionId: mission.id, completion: { missionId: mission.id, answers } }, getQuestionsByMission(mission.id));
    if (evaluation.status !== 'evaluated' || evaluation.correctCount !== receipt.correctCount) return corrupted(`Resultado da tentativa ${attemptId} diverge das escolhas.`);
    if (!byMission.has(mission.id)) byMission.set(mission.id, []);
    byMission.get(mission.id).push({ attemptId, ...receipt });
  }

  for (const [missionId, record] of Object.entries(state.missions)) {
    const mission = getMissionById(missionId);
    const best = record?.bestResult;
    const attempts = byMission.get(missionId);
    if (!mission || !isRecord(record) || !isRecord(best) || !attempts
      || !hasId(best.attemptId) || !Object.hasOwn(state.processedAttempts, best.attemptId)) return corrupted(`Referência de missão inválida: ${missionId}.`);
    const bestReceipt = state.processedAttempts[best.attemptId];
    const highestCount = attempts.reduce((highest, { correctCount }) => Math.max(highest, correctCount), 0);
    const dates = attempts.map(({ completedAt }) => completedAt).sort();
    if (bestReceipt.missionId !== missionId || best.correctCount !== bestReceipt.correctCount
      || best.totalQuestions !== bestReceipt.totalQuestions || best.correctCount !== highestCount
      || !Number.isSafeInteger(record.awardedXp)
      || record.awardedXp !== Math.floor(mission.xpReward * best.correctCount / best.totalQuestions)
      || !isValidProgressDate(record.firstCompletedAt) || !isValidProgressDate(record.lastCompletedAt)
      || record.firstCompletedAt !== dates[0] || record.lastCompletedAt !== dates[dates.length - 1]) return corrupted(`Melhor resultado, XP ou datas inconsistentes: ${missionId}.`);
  }

  const eligibleIds = new Set(getEligibleAchievements(state).map(({ id }) => id));
  for (const [id, unlock] of Object.entries(state.unlockedAchievements)) {
    const definition = achievements.find((achievement) => achievement.id === id);
    if (!definition || !isRecord(unlock) || !Number.isSafeInteger(unlock.ruleVersion) || unlock.ruleVersion < 1) return corrupted(`Conquista desconhecida ou malformada: ${id}.`);
    if (unlock.ruleVersion !== definition.ruleVersion) return result('incompatible-version', `Regra da conquista ${id} não suportada.`);
    if (!eligibleIds.has(id) || !isValidProgressDate(unlock.unlockedAt) || unlock.unlockedAt > state.updatedAt) return corrupted(`Desbloqueio inconsistente: ${id}.`);
    // Exige evidência do critério na data declarada, inclusive em eventos fora de ordem.
    const historicalMissions = {};
    for (const [missionId, attempts] of byMission) {
      const prior = attempts.filter(({ completedAt }) => completedAt <= unlock.unlockedAt);
      if (prior.length) historicalMissions[missionId] = { bestResult: { correctCount: prior.reduce((highest, { correctCount }) => Math.max(highest, correctCount), 0), totalQuestions: getMissionById(missionId).questionIds.length } };
    }
    if (!getEligibleAchievements({ missions: historicalMissions }).some((achievement) => achievement.id === id)) return corrupted(`Conquista ${id} antecede a evidência necessária.`);
  }
  // Conquistas elegíveis ainda ausentes são válidas: reconhecimento retroativo é explícito.
  return result('valid');
}
