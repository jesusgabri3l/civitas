import {
  Color,
  Group,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  type ShaderMaterial,
  SphereGeometry,
  type Vector3,
} from 'three';
import { destinations, type DestinationId } from '../../data/destinations';
import { stageSky } from '../../data/stageSky';
import {
  $openTooltip,
  $touchNudge,
  claimTouchNudge,
  markInteracted,
  setFocusHandler,
  setAmbientActive,
  setGlobeLayout,
  setHotspots,
  setViewCenter,
  type HotspotScreen,
} from '../../state/globeStore';
import { SKY_LAYER } from '../render/LookPipeline';
import { DEFAULT_PLASTER } from '../render/PlasterLook';
import type { Stage, StageHost, TransitionAnchor } from '../stage/Stage';
import { disposeObject } from '../utils/disposal';
import { ArcLayer } from './globe/arcs';
import { createOceanLabels } from './globe/OceanLabels';
import { AUTO_ROTATE, autoRotationSpeed, nextShootingStarDelay } from './globe/ambient';
import { GlobeControls } from './globe/GlobeControls';
import { HotspotMarkers, MARKER_LIFT } from './globe/HotspotMarkers';
import {
  DEG,
  EUROPE,
  REST_TILT_DEGREES,
  GLOBE_FOV,
  fitDistance,
  globeLayout,
  latLonToVector3,
  orientationFor,
  projectToScreen,
  radiansPerPixel,
  rotationMatrix,
  settledDistance,
  viewCenter,
} from './globe/geo';
import {
  HALO_EXTENT,
  HALO_RADIUS,
  createGlobeLines,
  createGlobeMaterial,
  createGlowMaterial,
  createLimbMaterial,
} from './globe/materials';
import { ShootingStar } from './globe/ShootingStar';
import { StarField } from './globe/StarField';
import { ZoomModel } from './globe/ZoomModel';

/** Intro on load: the globe comes up out of black, already almost in place (tuned to land with the headline typing). */
const SPIN_SECONDS = 1.6;
const DOLLY_SECONDS = 1.6;
/** Seconds the exposure takes to rise from black to normal. */
const INTRO_FADE_SECONDS = 1.1;
/** The intro starts this far west of Europe (radians) and settles into place. */
const INTRO_SPIN = 0.1;
/** The intro starts this much farther out than the settled framing. */
const INTRO_EXTRA_DISTANCE = 1.05;
/** The view may tilt between these latitudes (radians): far enough south for Peru, never over the pole. */
const MIN_TILT = (-50 * Math.PI) / 180;
const MAX_TILT = (60 * Math.PI) / 180;
/** Seconds the globe takes to follow the zoom between resting (big, cropped) and whole (under the headline). */
const RAISE_SECONDS = 0.5;
/** Pinch on the wide stacked layout: how much of the rest-to-whole range one e-fold of finger distance covers. */
const PINCH_RAISE_PER_LOG = 1.3;
/** Seconds of the short turn that centers a clicked city. */
const FOCUS_SECONDS = 0.55;
/** Dive into a clicked city: camera distance reached (globe radii). The `near` plane (0.1) clips the surface below ~1.12. */
const DIVE_DISTANCE = 1.15;
/** Touch nudge: how far the globe swings (radians), how long it takes, and how long it waits after the cities appear. */
const NUDGE_ANGLE = 10 * (Math.PI / 180);
const NUDGE_SECONDS = 1.5;
const NUDGE_DELAY_SECONDS = 1.6;
/** Wheel: how much of the rest-to-raised range one pixel of delta covers (wide stacked layout). */
const WHEEL_RAISE_PER_PIXEL = 0.0012;
/** Other layouts: the zoom scale (1 = the usual framing) the wheel and the pinch may reach, and how fast it follows. */
const ZOOM_SCALE_MIN = 0.85;
const ZOOM_SCALE_MAX = 1.7;
const ZOOM_SCALE_DAMPING = 10;
/** Seconds the in-scene city dots take to fade in or out as a trip starts or ends (the HTML ones do the opposite). */
const MARKER_FADE_SECONDS = 0.1;
/** How much bigger the in-scene dots get at the closest point of the dive. */
const MARKER_DIVE_GROWTH = 0.5;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => t * t * (3 - 2 * t);
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * "Atlas de noche" globe: a stylized plaster sphere with coastlines and a graticule, a soft far glow, and a
 * three-layer starfield behind it (tilts with the pointer, stretches with zoom). The globe sits to the right of the headline (below it on narrow
 * screens). Intro: a slow spin that lands on Europe while the camera moves in. Drag rotates (with inertia),
 * wheel/pinch zooms within limits, and at rest it turns very slowly. Publishes hotspot screen positions and the view
 * center for the overlay.
 */
export function createStage(host: StageHost): Stage {
  const scene = new Scene();
  const camera = new PerspectiveCamera(GLOBE_FOV, 1, 0.1, 160);
  const globe = new Group();
  const stars = new StarField(host.ambient().starDensity);
  const shootingStar = new ShootingStar();
  const arcs = new ArcLayer();
  const markers = new HotspotMarkers();
  const limb = new Mesh(new SphereGeometry(HALO_RADIUS, 48, 32), createLimbMaterial());
  limb.layers.set(SKY_LAYER);
  const glow = new Mesh(new PlaneGeometry(HALO_EXTENT * 2, HALO_EXTENT * 2), createGlowMaterial());
  glow.layers.set(SKY_LAYER);
  glow.frustumCulled = false;
  const { tilt: europeTilt, yaw: europeYaw } = orientationFor(EUROPE);
  const hotspotPoints = new Map<string, Vector3>(
    destinations.map(({ id, coordinates }) => [id, latLonToVector3(coordinates.lat, coordinates.lon).multiplyScalar(MARKER_LIFT)]),
  );

  let aspect = 1;
  let yaw = europeYaw;
  let tilt = europeTilt;
  let spinElapsed = SPIN_SECONDS;
  let dollyElapsed = DOLLY_SECONDS;
  let active = false;
  let viewportHeight = 900;
  /** Zoom of the wide stacked layout: 0 = resting (big, cropped), 1 = whole globe under the headline; eased on use. */
  let raisedLinear = 0;
  /** Where the wheel or pinch wants `raisedLinear` to go. It only changes by user zoom and persists. */
  let raiseTarget = 0;
  /** Drag and zoom wake up once the intro is over and the cities have appeared. */
  let interactive = false;
  let zoomScale = 1;
  /** 0 = normal framing, 1 = camera diving into the focused city. Driven by the engine's transition hooks. */
  let diveAmount = 0;
  /** 0..1 how visible the in-scene city dots are: on while the camera is diving, fading in and out in 0.1 s. */
  let markerOpacity = 0;
  /** The first activation plays the intro; coming back from a city does not repeat it. */
  let introPlayed = false;
  let zoomScaleTarget = 1;
  /** Seconds into the touch nudge (negative while it waits); null when none is pending. */
  let nudgeElapsed: number | null = null;
  let nudgeAngle = 0;
  let focusTurn: {
    fromYaw: number;
    toYaw: number;
    fromTilt: number;
    toTilt: number;
    elapsed: number;
    /** Second of the turn at which the promise resolves (a bit before the turn ends when the caller wants an overlap). */
    resolveAt: number;
    done: () => void;
  } | null = null;
  /** Ambient animation (twinkle, auto-rotation, shooting stars) is off for reduced motion. */
  let ambientAllowed = true;
  let ambientTime = 0;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
  let lastActivityAt = performance.now();
  let shootingCountdown = nextShootingStarDelay();

  const zoom = new ZoomModel(1, () => ({ min: 1.05, max: 100 }));
  const raisedAmount = () => easeInOut(raisedLinear);
  const currentLayout = () => globeLayout(aspect, raisedAmount(), viewportHeight);
  const restDistance = () => {
    const base = settledDistance(aspect, GLOBE_FOV, raisedAmount(), viewportHeight);
    // Layouts that cannot lift (portrait, split) zoom by scale instead: the globe grows or shrinks around its spot.
    return currentLayout().raisable ? base : 1 + (base - 1) / zoomScale;
  };
  /** At rest the view looks south of the target, so the cities ride in the visible cap; it fades out as the globe rises or dives, so the camera ends pointing at the city. */
  const restTiltOffset = () =>
    currentLayout().raisable ? REST_TILT_DEGREES * DEG * (1 - raisedAmount()) * (1 - diveAmount) : 0;

  const controls = new GlobeControls({
    canvas: host.canvas,
    invalidate: host.invalidate,
    radiansPerPixel: () =>
      radiansPerPixel(zoom.distance, aspect, Math.min(host.canvas.clientWidth, host.canvas.clientHeight)),
    onRotate: (deltaYaw, deltaPitch) => {
      if (focusTurn || diveAmount > 0) return;
      yaw += deltaYaw;
      tilt = Math.min(MAX_TILT, Math.max(MIN_TILT, tilt + deltaPitch));
    },
    onGrab: () => {
      nudgeElapsed = null; // the user found it by themselves
      nudgeAngle = 0;
      spinElapsed = SPIN_SECONDS; // the user takes over: keep the yaw they have
      look.exposure = DEFAULT_PLASTER.exposure;
      markInteracted();
    },
    onWheel: (deltaPixels) => {
      if (focusTurn || diveAmount > 0) return;
      if (currentLayout().raisable) {
        // The wheel slides between the two framings: resting (big, cropped) and whole globe.
        raiseTarget = Math.min(1, Math.max(0, raiseTarget + deltaPixels * WHEEL_RAISE_PER_PIXEL));
      } else {
        zoomScaleTarget = Math.min(ZOOM_SCALE_MAX, Math.max(ZOOM_SCALE_MIN, zoomScaleTarget * Math.exp(-deltaPixels * 0.0015)));
      }
      markInteracted();
    },
    onPinch: (ratio) => {
      if (diveAmount > 0) return;
      if (currentLayout().raisable) {
        // Same range as the wheel: fingers apart zoom in (towards rest), together zoom out (towards the whole globe).
        raiseTarget = Math.min(1, Math.max(0, raiseTarget - Math.log(ratio) * PINCH_RAISE_PER_LOG));
        return;
      }
      zoomScaleTarget = Math.min(ZOOM_SCALE_MAX, Math.max(ZOOM_SCALE_MIN, zoomScaleTarget * ratio));
    },
    inertia: () => !prefersReducedMotion(),
  });

  function placeCamera() {
    camera.aspect = aspect;
    camera.position.set(0, 0, zoom.distance);
    camera.lookAt(0, 0, 0);
    // Slide the picture so the globe's center lands on its layout spot, instead of the middle of the screen. While diving
    // it glides back to the middle: the city faces the camera there, so the zoom ends on it.
    const layout = currentLayout();
    const centerX = layout.centerX + (0.5 - layout.centerX) * diveAmount;
    const centerY = layout.centerY + (0.5 - layout.centerY) * diveAmount;
    const fullWidth = aspect * 1000;
    camera.setViewOffset(fullWidth, 1000, -(centerX - 0.5) * fullWidth, -(centerY - 0.5) * 1000, fullWidth, 1000);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
  }

  function applyRotation() {
    globe.rotation.set(tilt - restTiltOffset(), yaw + nudgeAngle, 0);
    globe.updateMatrixWorld(true);
  }

  function publishHotspots() {
    if (!active) return;
    const rotation = rotationMatrix(tilt - restTiltOffset(), yaw + nudgeAngle);
    const introRunning = spinElapsed < SPIN_SECONDS;
    const screens: HotspotScreen[] = [];
    hotspotPoints.forEach((point, id) => {
      const { x, y, visible } = projectToScreen(point, rotation, camera);
      screens.push({ id: id as HotspotScreen['id'], x, y, visible: visible && !introRunning });
    });
    setHotspots(screens);
    const center = viewCenter(tilt - restTiltOffset(), yaw + nudgeAngle);
    setViewCenter(center.lat, center.lon);
  }

  function publishLayout() {
    const { centerX, centerY, height } = currentLayout();
    setGlobeLayout({ centerX, centerY, height });
  }

  function enableInteractionWhenIntroEnds() {
    if (interactive || !active || spinElapsed < SPIN_SECONDS || dollyElapsed < DOLLY_SECONDS) return;
    interactive = true;
    controls.attach();
    const touch = window.matchMedia('(pointer: coarse)').matches;
    if (touch && !prefersReducedMotion() && claimTouchNudge()) nudgeElapsed = -NUDGE_DELAY_SECONDS;
  }

  /** The intro starts a bit farther out than the settled framing and moves in. */
  const introDistance = () => Math.max(fitDistance(aspect), restDistance() * INTRO_EXTRA_DISTANCE);

  function restartIntro() {
    if (introPlayed) {
      // Back from a city: no intro. The engine drives the way out of the dive through `setEntry`.
      spinElapsed = SPIN_SECONDS;
      dollyElapsed = DOLLY_SECONDS;
      return;
    }
    introPlayed = true;
    diveAmount = 0;
    const instant = prefersReducedMotion();
    spinElapsed = instant ? SPIN_SECONDS : 0;
    dollyElapsed = instant ? DOLLY_SECONDS : 0;
    yaw = instant ? europeYaw : europeYaw - INTRO_SPIN;
    look.exposure = instant ? DEFAULT_PLASTER.exposure : 0;
    tilt = europeTilt;
    zoom.snapTo(instant ? restDistance() : introDistance());
  }

  /** Something happened (pointer, key, wheel): wake the ambient animation and restart the idle clock. */
  const onPointerMove = (event: PointerEvent) => {
    pointer.targetX = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.targetY = (event.clientY / window.innerHeight) * 2 - 1;
    wake();
  };

  const wake = () => {
    lastActivityAt = performance.now();
    host.invalidate();
  };

  function listen() {
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', wake, { passive: true });
    window.addEventListener('keydown', wake, { passive: true });
  }

  function unlisten() {
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', wake);
    window.removeEventListener('keydown', wake);
  }

  /** Advances the ambient layer. Returns true while it needs frames. */
  function updateAmbient(deltaSeconds: number): boolean {
    const idleSeconds = (performance.now() - lastActivityAt) / 1000;
    const policy = host.ambient();
    const ambientOn = ambientAllowed && idleSeconds < policy.idleSeconds;
    setAmbientActive(ambientOn);
    if (!ambientOn) {
      shootingStar.cancel();
      return arcs.update(deltaSeconds, false);
    }

    ambientTime += deltaSeconds;
    stars.setTime(ambientTime);
    const follow = 1 - Math.exp(-deltaSeconds * 3);
    pointer.x += (pointer.targetX - pointer.x) * follow;
    pointer.y += (pointer.targetY - pointer.y) * follow;
    stars.setParallax(pointer.x, pointer.y);
    (limb.material as ShaderMaterial).uniforms.uTime.value = ambientTime;

    const introDone = spinElapsed >= SPIN_SECONDS && dollyElapsed >= DOLLY_SECONDS;
    if (introDone && diveAmount === 0 && !controls.isDragging && !focusTurn && !$openTooltip.get()) {
      yaw += autoRotationSpeed(idleSeconds, AUTO_ROTATE) * deltaSeconds;
    }

    if (policy.shootingStars) {
      shootingCountdown -= deltaSeconds;
      if (shootingCountdown <= 0) {
        shootingStar.launch();
        shootingCountdown = nextShootingStarDelay();
      }
      shootingStar.update(deltaSeconds);
    }
    arcs.update(deltaSeconds, true);
    return true;
  }

  /** Turns the globe along the shortest way until the city sits in the middle. Resolves when it gets there. */
  function turnTo(city: DestinationId, leadSeconds = 0): Promise<void> {
    const target = destinations.find(({ id }) => id === city);
    if (!target || prefersReducedMotion()) return Promise.resolve();
    focusTurn?.done();
    const { yaw: toYaw, tilt: toTilt } = orientationFor(target.coordinates);
    const wrapped = ((((toYaw - yaw + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
    controls.stopCoasting();
    host.invalidate();
    return new Promise((resolve) => {
      focusTurn = {
        fromYaw: yaw,
        toYaw: yaw + wrapped,
        fromTilt: tilt,
        toTilt: Math.min(MAX_TILT, Math.max(MIN_TILT, toTilt)),
        elapsed: 0,
        resolveAt: FOCUS_SECONDS - leadSeconds,
        done: resolve,
      };
    });
  }

  // Mutable: the intro raises `exposure` from black.
  const look = { ...DEFAULT_PLASTER, aoStrength: 0, grain: 0, warmth: 0, vignette: 0.22, filmic: 0 };

  return {
    id: 'globe',
    scene,
    camera,
    skyColor: stageSky.globe.skyColor,
    look,

    async load() {
      scene.background = new Color(stageSky.globe.skyColor);
      globe.add(new Mesh(new SphereGeometry(1, 96, 64), createGlobeMaterial()), ...createGlobeLines(), arcs.group, markers.group);
      globe.add(await createOceanLabels());
      scene.add(globe, glow, limb, ...stars.layers, shootingStar.mesh);
      applyRotation();
      placeCamera();
    },

    activate() {
      active = true;
      ambientAllowed = !prefersReducedMotion();
      lastActivityAt = performance.now();
      ambientTime = 0;
      pointer.x = pointer.y = pointer.targetX = pointer.targetY = 0;
      stars.setParallax(0, 0);
      shootingCountdown = nextShootingStarDelay();
      stars.setPixelRatio(host.pixelRatio());
      arcs.setPixelRatio(host.pixelRatio());
      markers.setPixelRatio(host.pixelRatio());
      arcs.restart(!ambientAllowed);
      publishLayout();
      viewportHeight = host.canvas.clientHeight || window.innerHeight;
      raisedLinear = 0;
      interactive = false;
      raiseTarget = 0;
      zoomScale = zoomScaleTarget = 1;
      restartIntro();
      enableInteractionWhenIntroEnds();
      setFocusHandler(turnTo);
      listen();
      applyRotation();
      placeCamera();
      publishHotspots();
    },

    deactivate() {
      active = false;
      setFocusHandler(null);
      focusTurn?.done();
      focusTurn = null;
      interactive = false;
      controls.detach();
      unlisten();
      setHotspots([]);
    },

    update(deltaSeconds) {
      let animating = false;
      if (spinElapsed < SPIN_SECONDS) {
        spinElapsed = Math.min(spinElapsed + deltaSeconds, SPIN_SECONDS);
        yaw = europeYaw - INTRO_SPIN * (1 - easeOutCubic(spinElapsed / SPIN_SECONDS));
        animating = spinElapsed < SPIN_SECONDS;
        look.exposure = DEFAULT_PLASTER.exposure * easeInOut(Math.min(spinElapsed / INTRO_FADE_SECONDS, 1));
      }
      // Follow the user's zoom (wide stacked layout). Nothing else moves the globe up or down.
      if (raisedLinear !== raiseTarget) {
        const step = prefersReducedMotion() ? 1 : deltaSeconds / RAISE_SECONDS;
        raisedLinear =
          raiseTarget > raisedLinear ? Math.min(raiseTarget, raisedLinear + step) : Math.max(raiseTarget, raisedLinear - step);
        animating = true;
      }

      if (focusTurn) {
        focusTurn.elapsed += deltaSeconds;
        const progress = easeInOut(Math.min(focusTurn.elapsed / FOCUS_SECONDS, 1));
        yaw = focusTurn.fromYaw + (focusTurn.toYaw - focusTurn.fromYaw) * progress;
        tilt = focusTurn.fromTilt + (focusTurn.toTilt - focusTurn.fromTilt) * progress;
        animating = true;
        if (focusTurn.elapsed >= focusTurn.resolveAt) focusTurn.done();
        if (focusTurn.elapsed >= FOCUS_SECONDS) focusTurn = null;
      }

      if (zoomScale !== zoomScaleTarget) {
        const follow = 1 - Math.exp(-ZOOM_SCALE_DAMPING * deltaSeconds);
        zoomScale += (zoomScaleTarget - zoomScale) * follow;
        if (Math.abs(zoomScaleTarget - zoomScale) < 0.0005) zoomScale = zoomScaleTarget;
        animating = true;
      }

      const settled = restDistance();
      if (dollyElapsed < DOLLY_SECONDS) {
        dollyElapsed = Math.min(dollyElapsed + deltaSeconds, DOLLY_SECONDS);
        const progress = easeInOut(dollyElapsed / DOLLY_SECONDS);
        const from = introDistance();
        zoom.snapTo(from + (settled - from) * progress);
        animating ||= dollyElapsed < DOLLY_SECONDS;
      } else {
        zoom.snapTo(settled + (DIVE_DISTANCE - settled) * diveAmount);
      }

      enableInteractionWhenIntroEnds();
      if (nudgeElapsed !== null) {
        nudgeElapsed += deltaSeconds;
        animating = true;
        if (nudgeElapsed >= 0 && !$touchNudge.get()) $touchNudge.set(true);
        const progress = Math.min(Math.max(nudgeElapsed / NUDGE_SECONDS, 0), 1);
        nudgeAngle = NUDGE_ANGLE * Math.sin(progress * Math.PI);
        if (progress >= 1) {
          nudgeElapsed = null;
          nudgeAngle = 0;
        }
      }
      if (controls.update(deltaSeconds)) animating = true;
      if (updateAmbient(deltaSeconds)) animating = true;

      const markerTarget = diveAmount > 0 ? 1 : 0;
      if (markerOpacity !== markerTarget) {
        const step = deltaSeconds / MARKER_FADE_SECONDS;
        markerOpacity = markerTarget > markerOpacity ? Math.min(1, markerOpacity + step) : Math.max(0, markerOpacity - step);
        animating = true;
      }
      markers.setOpacity(markerOpacity);
      markers.setScale(1 + MARKER_DIVE_GROWTH * diveAmount);
      // The page clock, the same one the HTML rings run on (see TheOverlayHotspots): no jump in the pulse when they swap.
      markers.setTime(performance.now() / 1000);

      const zoomAmount = (settled - zoom.distance) / settled;
      stars.setStretch(zoomAmount);
      (limb.material as ShaderMaterial).uniforms.uZoom.value = Math.max(-0.5, Math.min(0.5, zoomAmount));
      (glow.material as ShaderMaterial).uniforms.uDistance.value = zoom.distance;
      applyRotation();
      placeCamera();
      publishHotspots();
      return animating;
    },

    transitionAnchor(target): TransitionAnchor {
      const point = target ? hotspotPoints.get(target) : undefined;
      if (!point) {
        const { centerX, centerY } = currentLayout();
        return { centerX, centerY };
      }
      const { x, y } = projectToScreen(point, rotationMatrix(tilt - restTiltOffset(), yaw + nudgeAngle), camera);
      return { centerX: x, centerY: y };
    },

    restFor(target) {
      const city = destinations.find(({ id }) => id === target);
      if (!city) return;
      // As if the globe had already turned to the city and settled: no intro, no pending turn, nothing left to animate.
      const { yaw: toYaw, tilt: toTilt } = orientationFor(city.coordinates);
      focusTurn?.done();
      focusTurn = null;
      controls.stopCoasting();
      nudgeElapsed = null;
      nudgeAngle = 0;
      introPlayed = true;
      look.exposure = DEFAULT_PLASTER.exposure;
      spinElapsed = SPIN_SECONDS;
      dollyElapsed = DOLLY_SECONDS;
      raisedLinear = raiseTarget = 0;
      zoomScale = zoomScaleTarget = 1;
      yaw = toYaw;
      tilt = Math.min(MAX_TILT, Math.max(MIN_TILT, toTilt));
      markerOpacity = 1;
      zoom.snapTo(restDistance());
    },

    setExit(p, target) {
      diveAmount = p;
      markers.setTarget(target);
      if (p > 0) controls.stopCoasting();
      host.invalidate();
    },

    setEntry(p) {
      diveAmount = 1 - p;
      host.invalidate();
    },

    resize(nextAspect) {
      aspect = nextAspect;
      viewportHeight = host.canvas.clientHeight || window.innerHeight;
      if (dollyElapsed >= DOLLY_SECONDS) zoom.snapTo(restDistance());
      stars.setPixelRatio(host.pixelRatio());
      markers.setPixelRatio(host.pixelRatio());
      publishLayout();
      placeCamera();
      publishHotspots();
    },

    sleep() {
      disposeObject(scene);
    },

    dispose() {
      active = false;
      controls.detach();
      unlisten();
      setHotspots([]);
      disposeObject(scene);
      scene.clear();
      globe.clear();
    },
  };
}
