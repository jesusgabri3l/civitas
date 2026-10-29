import type { HotspotScreen, OpenTooltip } from '../state/globeStore';

export interface TooltipPlacement {
  /** Side of the point where the label goes. */
  horizontal: 'left' | 'right';
  /** Which way the leader line leaves the point. */
  vertical: 'up' | 'down';
}

/**
 * The label opens towards the middle of the screen, where there is room: a point in the left half puts its label
 * to the right, a point in the upper half sends the line down. x and y are 0..1 viewport fractions.
 */
export function placementFor(x: number, y: number): TooltipPlacement {
  return { horizontal: x < 0.5 ? 'right' : 'left', vertical: y < 0.5 ? 'down' : 'up' };
}

/** The tooltip shows while it is open and its point is on the visible face of the globe. */
export function isTooltipShown(open: OpenTooltip | null, hotspot: HotspotScreen | undefined): boolean {
  return Boolean(open && hotspot && open.city === hotspot.id && hotspot.visible);
}

/** "14:07", 24 hour clock, in the given IANA time zone. */
export function formatLocalTime(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone }).format(now);
}
