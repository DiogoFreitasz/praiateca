import { getMissionById, missions } from '../data/missions.js';
import { calculateAttemptXp, getLevelProgress, getMaxXp } from './gamification.js';
import { getEligibleAchievements } from '../data/achievements.js';
import { isValidProgressDate, PROGRESS_RULES_VERSION, PROGRESS_SCHEMA_VERSION, validateProgress } from './progressValidation.js';

export function createInitialProgress() {
  return { schemaVersion: PROGRESS_SCHEMA_VERSION, rulesVersion: PROGRESS_RULES_VERSION, missions: {}, processedAttempts: {}, unlockedAchievements: {}, revision: 0, updatedAt: null };
}

const isRecord = (value) => value !== null && typeof value === 'object'
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

function assertProgress(state) {
  const validation = validateProgress(state);
  if (!validation.valid) {
    const error = new TypeError(validation.errors.join(' '));
    error.code = validation.status;
    throw error;
  }
}

function addEligibleAchievements(state, recognizedAt) {
  const newlyEligible = getEligibleAchievements(state).filter(({ id }) => !Object.hasOwn(state.unlockedAchievements, id));
  if (!newlyEligible.length) return { state, newAchievements: [] };
  const additions = Object.fromEntries(newlyEligible.map(({ id, ruleVersion }) => [id, { ruleVersion, unlockedAt: recognizedAt }]));
  return { state: { ...state, unlockedAchievements: { ...state.unlockedAchievements, ...additions } }, newAchievements: newlyEligible.map(({ id }) => id) };
}

export function recognizeAchievements(state, recognizedAt) {
  assertProgress(state);
  if (!isValidProgressDate(recognizedAt) || (state.updatedAt && recognizedAt < state.updatedAt)) {
    throw new TypeError('Horário de reconhecimento inválido ou anterior à atualização do progresso.');
  }
  const recognized = addEligibleAchievements(state, recognizedAt);
  if (!recognized.newAchievements.length) return { state, changed: false, newAchievements: [] };
  if (state.revision === Number.MAX_SAFE_INTEGER) throw new RangeError('Limite de revisões do progresso atingido.');
  return { ...recognized, state: { ...recognized.state, revision: state.revision + 1, updatedAt: recognizedAt }, changed: true };
}

export function getTotalXp(state) {
  assertProgress(state);
  return Object.values(state.missions).reduce((total, record) => total + record.awardedXp, 0);
}

export function getCompletedMissionCount(state) {
  assertProgress(state);
  return Object.keys(state.missions).length;
}

export function getMissionBestResult(state, missionId) {
  assertProgress(state);
  if (!getMissionById(missionId)) throw new RangeError('Missão desconhecida.');
  return Object.hasOwn(state.missions, missionId) ? { ...state.missions[missionId].bestResult } : null;
}

export function getMissionAwardedXp(state, missionId) {
  getMissionBestResult(state, missionId);
  return Object.hasOwn(state.missions, missionId) ? state.missions[missionId].awardedXp : 0;
}

export function getCatalogProgress(state) {
  const completedMissions = getCompletedMissionCount(state);
  return {
    completedMissions,
    totalMissions: missions.length,
    completionPercentage: completedMissions / missions.length * 100,
    totalXp: getTotalXp(state),
    maxXp: getMaxXp(),
  };
}

export function getProgressLevel(state) {
  return getLevelProgress(getTotalXp(state));
}

// O evento recebe evaluation já produzida pela correção existente e data ISO UTC.
// Nenhum ID, relógio, efeito React ou armazenamento é acessado nesta transição.
export function applyCompletedAttempt(state, { missionId, attemptId, evaluation, completedAt } = {}) {
  assertProgress(state);
  const attemptXp = calculateAttemptXp(missionId, evaluation);
  if (typeof attemptId !== 'string' || !attemptId.trim() || attemptId !== attemptId.trim()) {
    throw new TypeError('O identificador da tentativa deve ser uma string não vazia e sem espaços nas extremidades.');
  }
  if (!isValidProgressDate(completedAt)) {
    throw new TypeError('A conclusão deve informar uma data ISO UTC canônica.');
  }
  // Inclui as escolhas para detectar o mesmo ID com respostas diferentes,
  // mesmo quando a quantidade de acertos coincide. Não replica o gabarito.
  const answerSignature = JSON.stringify(evaluation.evaluations
    .map(({ questionId, selectedOption }) => [questionId, selectedOption.id])
    .sort(([first], [second]) => first.localeCompare(second)));
  const receipt = { missionId, correctCount: evaluation.correctCount, totalQuestions: evaluation.totalQuestions, completedAt, answerSignature };
  if (Object.hasOwn(state.processedAttempts, attemptId)) {
    const previous = state.processedAttempts[attemptId];
    if (!isRecord(previous) || Object.keys(receipt).some((key) => previous[key] !== receipt[key])) {
      const error = new Error('Identificador de tentativa reutilizado com conteúdo conflitante.');
      error.code = 'ATTEMPT_CONFLICT';
      throw error;
    }
    return { state, changed: false, xpDelta: 0, status: 'duplicate', newAchievements: [] };
  }
  if (state.revision === Number.MAX_SAFE_INTEGER) throw new RangeError('Limite de revisões do progresso atingido.');

  const previous = state.missions[missionId];
  const improved = !previous || evaluation.correctCount > previous.bestResult.correctCount;
  const awardedXp = Math.max(previous?.awardedXp ?? 0, attemptXp);
  const record = {
    firstCompletedAt: previous && previous.firstCompletedAt < completedAt ? previous.firstCompletedAt : completedAt,
    lastCompletedAt: previous && previous.lastCompletedAt > completedAt ? previous.lastCompletedAt : completedAt,
    bestResult: improved ? { attemptId, correctCount: evaluation.correctCount, totalQuestions: evaluation.totalQuestions } : previous.bestResult,
    awardedXp,
  };
  const nextState = {
    ...state,
    missions: { ...state.missions, [missionId]: record },
    processedAttempts: { ...state.processedAttempts, [attemptId]: receipt },
    revision: state.revision + 1,
    updatedAt: state.updatedAt && state.updatedAt > completedAt ? state.updatedAt : completedAt,
  };
  const recognized = addEligibleAchievements(nextState, nextState.updatedAt);
  return {
    ...recognized,
    changed: true,
    xpDelta: awardedXp - (previous?.awardedXp ?? 0),
    status: 'applied',
  };
}

// Mescla documentos válidos sem relógio ou I/O. Revisão é metadado, não um lock.
export function mergeProgress(left, right) {
  assertProgress(left);
  assertProgress(right);
  if (left === right) return left;
  const processedAttempts = {};
  for (const id of [...new Set([...Object.keys(left.processedAttempts), ...Object.keys(right.processedAttempts)])].sort()) {
    const a = Object.hasOwn(left.processedAttempts, id) ? left.processedAttempts[id] : null;
    const b = Object.hasOwn(right.processedAttempts, id) ? right.processedAttempts[id] : null;
    if (a && b && ['missionId', 'correctCount', 'totalQuestions', 'completedAt', 'answerSignature'].some((key) => a[key] !== b[key])) {
      const error = new Error(`Tentativa conflitante entre documentos: ${id}.`);
      error.code = 'ATTEMPT_CONFLICT';
      throw error;
    }
    const source = a ?? b;
    const receipt = Object.fromEntries(['missionId', 'correctCount', 'totalQuestions', 'completedAt', 'answerSignature'].map((key) => [key, source[key]]));
    Object.defineProperty(processedAttempts, id, { value: receipt, enumerable: true, writable: true, configurable: true });
  }
  const mergedMissions = {};
  for (const id of [...new Set([...Object.keys(left.missions), ...Object.keys(right.missions)])].sort()) {
    const candidates = [left.missions[id], right.missions[id]].filter(Boolean);
    // Empates entre abas: data da tentativa e ID. A ordem dos argumentos não decide.
    candidates.sort((a, b) => {
      if (a.bestResult.correctCount !== b.bestResult.correctCount) return b.bestResult.correctCount - a.bestResult.correctCount;
      const aDate = processedAttempts[a.bestResult.attemptId].completedAt;
      const bDate = processedAttempts[b.bestResult.attemptId].completedAt;
      if (aDate !== bDate) return aDate < bDate ? -1 : 1;
      return a.bestResult.attemptId < b.bestResult.attemptId ? -1 : a.bestResult.attemptId > b.bestResult.attemptId ? 1 : 0;
    });
    mergedMissions[id] = {
      firstCompletedAt: candidates.map((record) => record.firstCompletedAt).sort()[0],
      lastCompletedAt: candidates.map((record) => record.lastCompletedAt).sort().at(-1),
      bestResult: {
        attemptId: candidates[0].bestResult.attemptId,
        correctCount: candidates[0].bestResult.correctCount,
        totalQuestions: candidates[0].bestResult.totalQuestions,
      },
      awardedXp: candidates.reduce((highest, record) => Math.max(highest, record.awardedXp), 0),
    };
  }
  const unlockedAchievements = {};
  for (const id of [...new Set([...Object.keys(left.unlockedAchievements), ...Object.keys(right.unlockedAchievements)])].sort()) {
    const candidates = [left.unlockedAchievements[id], right.unlockedAchievements[id]].filter(Boolean);
    candidates.sort((a, b) => a.unlockedAt < b.unlockedAt ? -1 : a.unlockedAt > b.unlockedAt ? 1 : 0);
    unlockedAchievements[id] = { ruleVersion: candidates[0].ruleVersion, unlockedAt: candidates[0].unlockedAt };
  }
  const merged = {
    schemaVersion: PROGRESS_SCHEMA_VERSION,
    rulesVersion: PROGRESS_RULES_VERSION,
    missions: mergedMissions,
    processedAttempts,
    unlockedAchievements,
    revision: Math.max(left.revision, right.revision, Object.keys(processedAttempts).length),
    updatedAt: [left.updatedAt, right.updatedAt].filter(Boolean).sort().at(-1) ?? null,
  };
  assertProgress(merged);
  return merged;
}
