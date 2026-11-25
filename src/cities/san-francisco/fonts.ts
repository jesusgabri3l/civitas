// Server only (layout). San Francisco: Jost for titles (Latin and Latin Extended, the same weight in both).
import '@fontsource/jost/latin-500.css';
import '@fontsource/jost/latin-ext-500.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import jost from '@fontsource/jost/files/jost-latin-500-normal.woff2?url';
import cormorantLatin from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2?url';

/** Files to preload on the page of this city. */
export const fontPreloads = [jost, cormorantLatin];
