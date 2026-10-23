import { createContext, useContext } from 'react';

export const QuizResultContext = createContext(null);

export function useQuizResult() {
  return useContext(QuizResultContext);
}
