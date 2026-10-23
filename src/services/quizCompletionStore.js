import { getCompletedResult } from '../utils/quizResults.js';
import { isValidAttemptId } from '../utils/attemptMetadata.js';
import { isValidProgressDate } from '../utils/progressValidation.js';

const freeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

// Apenas consulta a situação atual do salvamento; nunca entrega uma conclusão.
export function getCompletionDeliveryState(delivery, progress) {
  if (!delivery?.accepted) return delivery;
  const pending = progress.pendingAttemptIds.includes(delivery.attemptId);
  const failed = ['error', 'incompatible'].includes(progress.persistenceStatus);
  const saved = !pending && !failed && (delivery.saved || progress.persistenceStatus === 'saved');
  return {
    ...delivery,
    status: saved ? 'saved' : 'unsaved',
    saved,
    persistenceStatus: saved ? 'saved' : progress.persistenceStatus,
    error: saved ? null : progress.error ?? delivery.error,
  };
}

export function getCompletionDeliveryMessage(delivery) {
  if (!delivery || delivery.saved) return null;
  if (delivery.status === 'waiting-hydration') return 'Suas respostas foram preservadas. Aguardando o carregamento do progresso para registrar a conclusão.';
  if (delivery.error?.code === 'ATTEMPT_CONFLICT') return 'Não foi possível registrar esta tentativa por um conflito de identificador. Suas respostas continuam disponíveis para revisão.';
  if (delivery.persistenceStatus === 'incompatible') return 'O progresso foi aplicado em memória, mas os dados salvos têm uma versão incompatível e foram preservados. Suas respostas continuam disponíveis.';
  if (delivery.error?.code === 'corrupted') return 'O progresso foi aplicado em memória, mas os dados salvos estão corrompidos e foram preservados. Suas respostas continuam disponíveis.';
  return delivery.accepted
    ? 'O progresso foi aplicado em memória, mas não pôde ser salvo. Suas respostas continuam disponíveis. Você pode tentar salvar novamente.'
    : 'Não foi possível registrar o progresso. Suas respostas continuam disponíveis para revisão.';
}

// Fronteira única de entrega, utilizada pelo QuizResultProvider e pelos testes.
// O cache evita chamadas redundantes; o registro persistido de attemptId é a
// proteção definitiva após remontagens/recargas. Não há I/O durante construção.
export function createQuizCompletionStore({ processCompletedAttempt, retrySave }) {
  let snapshot = freeze({ completion: null, result: getCompletedResult(null), delivery: null });
  const serverSnapshot = snapshot;
  const records = new Map();
  const listeners = new Set();
  const publish = (patch) => {
    snapshot = freeze({ ...snapshot, ...patch });
    listeners.forEach((listener) => listener());
  };
  const deliver = (record) => {
    try {
      const outcome = processCompletedAttempt(record.event);
      record.delivery = outcome.accepted ? {
        attemptId: record.event.attemptId, accepted: true, saved: outcome.saved,
        status: outcome.saved ? 'saved' : 'unsaved', processingStatus: outcome.status,
        persistenceStatus: outcome.persistenceStatus, xpDelta: outcome.xpDelta,
        newAchievements: [...outcome.newAchievements], error: outcome.error ?? null,
      } : {
        attemptId: record.event.attemptId, accepted: false, saved: false,
        status: 'waiting-hydration', persistenceStatus: 'loading',
        error: { code: outcome.code, message: 'Progresso ainda não hidratado.' },
      };
      if (outcome.accepted) record.event = null; // O progresso assume as pendências de gravação.
    } catch (error) {
      record.delivery = { attemptId: record.event.attemptId, accepted: false, saved: false, status: 'error', error: { code: error.code ?? 'INVALID_COMPLETION', message: error.message } };
    }
    if (snapshot.completion?.attemptId === record.delivery.attemptId && snapshot.signature === record.signature) {
      publish({ delivery: record.delivery });
    }
  };

  const completeAttempt = (attempt) => {
    const input = attempt?.completion;
    if (!input || typeof input.missionId !== 'string' || attempt.missionId !== input.missionId || !isValidAttemptId(input.attemptId)
      || !isValidProgressDate(input.completedAt) || !input.answers || typeof input.answers !== 'object' || Array.isArray(input.answers)
      || !Object.values(input.answers).every((answer) => typeof answer === 'string')
      || (attempt.attemptId !== undefined && attempt.attemptId !== input.attemptId)) {
      publish({ completion: null, result: { status: 'invalid', message: 'Os dados da tentativa concluída estão incompletos ou inválidos.' }, delivery: null, signature: null });
      return false;
    }
    const completion = freeze({ missionId: input.missionId, attemptId: input.attemptId, completedAt: input.completedAt, answers: { ...input.answers } });
    const signature = JSON.stringify([completion.missionId, completion.completedAt, Object.entries(completion.answers).sort(([a], [b]) => a.localeCompare(b))]);
    const previous = records.get(completion.attemptId);
    if (previous?.signature === signature && snapshot.completion?.attemptId === completion.attemptId && snapshot.signature === signature) return true;
    const result = getCompletedResult(completion);
    if (result.status !== 'ready') {
      publish({ completion, result, delivery: null, signature });
      return false;
    }
    // Cópias dos metadados do catálogo evitam congelar os objetos originais.
    const readOnlyResult = { ...result, mission: { ...result.mission, questionIds: [...result.mission.questionIds] }, subject: { ...result.subject } };
    publish({ completion, result: readOnlyResult, delivery: null, signature });
    if (previous && previous.signature !== signature) {
      publish({ delivery: { attemptId: completion.attemptId, accepted: false, saved: false, status: 'error', error: { code: 'ATTEMPT_CONFLICT', message: 'O mesmo identificador foi reutilizado com outro conteúdo.' } } });
      return true;
    }
    if (previous) {
      publish({ delivery: previous.delivery });
      return true;
    }
    const record = { signature, event: { missionId: completion.missionId, attemptId: completion.attemptId, evaluation: snapshot.result.evaluation, completedAt: completion.completedAt }, delivery: null };
    records.set(completion.attemptId, record);
    deliver(record);
    return true; // Uma falha de progresso não elimina o resultado pedagógico.
  };
  const retryPending = () => {
    for (const record of records.values()) {
      if (record.event && record.delivery?.status === 'waiting-hydration') deliver(record);
    }
  };
  const retryDelivery = () => {
    const record = records.get(snapshot.completion?.attemptId);
    if (!record || record.signature !== snapshot.signature) return { saved: false, status: 'error', code: 'ATTEMPT_CONFLICT' };
    if (!record.delivery.accepted) { deliver(record); return record.delivery; }
    return retrySave();
  };
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    completeAttempt,
    clearResult: () => publish({ completion: null, result: getCompletedResult(null), delivery: null, signature: null }),
    retryPending,
    retryDelivery,
  };
}
