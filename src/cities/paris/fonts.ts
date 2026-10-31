// Server only (layout). Paris: Bodoni Moda italic for titles (Latin only).
import '@fontsource/bodoni-moda/latin-400-italic.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import bodoniItalic from '@fontsource/bodoni-moda/files/bodoni-moda-latin-400-italic.woff2?url';
import cormorantLatin from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2?url';

/** Files to preload on the page of this city. */
export const fontPreloads = [bodoniItalic, cormorantLatin];
