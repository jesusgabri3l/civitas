import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  LineBasicMaterial,
  LineSegments,
  ShaderMaterial,
  Vector3,
} from 'three';
import { PALETTE } from './palette';
import { coastlines, graticule, segmentsFromPolylines } from './landData';

/** Direction towards the light, in view space (up-left, in front of the globe). It stays put while the globe turns. */
const LIGHT_DIRECTION = new Vector3(-0.62, 0.38, 0.69).normalize();

const GLOBE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const GLOBE_FRAGMENT = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uShadow;
  uniform vec3 uWarm;
  uniform vec3 uPaper;
  uniform vec3 uLight;
  uniform vec3 uAtmosphere;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vec3 normal = normalize(vNormal);
    vec3 view = normalize(-vViewPosition);
    float ndl = dot(normal, uLight);
    float ndv = max(dot(normal, view), 0.0);
    // Wrapped (half-lambert) light: a long, soft terminator, like a sculpture under one lamp.
    float lit = smoothstep(0.12, 0.98, ndl * 0.5 + 0.5);
    vec3 color = mix(uShadow, uBase * 1.32, lit);
    // Warm side light, and a faint bounce on the terminator so the shadow never goes flat.
    color += uWarm * pow(max(ndl, 0.0), 1.6) * 0.07;
    color += uWarm * smoothstep(0.0, 0.5, 1.0 - abs(ndl) * 2.2) * 0.012;
    // Paper edge: a thin pale rim at the limb, stronger on the lit side.
    float limb = 1.0 - smoothstep(0.0, 0.1, ndv);
    color += uPaper * limb * (0.05 + 0.1 * lit);
    // Inward scattering: the atmosphere seen through its own thickness at grazing angles, mostly on the lit side.
    float rim = pow(1.0 - ndv, 4.0);
    color += uAtmosphere * rim * 0.34 * smoothstep(-0.25, 0.5, ndl);
    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Stylized plaster sphere: matte, one soft light, a faint blue breath at the limb. */
export function createGlobeMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: GLOBE_VERTEX,
    fragmentShader: GLOBE_FRAGMENT,
    uniforms: {
      uBase: { value: new Color(0x2a2824) },
      uShadow: { value: new Color(0x1b1a17) },
      uWarm: { value: new Color(0xf2d9b0) },
      uPaper: { value: new Color(PALETTE.text) },
      uLight: { value: LIGHT_DIRECTION.clone() },
      uAtmosphere: { value: new Color(PALETTE.atmosphere) },
    },
  });
}

function createLines(polylines: ReturnType<typeof coastlines>, radius: number, color: number, opacity: number, name: string) {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(segmentsFromPolylines(polylines, radius), 3));
  const lines = new LineSegments(geometry, new LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
  lines.name = name;
  return lines;
}

/** Faint graticule riding on the globe. */
export const createGraticule = () => createLines(graticule(30), 1.001, PALETTE.text, 0.1, 'globe-graticule');

/** Coastlines (amber-ish, readable). Built apart from the graticule: the stage yields to the main thread between the two. */
export const createCoastlines = () => createLines(coastlines(), 1.002, PALETTE.text, 0.6, 'globe-coastlines');

/** The atmosphere shell is this many globe radii wide; it is thin and hugs the limb. */
export const HALO_RADIUS = 1.09;

const LIMB_VERTEX = /* glsl */ `
  varying vec3 vViewPosition;
  varying vec3 vCenter;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = viewPosition.xyz;
    vCenter = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;

// The closest approach of the view ray to the globe center is exactly 1.0 at the limb, so (impact - 1) is the height above
// the surface. A fresnel-like thin layer: dense at the limb, exponential falloff, strong on the lit side and almost none on
// the dark one, with a slow low-frequency wobble along the limb so it never reads as a perfect ring.
const LIMB_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uLine;
  uniform vec3 uLight;
  uniform float uZoom;
  uniform float uTime;
  varying vec3 vViewPosition;
  varying vec3 vCenter;
  void main() {
    float impact = length(cross(normalize(vViewPosition), vCenter));
    float h = max(impact - 1.0, 0.0);
    float fade = 1.0 - smoothstep(0.0, ${(HALO_RADIUS - 1).toFixed(2)}, h);
    fade *= fade;
    vec2 away = normalize(vViewPosition.xy - vCenter.xy);
    float sun = dot(away, normalize(uLight.xy));
    float lit = mix(0.22, 1.0, smoothstep(-0.55, 0.65, sun));
    float angle = atan(away.y, away.x);
    float wobble = 0.82 + 0.18 * sin(angle * 3.0 + uTime * 0.05) * sin(angle * 5.0 - uTime * 0.035 + 1.7);
    // Bright and tight at the limb, quick falloff: it reads as light, not as haze. A thin cream line rides right on the edge.
    float line = exp(-h * 140.0);
    float density = line * 0.22 + exp(-h * 42.0) * 0.12 + exp(-h * 16.0) * 0.014;
    // Zooming out shrinks the globe on screen, so the same glow would read as a thicker ring: thin it out instead.
    float distanceFade = mix(0.35, 1.0, smoothstep(-0.5, 0.15, uZoom));
    float alpha = density * fade * lit * wobble * distanceFade;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(mix(uColor, uLine, clamp(line * 1.4, 0.0, 1.0)), alpha);
  }
`;

/** Thin back-face shell that draws only a limb-hugging amber edge, lit from one side. */
export function createLimbMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: LIMB_VERTEX,
    fragmentShader: LIMB_FRAGMENT,
    uniforms: {
      uColor: { value: new Color(PALETTE.halo) },
      uLine: { value: new Color(PALETTE.limbLine) },
      uLight: { value: LIGHT_DIRECTION.clone() },
      uZoom: { value: 0 },
      uTime: { value: 0 },
    },
    side: BackSide,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}

/** Half-size of the glow plane, in globe radii. The glow is gone well before reaching it. */
export const HALO_EXTENT = 2.8;

const GLOW_VERTEX = /* glsl */ `
  varying vec2 vPlane;
  void main() {
    vPlane = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// A plane through the globe center, facing the camera. The globe hides the middle of it; what shows is a bloom: strongest
// at the limb (the silhouette radius seen from uDistance) and fading smoothly outwards, reaching further sideways than
// up or down. The final pass dithers the output, so the long gradient never bands.
const GLOW_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uDistance;
  varying vec2 vPlane;
  void main() {
    float limb = uDistance / sqrt(max(uDistance * uDistance - 1.0, 0.0001));
    float r = length(vPlane);
    float h = max(r - limb, 0.0);
    float side = vPlane.x * vPlane.x / max(r * r, 0.0001);
    float reach = mix(0.45, 0.9, side);
    float t = h / reach;
    float glow = exp(-3.2 * t) * (1.0 - smoothstep(0.3, 1.0, t));
    float alpha = max(glow * 0.06, 0.0);
    gl_FragColor = vec4(uColor, alpha);
  }
`;

/** Barely-there amber glow far behind the globe: a camera-facing plane, additive, no pointer. */
export function createGlowMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: GLOW_VERTEX,
    fragmentShader: GLOW_FRAGMENT,
    uniforms: {
      uColor: { value: new Color(PALETTE.halo) },
      uDistance: { value: 6 },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
}
