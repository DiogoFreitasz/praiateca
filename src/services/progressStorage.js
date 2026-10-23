import { validateProgress } from '../utils/progressValidation.js';

export const PROGRESS_STORAGE_KEY = 'praiateca.progress.v1';

// O acesso ao navegador é adiado até read/write, inclusive o getter localStorage.
export function createProgressStorage(injectedStorage) {
  const resolveStorage = () => injectedStorage ?? (typeof window !== 'undefined' ? window.localStorage : null);
  const read = () => {
    try {
      const storage = resolveStorage();
      if (!storage || typeof storage.getItem !== 'function') return { status: 'unavailable', operation: 'read', message: 'Armazenamento indisponível.' };
      const raw = storage.getItem(PROGRESS_STORAGE_KEY);
      if (raw === null) return { status: 'empty' };
      let state;
      try { state = JSON.parse(raw); } catch { return { status: 'corrupted', message: 'JSON de progresso inválido.' }; }
      const validation = validateProgress(state);
      if (!validation.valid) return { status: validation.status === 'incompatible-version' ? 'incompatible' : 'corrupted', message: validation.errors.join(' ') };
      return { status: 'loaded', state };
    } catch (error) {
      return { status: 'unavailable', operation: 'read', message: error.message };
    }
  };
  const write = (state) => {
    const validation = validateProgress(state);
    if (!validation.valid) return { status: 'invalid-state', message: validation.errors.join(' ') };
    const existing = read();
    if (!['empty', 'loaded'].includes(existing.status)) return existing;
    try {
      const storage = resolveStorage();
      if (!storage || typeof storage.setItem !== 'function') return { status: 'unavailable', operation: 'write', message: 'Gravação indisponível.' };
      storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state));
      return { status: 'saved' };
    } catch (error) {
      return { status: 'unavailable', operation: 'write', message: error.message };
    }
  };
  return { read, write };
}
