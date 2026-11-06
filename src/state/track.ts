/** Umami custom events. Safe when the script is not there (dev, blocked by an extension): it just does nothing. */
export interface TrackEvents {
  city_open: { city: string; from: 'globe' | 'index' | 'url' };
  chapter_reached: { city: string; chapter: number };
  explore_view: { city: string; view: string };
  piece_open: { city: string; piece: string };
  suggest_sent: undefined;
  web_vital: { name: string; value: number; rating: string; path: string };
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

/** RUM: LCP, INP and CLS of this load, read by hand in Umami (Events → web_vital). Production only, loaded off the critical path. */
export function startWebVitals() {
  if (!import.meta.env.PROD) return;
  void import('web-vitals')
    .then(({ onLCP, onINP, onCLS }) => {
      const send = ({ name, value, rating }: { name: string; value: number; rating: string }) =>
        track('web_vital', { name, value: name === 'CLS' ? Math.round(value * 1000) / 1000 : Math.round(value), rating, path: location.pathname });
      onLCP(send);
      onINP(send);
      onCLS(send);
    })
    .catch(() => {
      // Analytics must never break the app.
    });
}

/** Umami hooks pushState/replaceState on its own; back and forward (popstate) it does not see, so those count here. */
export function trackPageview() {
  try {
    umami()?.track();
  } catch {
    // Analytics must never break the app.
  }
}
