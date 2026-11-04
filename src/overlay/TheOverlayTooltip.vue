<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { cities } from '../cities';
import { $hotspots, $openTooltip, diveIntoCity, hideTooltip } from '../state/globeStore';
import { navigate } from '../state/router';
import { track } from '../state/track';
import { isTooltipShown, placementFor } from './tooltip';

const openTooltip = useStore($openTooltip);
const hotspots = useStore($hotspots);

const destination = computed(() => cities.find(({ id }) => id === openTooltip.value?.city));
const hotspot = computed(() => hotspots.value.find(({ id }) => id === openTooltip.value?.city));
const shown = computed(() => isTooltipShown(openTooltip.value, hotspot.value));
const placement = computed(() => placementFor(hotspot.value?.x ?? 0, hotspot.value?.y ?? 0));
const percent = (fraction: number) => `${(fraction * 100).toFixed(2)}%`;
const onTouch = ref(false);

// On touch the card is the way in: tapping it visits the monument.
async function visit() {
  const city = destination.value?.id;
  if (!city) return;
  hideTooltip();
  await diveIntoCity(city);
  track('city_open', { city, from: 'globe' });
  navigate(city);
}

// Dismiss: Escape, or a press anywhere that is not a hotspot (dragging the globe included).
function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') hideTooltip();
}

function onDocumentPointerDown(event: PointerEvent) {
  const target = event.target as Element | null;
  if (target?.closest('.the-overlay-hotspots__item, .the-overlay-tooltip__label')) return;
  hideTooltip();
}

onMounted(() => {
  onTouch.value = window.matchMedia('(pointer: coarse)').matches;
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('pointerdown', onDocumentPointerDown);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('pointerdown', onDocumentPointerDown);
});
</script>

<template>
  <!-- Anchored to the hotspot: a leader line and a small card. The city list is the accessible way in. -->
  <Transition name="the-overlay-tooltip">
    <div
      v-if="destination && hotspot && shown"
      :key="destination.id"
      class="the-overlay-tooltip"
      :class="[`the-overlay-tooltip--${placement.horizontal}`, `the-overlay-tooltip--${placement.vertical}`]"
      :style="{ left: percent(hotspot.x), top: percent(hotspot.y) }"
      :data-tooltip="destination.id"
      :data-placement="`${placement.horizontal}-${placement.vertical}`"
      aria-hidden="true"
    >
      <svg class="the-overlay-tooltip__line" viewBox="0 0 22 22" focusable="false">
        <line x1="0" y1="22" x2="22" y2="0" pathLength="1" />
      </svg>
      <div class="the-overlay-tooltip__label" @click="visit">
        <span class="the-overlay-tooltip__name">{{ destination.name }}, {{ destination.country }}</span>
        <span class="the-overlay-tooltip__monument">{{ destination.monument }}</span>
        <span class="the-overlay-tooltip__visit">{{ onTouch ? 'Tap to visit' : 'Click to visit' }}</span>
      </div>
    </div>
  </Transition>
</template>
