<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { computed, nextTick, ref, watch } from 'vue';
import { $appState, stageOf } from '../state/appStore';

const MOVE_MS = 900;
const MOVE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

const brand = ref<HTMLAnchorElement | null>(null);
const appState = useStore($appState);
// On the globe the logo keeps its place; in a city (or on the way to one) it docks into the top bar.
const docked = computed(() => stageOf(appState.value) !== 'globe');

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// FLIP: measure where the logo is now (an animation in flight included), let the class change place it, then play from the old
// box to the new one with a transform. A deep link renders already docked, so nothing moves on load.
watch(docked, async () => {
  const element = brand.value;
  if (!element) return;
  const first = element.getBoundingClientRect();
  await nextTick();
  element.getAnimations().forEach((animation) => animation.cancel());
  if (prefersReducedMotion()) return;
  const last = element.getBoundingClientRect();
  if (last.width === 0) return;
  const scale = first.width / last.width;
  const deltaX = first.left - last.left;
  const deltaY = first.top - last.top;
  element.animate(
    [{ transform: `translate(${deltaX}px, ${deltaY}px) scale(${scale})` }, { transform: 'none' }],
    { duration: MOVE_MS, easing: MOVE_EASING },
  );
});
</script>

<template>
  <a ref="brand" :class="['the-overlay-brand', { 'the-overlay-brand--docked': docked }]" href="/" aria-label="Civitas, back to the globe">
    <span class="the-overlay-brand__name">Civitas</span><svg class="the-overlay-brand__globe" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.5" />
      <ellipse cx="8" cy="8" rx="2.6" ry="6.5" />
      <path d="M2 5.6h12M2 10.4h12" />
    </svg>
    <span v-if="!docked" class="the-overlay-brand__tagline">The interactive atlas of monuments</span>
  </a>
</template>
