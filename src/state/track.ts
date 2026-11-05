/** Umami custom events. Safe when the script is not there (dev, blocked by an extension): it just does nothing. */
export interface TrackEvents {
  city_open: { city: string; from: 'globe' | 'index' | 'url' };
  chapter_reached: { city: string; chapter: number };
  explore_view: { city: string; view: string };
  piece_open: { city: string; piece: string };
  suggest_sent: undefined;
}

interface UmamiTracker {
  track: (...args: unknown[]) => void;
}

const umami = () => (window as unknown as { umami?: UmamiTracker }).umami;

export function track<N extends keyof TrackEvents>(name: N, ...[data]: TrackEvents[N] extends undefined ? [] : [TrackEvents[N]]) {
  try {
    umami()?.track(name, data);
  } catch {
    // Analytics must never break the app.
  }
}

/** Umami hooks pushState/replaceState on its own; back and forward (popstate) it does not see, so those count here. */
export function trackPageview() {
  try {
    umami()?.track();
  } catch {
    // Analytics must never break the app.
  }
}
