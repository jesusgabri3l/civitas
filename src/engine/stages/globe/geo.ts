import { Euler, Matrix4, Vector3, type PerspectiveCamera } from 'three';

export const GLOBE_FOV = 40;
export const DEG = Math.PI / 180;

/** Where the globe ends up facing: the middle of the three monuments. */
export const EUROPE = { lat: 43, lon: 13 };

/**
 * 'stacked': headline on top (centered), a very large globe below, at every screen size.
 * 'split': headline left, globe right on wide screens (stacked only on narrow ones). Keep in sync with $layout in _variables.scss.
 */
export const LAYOUT: 'stacked' | 'split' = 'stacked';

/** In 'split', below this width/height ratio the layout stacks (text on top, globe below). Keep in sync with the stylesheet. */
export const STACKED_MAX_ASPECT = 1.2;

export interface GlobeLayout {
  /** Globe center as a 0..1 fraction of the viewport. */
  centerX: number;
  centerY: number;
  /** Globe diameter as a fraction of the short side of the viewport. */
  diameter: number;
  /** Globe diameter as a fraction of the viewport height. */
  height: number;
  /** The globe rests low (cropped by the bottom edge) and rises under the headline on interaction. */
  raisable: boolean;
}

/** At rest the globe is cut by the bottom edge: at most this share of its height is below it (wide stacked layout). */
const REST_VISIBLE = 0.5;
/** At rest the view looks this many degrees south of the target, so the cities ride high in the visible cap. */
export const REST_TILT_DEGREES = 30;

/** Estimated bottom edge of the headline block (0..1 of the height): keep in sync with _overlay-headline.scss (stacked). */
function headlineReserve(widthPx: number, heightPx: number): number {
  const font = Math.min(64, Math.max(28, 0.034 * widthPx + 14.4));
  const top = Math.max(68, 0.09 * heightPx);
  return Math.min(0.6, (top + 2.24 * font + 46) / heightPx + 72 / heightPx);
}

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

/**
 * Where the settled globe sits: to the right of the headline on wide screens, below it on narrow ones.
 * Sizes are chosen so the hotspots stay at least a touch target apart.
 */
export function globeLayout(aspect: number, raised = 0, heightPx = 900): GlobeLayout {
  if (LAYOUT === 'stacked' && aspect >= STACKED_MAX_ASPECT) {
    // Wide screen, stacked. At rest: sized by the width so the crop is always the same share of the globe, never above the
    // headline. Raised: it fits (almost whole) in the space the headline leaves.
    const reserve = headlineReserve(aspect * heightPx, heightPx);
    const restDiameter = Math.min(0.64 * aspect, (1 - reserve) / REST_VISIBLE);
    const restCenterY = reserve + restDiameter / 2; // the top sits right under the headline; the rest spills off the bottom
    const raisedDiameter = Math.min(restDiameter, (1 - reserve) * 1.04);
    const raisedCenterY = reserve + raisedDiameter / 2;
    const diameter = lerp(restDiameter, raisedDiameter, raised);
    return { centerX: 0.5, centerY: lerp(restCenterY, raisedCenterY, raised), diameter, height: diameter, raisable: true };
  }
  if (LAYOUT === 'split' && aspect >= STACKED_MAX_ASPECT) {
    const diameter = Math.min(0.9, 0.64 * aspect);
    return { centerX: 1 - (diameter / 2 + 0.05 * aspect) / aspect, centerY: 0.5, diameter, height: diameter, raisable: false };
  }
  // Height is 1 here; the short side is the width when portrait.
  const shortSide = Math.min(1, aspect);
  const diameterOfHeight = Math.min(0.64, 1.5 * aspect);
  return {
    centerX: 0.5,
    centerY: 1 - (diameterOfHeight / 2 + 0.02),
    diameter: diameterOfHeight / shortSide,
    height: diameterOfHeight,
    raisable: false,
  };
}
/** Hotspot buttons are at least this many px apart at the settled framing (touch target size). */
export const MIN_HOTSPOT_SEPARATION_PX = 44;

/** Latitude/longitude (degrees) to a point on a sphere. lat 0 / lon 0 faces +Z (towards the camera). */
export function latLonToVector3(lat: number, lon: number, radius = 1, target = new Vector3()): Vector3 {
  const phi = lat * DEG;
  const lambda = lon * DEG;
  return target.set(radius * Math.cos(phi) * Math.sin(lambda), radius * Math.sin(phi), radius * Math.cos(phi) * Math.cos(lambda));
}

/** Rotation of the globe (tilt around X, then yaw around Y) that brings a lat/lon to the center of the screen. */
export function orientationFor({ lat, lon }: { lat: number; lon: number }) {
  return { tilt: lat * DEG, yaw: -lon * DEG };
}

export function rotationMatrix(tilt: number, yaw: number): Matrix4 {
  return new Matrix4().makeRotationFromEuler(new Euler(tilt, yaw, 0, 'XYZ'));
}

/** tan of the half field of view along the short side of the screen. */
function shortSideHalfTan(aspect: number, fov: number): number {
  const vertical = Math.tan((fov * DEG) / 2);
  return aspect >= 1 ? vertical : vertical * aspect;
}

/** Camera distance that shows the whole globe with a margin. */
export function fitDistance(aspect: number, fov = GLOBE_FOV): number {
  return 1.18 / Math.sin(Math.atan(shortSideHalfTan(aspect, fov)));
}

/** The settled framing is this much closer than the plain layout extent (three wheel notches: 1.197 is one notch of GlobeControls). */
const INITIAL_ZOOM_IN = 1.2 * 1.197 ** 2;

/** The wide stacked layout already sizes the globe as it should look: no extra zoom. */
function initialZoomIn(aspect: number): number {
  return LAYOUT === 'stacked' && aspect >= STACKED_MAX_ASPECT ? 1 : INITIAL_ZOOM_IN;
}

/** Camera distance of the settled Europe framing (closer than the fit distance). */
export function settledDistance(aspect: number, fov = GLOBE_FOV, raised = 0, heightPx = 900): number {
  const { diameter } = globeLayout(aspect, raised, heightPx);
  if (LAYOUT === 'stacked' && aspect >= STACKED_MAX_ASPECT) {
    // Exact: the silhouette's half-size on screen is 1 / sqrt(d^2 - 1) in tan units, and must equal diameter x tan(half fov).
    const needed = 1 / (diameter * shortSideHalfTan(aspect, fov));
    return Math.sqrt(1 + needed * needed);
  }
  const extent = 2 / diameter; // visible span across the short side, in globe radii
  return 1 + extent / initialZoomIn(aspect) / (2 * shortSideHalfTan(aspect, fov));
}

/** Surface arc (radians) covered by one screen pixel at this camera distance. */
export function radiansPerPixel(distance: number, aspect: number, shortSidePx: number, fov = GLOBE_FOV): number {
  const visibleExtent = (distance - 1) * 2 * shortSideHalfTan(aspect, fov);
  return visibleExtent / Math.max(shortSidePx, 1);
}

export interface ScreenPoint {
  /** 0..1 from the left edge of the viewport. */
  x: number;
  /** 0..1 from the top edge of the viewport. */
  y: number;
  /** On the visible hemisphere and inside the viewport. */
  visible: boolean;
}

const FACING_MIN = 0.15;

/** Projects a point of the unit sphere (globe rotated by `rotation`) to the viewport. */
export function projectToScreen(point: Vector3, rotation: Matrix4, camera: PerspectiveCamera): ScreenPoint {
  const world = point.clone().applyMatrix4(rotation);
  const toCamera = camera.position.clone().sub(world).normalize();
  const facing = world.clone().normalize().dot(toCamera);
  const ndc = world.clone().project(camera);
  const inside = Math.abs(ndc.x) <= 1.02 && Math.abs(ndc.y) <= 1.02;
  return { x: (ndc.x + 1) / 2, y: (1 - ndc.y) / 2, visible: facing > FACING_MIN && inside };
}

/** Splits an arc between two points of the unit sphere so chords stay close to the surface. */
export function arcPoints(from: Vector3, to: Vector3, maxStepRadians: number): Vector3[] {
  const angle = from.angleTo(to);
  const steps = Math.max(1, Math.ceil(angle / maxStepRadians));
  return Array.from({ length: steps + 1 }, (_, i) => from.clone().lerp(to, i / steps).normalize());
}

/** The user may zoom in to this fraction of the settled framing's distance to the surface. */
const CLOSEST_FRACTION = 0.4;
/** ...and out to this multiple of the whole-globe fit distance. */
const FARTHEST_OVER_FIT = 1.35;

/** Camera distance limits for zooming: never inside the globe, never lost in space. */
export function zoomLimits(aspect: number, fov = GLOBE_FOV): { min: number; max: number } {
  return {
    min: 1 + (settledDistance(aspect, fov) - 1) * CLOSEST_FRACTION,
    max: fitDistance(aspect, fov) * FARTHEST_OVER_FIT,
  };
}

export function clampDistance(distance: number, aspect: number, fov = GLOBE_FOV): number {
  const { min, max } = zoomLimits(aspect, fov);
  return Math.min(max, Math.max(min, distance));
}

/** Longitude wrapped to (-180, 180]. */
export function wrapLongitude(lon: number): number {
  const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
  return wrapped === -180 ? 180 : wrapped;
}

/** Lat/lon (degrees) of the point of the globe facing the camera, for a globe rotated by (tilt, yaw). */
export function viewCenter(tilt: number, yaw: number): { lat: number; lon: number } {
  return { lat: tilt / DEG, lon: wrapLongitude(-yaw / DEG) };
}

/** "48.8°N 2.3°E": one decimal, hemisphere letters. */
export function formatCoordinates(lat: number, lon: number): string {
  const roundedLat = Math.round(lat * 10) / 10;
  const roundedLon = Math.round(wrapLongitude(lon) * 10) / 10;
  const ns = roundedLat < 0 ? 'S' : 'N';
  const ew = roundedLon < 0 ? 'W' : 'E';
  return `${Math.abs(roundedLat).toFixed(1)}°${ns} ${Math.abs(roundedLon).toFixed(1)}°${ew}`;
}
