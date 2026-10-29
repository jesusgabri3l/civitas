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

// A tooltip must not wait for us when we come back to the globe.
watch(onGlobe, (isGlobe) => {
  if (!isGlobe) hideTooltip();
});
</script>

<template>
  <div class="the-overlay">
    <TheOverlayBrand />
    <template v-if="onGlobe">
      <TheOverlayHeadline />
      <TheOverlayHotspots />
      <TheOverlayTooltip />
      <TheOverlayCoordinates />
      <TheOverlayHint />
      <TheOverlayCityList />
    </template>
  </div>
</template>
