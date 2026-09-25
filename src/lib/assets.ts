// Public asset URLs (relative, so the build works from any base path).
export const STATEMENT_URL = 'statement/index.html';
export const STATEMENT_JSON_URL = 'data/statement.json';
export const PDF_URL = 'pdf/Sepire_Statement_v1.1.pdf';
export const pdfPageUrl = (n: number) => `pdf/page-${n}.webp`;
export const pdfThumbUrl = (n: number) => `pdf/thumb-${n}.webp`;
export const LOGO_URL = 'brand/sepire-logo.svg';
export const MARK_URL = 'brand/sepire-mark.svg';

/** Opens the showcase statement in a new tab at the given statement route. */
export function openStatementTab(route = '/overview'): void {
  window.open(`${STATEMENT_URL}#${route}`, '_blank', 'noopener');
}
