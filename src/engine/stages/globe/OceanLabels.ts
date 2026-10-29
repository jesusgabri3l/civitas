import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  Mesh,
  ShaderMaterial,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { DEG, latLonToVector3 } from './geo';
import { PALETTE } from './palette';

interface OceanSpec {
  text: string;
  lat: number;
  lon: number;
  /** Chord width of the label, in globe radii. */
  width: number;
}

const OCEANS: OceanSpec[] = [
  { text: 'Atlantic', lat: 26, lon: -38, width: 0.62 },
  { text: 'Pacific', lat: 4, lon: -140, width: 0.6 },
  { text: 'Indian', lat: -16, lon: 80, width: 0.52 },
  { text: 'Arctic', lat: 80, lon: 40, width: 0.4 },
  { text: 'Southern', lat: -62, lon: 120, width: 0.74 },
];

const FONT_FAMILY = "Fraunces, 'Iowan Old Style', 'Palatino Linotype', Georgia, serif";
const FONT_SIZE = 96;
const SMALL_CAP_RATIO = 0.78;
const TRACKING = 0.34;
const OPACITY = 0.3;
const GRID = 24;

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    vUv = uv;
    vec3 normal = normalize(normalMatrix * normalize(position));
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vFacing = dot(normal, normalize(-viewPosition.xyz));
    gl_Position = projectionMatrix * viewPosition;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    float alpha = texture2D(uMap, vUv).a * uOpacity * smoothstep(0.12, 0.5, vFacing);
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

/** Draws "Atlantic" as small caps (a taller first letter, shorter rest) with wide tracking. */
function drawLabel(text: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d') as CanvasRenderingContext2D;
  const letters = [...text.toUpperCase()].map((letter, i) => ({ letter, size: i === 0 ? FONT_SIZE : FONT_SIZE * SMALL_CAP_RATIO }));
  const font = (size: number) => `italic 400 ${size}px ${FONT_FAMILY}`;
  const gap = FONT_SIZE * TRACKING;
  const widths = letters.map(({ letter, size }) => {
    context.font = font(size);
    return context.measureText(letter).width;
  });
  const padding = FONT_SIZE * 0.3;
  canvas.width = Math.ceil(widths.reduce((sum, width) => sum + width, 0) + gap * (letters.length - 1) + padding * 2);
  canvas.height = Math.ceil(FONT_SIZE * 1.5);
  context.fillStyle = '#fff';
  context.textBaseline = 'alphabetic';
  let x = padding;
  letters.forEach(({ letter, size }, i) => {
    context.font = font(size);
    context.fillText(letter, x, FONT_SIZE * 1.12);
    x += widths[i] + gap;
  });
  return canvas;
}

/** A patch of the sphere surface around a lat/lon, so the text bends with the globe. */
function surfacePatch(lat: number, lon: number, width: number, height: number): BufferGeometry {
  const center = latLonToVector3(lat, lon);
  const east = new Vector3(Math.cos(lon * DEG), 0, -Math.sin(lon * DEG));
  const north = center.clone().cross(east).normalize();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= 1; j += 1) {
    for (let i = 0; i <= GRID; i += 1) {
      const u = i / GRID;
      const point = center
        .clone()
        .addScaledVector(east, (u - 0.5) * width)
        .addScaledVector(north, (0.5 - j) * height)
        .normalize()
        .multiplyScalar(1.003);
      positions.push(point.x, point.y, point.z);
      uvs.push(u, 1 - j);
    }
  }
  for (let i = 0; i < GRID; i += 1) indices.push(i, GRID + 1 + i, i + 1, i + 1, GRID + 1 + i, GRID + 2 + i);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  return geometry;
}

/** Ocean names riding on the globe: editorial small caps, quiet, fading out towards the hidden side. */
export async function createOceanLabels(): Promise<Group> {
  const group = new Group();
  group.name = 'globe-ocean-labels';
  try {
    await document.fonts.load(`italic 400 ${FONT_SIZE}px Fraunces`);
  } catch {
    // Falls back to the serif stack.
  }
  for (const { text, lat, lon, width } of OCEANS) {
    const canvas = drawLabel(text);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { uMap: { value: texture }, uColor: { value: new Color(PALETTE.text) }, uOpacity: { value: OPACITY } },
      transparent: true,
      depthWrite: false,
    });
    const mesh = new Mesh(surfacePatch(lat, lon, width, (width * canvas.height) / canvas.width), material);
    mesh.name = `ocean-${text.toLowerCase()}`;
    group.add(mesh);
  }
  return group;
}
