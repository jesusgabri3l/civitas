<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { computed, ref, watch } from 'vue';
import { cities, type DestinationId } from '../cities';
import { $appState } from '../state/appStore';
import { navigate } from '../state/router';
import { track } from '../state/track';
import {
  $ambientActive,
  $hotspots,
  $openTooltip,
  diveIntoCity,
  hideTooltip,
  scheduleHideTooltip,
  showTooltip,
} from '../state/globeStore';

const PULSE_STAGGER_SECONDS = 1.7;
const ENTER_STAGGER_SECONDS = 0.15;
/** The entrance styles stay on this long after the first city shows up, then give way to the steady pulse. */
const ENTERING_MS = 2400;

const hotspots = useStore($hotspots);
const openTooltip = useStore($openTooltip);
const ambientActive = useStore($ambientActive);
const appState = useStore($appState);
// During a trip the globe scene draws its own dots (they zoom with the camera): these fade out and come back at the end.
const travelling = computed(() => appState.value.kind === 'transitioning');

const entering = ref(false);
let enteringStarted = false;
// The first time cities become visible they come in one after the other.
watch(
  hotspots,
  (items) => {
    if (enteringStarted || !items.some((item) => item.visible)) return;
    enteringStarted = true;
    entering.value = true;
    setTimeout(() => (entering.value = false), ENTERING_MS);
  },
  { immediate: true },
);

const isOpen = (id: DestinationId) => openTooltip.value?.city === id;
const isDimmed = (id: DestinationId) => Boolean(openTooltip.value) && !isOpen(id);
// Each city pulses out of step with the others.
const indexOf = (id: DestinationId) => cities.findIndex((destination) => destination.id === id);
const pulseDelay = (id: DestinationId) => `${-indexOf(id) * PULSE_STAGGER_SECONDS}s`;
const enterDelay = (id: DestinationId) => `${indexOf(id) * ENTER_STAGGER_SECONDS}s`;
const nameOf = (id: DestinationId) => cities.find((destination) => destination.id === id)?.name ?? id;
// Labels sit to the right of their dot, unless that would run off the screen.
const labelOnLeft = (x: number) => x > 0.78;
const percent = (fraction: number) => `${(fraction * 100).toFixed(2)}%`;

function onPointerEnter(event: PointerEvent, id: DestinationId) {
  if (event.pointerType === 'mouse') showTooltip(id, false);
}

// Every ring runs on the page clock (start time 0), the same one the dots inside the globe scene pulse on during a trip,
// so the swap at the end of a trip does not jump. A ring restarts each time its dot is shown again; this pins it back.
function onAnimationStart(event: AnimationEvent) {
  if (event.animationName !== 'the-overlay-pulse') return;
  (event.target as Element).getAnimations().forEach((animation) => {
    if ((animation as CSSAnimation).animationName === 'the-overlay-pulse') animation.startTime = 0;
  });
}

function onPointerLeave(event: PointerEvent) {
  if (event.pointerType === 'mouse') scheduleHideTooltip();
}

// The dot is the way in: one click or tap goes straight to the monument.
// A mouse click (or a key press) goes straight to the monument. A finger or pen has no hover, so the tap opens the card
// first; tapping the card is what navigates.
async function onClick(event: MouseEvent, id: DestinationId) {
  const pointerType = (event as PointerEvent).pointerType;
  if (pointerType === 'touch' || pointerType === 'pen') {
    showTooltip(id, true);
    return;
  }
  hideTooltip();
  await diveIntoCity(id); // a short turn that centers the city first
  track('city_open', { city: id, from: 'globe' });
  navigate(id);
}
</script>

<template>
  <!-- Pointer enhancement: keyboard and screen reader users get the city list instead. -->
  <div class="the-overlay-hotspots" :class="{ 'the-overlay-hotspots--paused': !ambientActive, 'the-overlay-hotspots--entering': entering, 'the-overlay-hotspots--travelling': travelling }" aria-hidden="true" @animationstart="onAnimationStart">
    <button
      v-for="hotspot in hotspots"
      v-show="hotspot.visible"
      :key="hotspot.id"
      type="button"
      tabindex="-1"
      class="the-overlay-hotspots__item"
      :class="{
        'the-overlay-hotspots__item--active': isOpen(hotspot.id),
        'the-overlay-hotspots__item--dimmed': isDimmed(hotspot.id),
      }"
      :style="{ left: percent(hotspot.x), top: percent(hotspot.y), '--pulse-delay': pulseDelay(hotspot.id), '--enter-delay': enterDelay(hotspot.id) }"
      :data-hotspot="hotspot.id"
      :aria-label="hotspot.id"
      @pointerenter="onPointerEnter($event, hotspot.id)"
      @pointerleave="onPointerLeave"
      @click="onClick($event, hotspot.id)"
    >
      <span class="the-overlay-hotspots__pulse"></span>
      <span class="the-overlay-hotspots__dot"></span>
    </button>
    <!-- Touch only (see the stylesheet): a fixed name beside every visible city, since there is no hover to reveal it. -->
    <span
      v-for="hotspot in hotspots"
      v-show="hotspot.visible && !isOpen(hotspot.id)"
      :key="`label-${hotspot.id}`"
      class="the-overlay-hotspots__label"
      :class="{ 'the-overlay-hotspots__label--left': labelOnLeft(hotspot.x), 'the-overlay-hotspots__label--dimmed': isDimmed(hotspot.id) }"
      :style="{ left: percent(hotspot.x), top: percent(hotspot.y), '--enter-delay': enterDelay(hotspot.id) }"
    >{{ nameOf(hotspot.id) }}</span>
  </div>
</template>
