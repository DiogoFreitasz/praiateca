import { applyCompletedAttempt, createInitialProgress, mergeProgress, recognizeAchievements } from '../utils/progress.js';
import { createProgressStorage } from './progressStorage.js';
import { validateProgress } from '../utils/progressValidation.js';

const ordered = (value) => {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, ordered(value[key])]));
  return value;
};
const sameProgress = (a, b) => JSON.stringify(ordered(a)) === JSON.stringify(ordered(b));
const freeze = (value) => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

// Coordenação imperativa testável; os cálculos continuam nas transições puras.
// Nenhum I/O ocorre na construção, no render ou em atualizadores de estado React.
export function createProgressStore({ storage = createProgressStorage(), now = () => new Date().toISOString() } = {}) {
  let snapshot = freeze({ progress: createInitialProgress(), hydrationStatus: 'loading', persistenceStatus: 'loading', hasPersistedData: false, hasPendingChanges: false, pendingAttemptIds: [], error: null });
  const serverSnapshot = snapshot;
  const listeners = new Set();
  const publish = (patch) => {
    snapshot = freeze({ ...snapshot, ...patch });
    listeners.forEach((listener) => listener());
  };
  const notReady = () => ({ accepted: false, status: 'not-ready', code: 'PROGRESS_NOT_HYDRATED', saved: false });
  const fail = (failure) => {
    publish({ persistenceStatus: failure.status === 'incompatible' ? 'incompatible' : 'error', error: { code: failure.code ?? failure.status, message: failure.message } });
    return { saved: false, persistenceStatus: snapshot.persistenceStatus, error: snapshot.error };
  };
  const recognize = (progress) => {
    const currentTime = now();
    return recognizeAchievements(progress, progress.updatedAt && progress.updatedAt > currentTime ? progress.updatedAt : currentTime).state;
  };

  const retrySave = () => {
    if (snapshot.hydrationStatus !== 'ready') return notReady();
    const latest = storage.read();
    if (!['loaded', 'empty'].includes(latest.status)) return fail(latest);
    let progress;
    try {
      progress = recognize(latest.status === 'loaded' ? mergeProgress(snapshot.progress, latest.state) : snapshot.progress);
    } catch (error) {
      return fail({ status: 'conflict', code: error.code ?? 'INVALID_PROGRESS', message: error.message });
    }
    const alreadySaved = latest.status === 'loaded' && sameProgress(progress, latest.state);
    const empty = Object.keys(progress.processedAttempts).length === 0;
    publish({ progress, hasPersistedData: latest.status === 'loaded', hasPendingChanges: !alreadySaved && !empty, persistenceStatus: alreadySaved ? 'saved' : 'unsaved', error: null });
    if (alreadySaved) {
      publish({ pendingAttemptIds: [], hasPendingChanges: false });
      return { saved: true, persistenceStatus: 'saved' };
    }
    if (empty) return { saved: false, persistenceStatus: 'unsaved' };
    const written = storage.write(progress);
    if (written.status !== 'saved') return fail(written);
    publish({ persistenceStatus: 'saved', hasPersistedData: true, hasPendingChanges: false, pendingAttemptIds: [], error: null });
    return { saved: true, persistenceStatus: 'saved' };
  };

  const hydrate = () => {
    if (snapshot.hydrationStatus === 'ready') return snapshot;
    const loaded = storage.read();
    if (loaded.status === 'loaded') {
      const progress = recognize(loaded.state);
      const changed = !sameProgress(progress, loaded.state);
      publish({ progress, hydrationStatus: 'ready', persistenceStatus: changed ? 'unsaved' : 'saved', hasPersistedData: true, hasPendingChanges: changed });
      if (changed) retrySave();
    } else {
      publish({ hydrationStatus: 'ready', persistenceStatus: 'unsaved' });
      if (loaded.status !== 'empty') fail(loaded);
    }
    return snapshot;
  };

  const processCompletedAttempt = (event) => {
    if (snapshot.hydrationStatus !== 'ready') return notReady();
    const latest = storage.read();
    let base;
    try {
      base = latest.status === 'loaded' ? mergeProgress(snapshot.progress, latest.state) : snapshot.progress;
    } catch (error) {
      fail({ status: 'conflict', code: error.code, message: error.message });
      throw error;
    }
    const outcome = applyCompletedAttempt(base, event);
    const validation = validateProgress(outcome.state);
    if (!validation.valid) {
      const error = new TypeError(validation.errors.join(' '));
      error.code = validation.status;
      throw error;
    }
    const pendingAttemptIds = outcome.changed ? [...new Set([...snapshot.pendingAttemptIds, event.attemptId])] : snapshot.pendingAttemptIds;
    publish({ progress: outcome.state, pendingAttemptIds, hasPendingChanges: snapshot.hasPendingChanges || outcome.changed, persistenceStatus: 'unsaved' });
    const saving = retrySave();
    return { ...outcome, state: snapshot.progress, accepted: true, ...saving, pendingAttemptIds: snapshot.pendingAttemptIds };
  };

  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    hydrate,
    processCompletedAttempt,
    retrySave,
    // Releitura evita aplicar newValue de um evento storage já ultrapassado.
    reconcile: retrySave,
  };
}
