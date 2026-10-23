import { createContext, useContext } from 'react';

export const ProgressContext = createContext(null);

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) throw new Error('useProgress deve ser usado dentro de ProgressProvider.');
  return context;
}
