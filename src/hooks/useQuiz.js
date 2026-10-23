import { useReducer, useState } from 'react';

import { createQuizAttempt, getAttemptProgress, updateQuizAttempt } from '../utils/quizAttempt.js';
import { createAttemptId } from '../utils/attemptMetadata.js';

export default function useQuiz(missionId, questions) {
  const [initial] = useState(() => {
    try { return { attempt: createQuizAttempt(missionId, createAttemptId()), error: null }; }
    catch (error) { return { attempt: null, error: { code: error.code, message: error.message } }; }
  });
  const [attempt, dispatch] = useReducer(
    (state, action) => state ? updateQuizAttempt(state, action, questions) : state,
    initial.attempt,
  );

  if (!attempt) return { error: initial.error };

  return {
    ...attempt,
    ...getAttemptProgress(attempt, questions),
    currentQuestion: questions[attempt.currentIndex],
    selectAnswer: (optionId) => dispatch({ type: 'select', optionId }),
    previous: () => dispatch({ type: 'previous' }),
    next: () => dispatch({ type: 'next' }),
    finish: () => dispatch({ type: 'finish', completedAt: new Date().toISOString() }),
    restart: () => dispatch({ type: 'restart', attemptId: createAttemptId() }),
  };
}
