// Public asset URLs (relative, so the build works from any base path).
export const STATEMENT_URL = 'statement/index.html';
export const STATEMENT_JSON_URL = 'data/statement.json';
export const PDF_URL = 'pdf/Sepire_Statement_v1.1.pdf';
export const pdfPageUrl = (n: number) => `pdf/page-${n}.webp`;
export const pdfThumbUrl = (n: number) => `pdf/thumb-${n}.webp`;
export const LOGO_URL = 'brand/sepire-logo.svg';
export const MARK_URL = 'brand/sepire-mark.svg';

/** The hosted statement that visitors browse on its own ("open in a new tab"). The tour, comparison and
 * data views keep driving the embedded copy above, which has to be served from the explorer's own origin. */
export const STATEMENT_TAB_URL = 'https://salesdemo.infoslipscloud.com/assets/_templates/Investment/Sepire/index.html';

/** Opens the hosted statement in a new tab at the given statement route. */
export function openStatementTab(route = '/overview'): void {
  window.open(`${STATEMENT_TAB_URL}#${route}`, '_blank', 'noopener');
}
