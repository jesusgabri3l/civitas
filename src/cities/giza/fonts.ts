// Server only (layout). Giza: Rokkitt 600 for titles (Latin and Latin Extended: accents and ñ).
import '@fontsource/rokkitt/latin-600.css';
import '@fontsource/rokkitt/latin-ext-600.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import rokkitt from '@fontsource/rokkitt/files/rokkitt-latin-600-normal.woff2?url';
import cormorantLatin from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2?url';

/** Files to preload on the page of this city. */
export const fontPreloads = [rokkitt, cormorantLatin];
