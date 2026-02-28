/**
 * Sanitize user input for safe use inside PostgREST .or() / .ilike() filter strings.
 * Escapes LIKE wildcards (%, _) and strips PostgREST structural chars (., comma, parens).
 */
export function sanitizeFilterValue(input: string): string {
  if (!input) return '';
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/[.,()]/g, '');
}
