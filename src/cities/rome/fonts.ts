// Server only (layout). Rome: Cinzel 500 for titles (Latin only).
import '@fontsource/cinzel/latin-500.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import cinzel from '@fontsource/cinzel/files/cinzel-latin-500-normal.woff2?url';
import cormorantLatin from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2?url';

/** Files to preload on the page of this city. */
export const fontPreloads = [cinzel, cormorantLatin];
