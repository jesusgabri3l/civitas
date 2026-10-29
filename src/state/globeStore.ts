import { atom } from 'nanostores';
import type { DestinationId } from '../data/destinations';

/** Where a hotspot sits on screen. x and y are 0..1 fractions of the viewport. */
export interface HotspotScreen {
  id: DestinationId;
  x: number;
  y: number;
  /** On the visible hemisphere (and inside the viewport). */
  visible: boolean;
}

export interface OpenTooltip {
  city: DestinationId;
  /** Pinned tooltips (tap, click, keyboard focus) stay open until dismissed; hover ones close when the pointer leaves. */
  pinned: boolean;
}

/** Written by the globe stage every frame it renders, read by the overlay. */
export const $hotspots = atom<HotspotScreen[]>([]);
export const $openTooltip = atom<OpenTooltip | null>(null);
/** City the user showed interest in (tooltip opened, list item focused): its stage should be warm. */
export const $preloadRequest = atom<DestinationId | null>(null);
/** Center of the view in degrees, rounded to the precision the screen shows. */
export const $viewCenter = atom<{ lat: number; lon: number }>({ lat: 43, lon: 13 });
/** true while the globe animates on its own (stars, auto-rotation); false once it paused for lack of interaction. */
export const $ambientActive = atom(true);
/** Where the globe sits on screen, as 0..1 fractions of the viewport (`height` is its diameter over the viewport height). */
export interface GlobeLayoutScreen {
  centerX: number;
  centerY: number;
  height: number;
}
export const $globeLayout = atom<GlobeLayoutScreen>({ centerX: 0.7, centerY: 0.5, height: 0.9 });
/** The user dragged or zoomed at least once: the usage hint goes away. */
export const $hasInteracted = atom(false);

const POSITION_TOLERANCE = 0.0005;

function sameHotspots(a: HotspotScreen[], b: HotspotScreen[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (item, i) =>
        item.id === b[i].id &&
        item.visible === b[i].visible &&
        Math.abs(item.x - b[i].x) < POSITION_TOLERANCE &&
        Math.abs(item.y - b[i].y) < POSITION_TOLERANCE,
    )
  );
}

/** Publishes hotspot positions, skipping updates that would not move anything. */
export function setHotspots(next: HotspotScreen[]) {
  if (!sameHotspots($hotspots.get(), next)) $hotspots.set(next);
}

/** Publishes the center of the view with one decimal, skipping updates the screen would not show. */
export function setViewCenter(lat: number, lon: number) {
  const next = { lat: Math.round(lat * 10) / 10, lon: Math.round(lon * 10) / 10 };
  const current = $viewCenter.get();
  if (current.lat !== next.lat || current.lon !== next.lon) $viewCenter.set(next);
}

export function setGlobeLayout(next: GlobeLayoutScreen) {
  const current = $globeLayout.get();
  const same = (Object.keys(next) as Array<keyof GlobeLayoutScreen>).every((key) => Math.abs(current[key] - next[key]) < 0.0005);
  if (!same) $globeLayout.set(next);
}

export function setAmbientActive(active: boolean) {
  if ($ambientActive.get() !== active) $ambientActive.set(active);
}

export function markInteracted() {
  if (!$hasInteracted.get()) $hasInteracted.set(true);
}

/** The globe stage registers how to turn to a city; resolves when the turn ends. */
let focusHandler: ((city: DestinationId) => Promise<void>) | null = null;

export function setFocusHandler(handler: ((city: DestinationId) => Promise<void>) | null) {
  focusHandler = handler;
}

/** Turns the globe until the city is centered. Resolves at once when there is no globe to turn. */
export async function focusCity(city: DestinationId): Promise<void> {
  await focusHandler?.(city);
}

/** A one-time interaction hint on touch devices (the globe nudges, the "Drag" pill pulses). */
export const $touchNudge = atom(false);
let nudgeClaimed = false;

/** true the first time it is asked, false after: the nudge plays once per visit. */
export function claimTouchNudge(): boolean {
  if (nudgeClaimed) return false;
  nudgeClaimed = true;
  return true;
}

let hideTimer: ReturnType<typeof setTimeout> | undefined;

export function requestPreload(city: DestinationId) {
  // Reset first so asking again for the same city (e.g. after its stage went to sleep) still notifies.
  $preloadRequest.set(null);
  $preloadRequest.set(city);
}

export function showTooltip(city: DestinationId, pinned: boolean) {
  cancelHideTooltip();
  const current = $openTooltip.get();
  // A hover must not downgrade a pinned tooltip of the same city.
  const keepPinned = current?.city === city && current.pinned;
  $openTooltip.set({ city, pinned: pinned || keepPinned });
  requestPreload(city);
}

export function hideTooltip() {
  cancelHideTooltip();
  if ($openTooltip.get()) $openTooltip.set(null);
}

/** Closes a hover tooltip after a short grace period (the pointer may be travelling to the label). */
export function scheduleHideTooltip(delayMs = 180) {
  cancelHideTooltip();
  if ($openTooltip.get()?.pinned) return;
  hideTimer = setTimeout(hideTooltip, delayMs);
}

export function cancelHideTooltip() {
  clearTimeout(hideTimer);
  hideTimer = undefined;
}

/** Warms a city's stage whenever the user shows interest in it. Returns a cleanup. */
export function bindPreload(preload: (city: DestinationId) => Promise<unknown>): () => void {
  return $preloadRequest.subscribe((city) => {
    if (!city) return;
    preload(city).catch((error) => console.error(`Could not preload "${city}".`, error));
  });
}

export function resetGlobeStoreForTests() {
  cancelHideTooltip();
  $hotspots.set([]);
  $openTooltip.set(null);
  $preloadRequest.set(null);
  $viewCenter.set({ lat: 43, lon: 13 });
  $ambientActive.set(true);
  $hasInteracted.set(false);
  $touchNudge.set(false);
  nudgeClaimed = false;
  $globeLayout.set({ centerX: 0.7, centerY: 0.5, height: 0.9 });
}
