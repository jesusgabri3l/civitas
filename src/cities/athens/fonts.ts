// Server only (layout). Athens: GFS Didot for titles; Cormorant Garamond is the reading face of every city (docs/ART-DIRECTION.md).
// Latin and Greek subsets only; unicode-range keeps the Greek file from downloading unless a Greek glyph is on the page.
import '@fontsource/gfs-didot/latin-400.css';
import '@fontsource/gfs-didot/greek-400.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-500.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import didotLatin from '@fontsource/gfs-didot/files/gfs-didot-latin-400-normal.woff2?url';
import cormorantLatin from '@fontsource/cormorant-garamond/files/cormorant-garamond-latin-400-normal.woff2?url';

/** Files to preload on the page of this city. */
export const fontPreloads = [didotLatin, cormorantLatin];
