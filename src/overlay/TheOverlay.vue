<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { computed, ref, watch } from 'vue';
import { $appState, seedAppState, stateFor, type StageId } from '../state/appStore';
import { hideTooltip } from '../state/globeStore';
import TheOverlayBrand from './TheOverlayBrand.vue';
import TheOverlayCityList from './TheOverlayCityList.vue';
import TheOverlayCoordinates from './TheOverlayCoordinates.vue';
import TheOverlayHeadline from './TheOverlayHeadline.vue';
import TheOverlayHint from './TheOverlayHint.vue';
import TheOverlayHotspots from './TheOverlayHotspots.vue';
import TheOverlayIndex from './TheOverlayIndex.vue';
import TheOverlayTooltip from './TheOverlayTooltip.vue';

const props = defineProps<{ initialState: StageId }>();
seedAppState(stateFor(props.initialState, false));
const appState = useStore($appState);
const onGlobe = computed(() => appState.value.kind === 'globe');
// The city dots stay mounted while a trip runs so they can fade out (and back in) as the scene's own dots take over.
const travelling = computed(() => appState.value.kind === 'transitioning');

const CITY_TEXT = '.the-stage__title, .the-stage__intro';
const CITY_TEXT_FADE_MS = 600;
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

// The globe's own text and controls are mounted as the trip home starts and fade in under the closing circle, so they are
// already there when it ends. A page that opens on the globe never sets this: it keeps its first-visit entrance.
const arrivingFromCity = ref(false);
/** Same as `the-overlay-globe-out` in _overlay-brand.scss. */
const GLOBE_LEAVE_MS = 600;
const showGlobeContent = computed(() => onGlobe.value || leavingToGlobe.value);

watch(leavingToGlobe, (leaving) => {
  if (leaving) {
    arrivingFromCity.value = true;
    fadeOutCityText();
    return;
  }
  if (onGlobe.value) return;
  arrivingFromCity.value = false;
  showCityText(); // the trip turned back to the city
});

// Settled in a city: the next arrival at the globe gets its entrance again.
watch(onGlobe, (isGlobe) => {
  if (!isGlobe && !travelling.value) arrivingFromCity.value = false;
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
    <!-- On the way to a city the globe's text fades out instead of vanishing (the wrapper has no box: its children fade). -->
    <Transition name="the-overlay__globe" :duration="{ enter: 0, leave: GLOBE_LEAVE_MS }">
      <div
        v-if="showGlobeContent"
        :class="['the-overlay__globe', { 'the-overlay__globe--arriving': arrivingFromCity }]"
        :inert="!onGlobe"
      >
        <TheOverlayHeadline />
        <TheOverlayCoordinates />
        <TheOverlayHint />
        <TheOverlayCityList />
        <TheOverlayIndex />
      </div>
    </Transition>
    <TheOverlayTooltip v-if="onGlobe" />
  </div>
</template>
