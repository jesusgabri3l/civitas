// Server only (layout). New York: Libre Caslon Display for titles (Latin only).
import '@fontsource/libre-caslon-display/latin-400.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import caslon from '@fontsource/libre-caslon-display/files/libre-caslon-display-latin-400-normal.woff2?url';
import cormorantLatin from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2?url';

/** Files to preload on the page of this city. */
export const fontPreloads = [caslon, cormorantLatin];
