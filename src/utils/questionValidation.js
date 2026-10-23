export const hasText = (value) => typeof value === 'string' && value.trim().length > 0;

export function hasValidOptions(options) {
  return Array.isArray(options)
    && options.length >= 2
    // Array.from inclui lacunas: every/map sozinhos ignoram posições ausentes.
    && Array.from(options).every((option) => option && hasText(option.id) && hasText(option.text))
    && new Set(options.map(({ id }) => id)).size === options.length;
}
