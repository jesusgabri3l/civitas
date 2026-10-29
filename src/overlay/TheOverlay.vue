<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { computed, watch } from 'vue';
import { $appState, seedAppState, stateFor, type StageId } from '../state/appStore';
import { hideTooltip } from '../state/globeStore';
import TheOverlayBrand from './TheOverlayBrand.vue';
import TheOverlayCityList from './TheOverlayCityList.vue';
import TheOverlayCoordinates from './TheOverlayCoordinates.vue';
import TheOverlayHeadline from './TheOverlayHeadline.vue';
import TheOverlayHint from './TheOverlayHint.vue';
import TheOverlayHotspots from './TheOverlayHotspots.vue';
import TheOverlayTooltip from './TheOverlayTooltip.vue';

const props = defineProps<{ initialState: StageId }>();
seedAppState(stateFor(props.initialState, false));
const appState = useStore($appState);
const onGlobe = computed(() => appState.value.kind === 'globe');
// The city dots stay mounted while a trip runs so they can fade out (and back in) as the scene's own dots take over.
const travelling = computed(() => appState.value.kind === 'transitioning');

const CITY_TEXT = '.the-stage__title, .the-stage__intro';
const CITY_TEXT_FADE_MS = 150;
const leavingToGlobe = computed(() => appState.value.kind === 'transitioning' && appState.value.to === 'globe');

const cityTextElements = () => document.querySelectorAll<HTMLElement>(CITY_TEXT);

/** The city title and intro are server-rendered and visible on a city deep link; the trip to the globe fades them out at once. */
function fadeOutCityText() {
  cityTextElements().forEach((element) => {
    element.style.transition = `opacity ${CITY_TEXT_FADE_MS}ms ease-out`;
    element.style.opacity = '0';
  });
}

function showCityText() {
  cityTextElements().forEach((element) => {
    element.style.opacity = '';
    element.style.transition = '';
  });
}

/** Once on the globe the text must go (kept for search engines and screen readers only). */
function hideCityText() {
  cityTextElements().forEach((element) => element.classList.add('visually-hidden'));
}

watch(leavingToGlobe, (leaving) => {
  if (leaving) fadeOutCityText();
  else if (!onGlobe.value) showCityText(); // the trip turned back to the city
});

// A tooltip must not wait for us when we come back to the globe.
watch(onGlobe, (isGlobe) => {
  if (isGlobe) hideCityText();
  else hideTooltip();
});
</script>

<template>
  <div class="the-overlay">
    <TheOverlayBrand />
    <TheOverlayHotspots v-if="onGlobe || travelling" />
    <template v-if="onGlobe">
      <TheOverlayHeadline />
      <TheOverlayTooltip />
      <TheOverlayCoordinates />
      <TheOverlayHint />
      <TheOverlayCityList />
    </template>
  </div>
</template>
