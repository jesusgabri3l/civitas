/** GLSL shared by screen-space passes. */
export const SCREEN_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const COMMON_FRAGMENT = /* glsl */ `
  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform float uPixelRatio;

  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  // G-buffer sky pixels carry depth 0; treat them as infinitely far.
  float gbufferDepth(vec4 sampleValue) {
    return sampleValue.a < 0.1 ? 100000.0 : sampleValue.a;
  }
`;
