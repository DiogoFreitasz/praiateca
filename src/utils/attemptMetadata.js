export const isValidAttemptId = (value) => typeof value === 'string' && value.trim().length > 0 && value === value.trim();

// Chamado pela camada de comandos, nunca pelo reducer. Não usa Math.random.
export function createAttemptId(randomSource = globalThis.crypto) {
  if (typeof randomSource?.randomUUID === 'function') {
    try { return randomSource.randomUUID(); } catch { /* Tenta a outra fonte criptográfica. */ }
  }
  if (typeof randomSource?.getRandomValues === 'function') {
    const bytes = randomSource.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  const error = new Error('Este navegador não disponibiliza uma fonte segura para identificar a tentativa.');
  error.code = 'SECURE_RANDOM_UNAVAILABLE';
  throw error;
}
