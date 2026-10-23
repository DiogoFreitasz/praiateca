import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { QuizResultContext } from './QuizResultContext.js';
import { useProgress } from './ProgressContext.js';
import { createQuizCompletionStore, getCompletionDeliveryMessage, getCompletionDeliveryState } from '../services/quizCompletionStore.js';

export function QuizResultProvider({ children }) {
  const progress = useProgress();
  const [store] = useState(() => createQuizCompletionStore({ processCompletedAttempt: progress.processCompletedAttempt, retrySave: progress.retrySave }));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
  useEffect(() => { if (progress.isHydrated) store.retryPending(); }, [progress.isHydrated, store]);
  const value = useMemo(() => {
    const delivery = getCompletionDeliveryState(snapshot.delivery, progress);
    return {
      result: snapshot.result,
      completion: snapshot.completion,
      delivery,
      deliveryMessage: getCompletionDeliveryMessage(delivery),
      clearResult: store.clearResult,
      completeAttempt: store.completeAttempt,
      retryDelivery: store.retryDelivery,
    };
  }, [snapshot, progress, store]);

  return <QuizResultContext.Provider value={value}>{children}</QuizResultContext.Provider>;
}
