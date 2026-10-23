import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { ProgressContext } from './ProgressContext.js';
import { createProgressStore } from '../services/progressStore.js';
import { PROGRESS_STORAGE_KEY } from '../services/progressStorage.js';
import { getCatalogProgress, getMissionAwardedXp, getMissionBestResult, getProgressLevel } from '../utils/progress.js';

export function ProgressProvider({ children, storage, now }) {
  const [store] = useState(() => createProgressStore({ storage, now }));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === PROGRESS_STORAGE_KEY || event.key === null) store.reconcile();
    };
    if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
    store.hydrate();
    return () => { if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage); };
  }, [store]);

  const value = useMemo(() => ({
    ...snapshot,
    isHydrated: snapshot.hydrationStatus === 'ready',
    catalogProgress: getCatalogProgress(snapshot.progress),
    levelProgress: getProgressLevel(snapshot.progress),
    getMissionBestResult: (missionId) => getMissionBestResult(snapshot.progress, missionId),
    getMissionAwardedXp: (missionId) => getMissionAwardedXp(snapshot.progress, missionId),
    processCompletedAttempt: store.processCompletedAttempt,
    retrySave: store.retrySave,
    reconcile: store.reconcile,
  }), [snapshot, store]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}
