<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { $ambientActive, $hasInteracted, $touchNudge } from '../state/globeStore';

const DIM_AFTER_MS = 4000;

const hasInteracted = useStore($hasInteracted);
const ambientActive = useStore($ambientActive);
const touchNudge = useStore($touchNudge);
const onTouch = ref(false);
const settled = ref(false);
let settleTimer: ReturnType<typeof setTimeout> | undefined;

// Server and first client render agree on the mouse text; touch devices switch right after hydration.
onMounted(() => {
  onTouch.value = window.matchMedia('(pointer: coarse)').matches;
});

// It never leaves: a few seconds after the first gesture it quiets down, and comes back when the user goes idle.
watch(hasInteracted, (interacted) => {
  if (interacted) settleTimer = setTimeout(() => (settled.value = true), DIM_AFTER_MS);
});
onBeforeUnmount(() => clearTimeout(settleTimer));

const dimmed = computed(() => settled.value && ambientActive.value);
</script>

<template>
  <div class="the-overlay-hint" :class="{ 'the-overlay-hint--dimmed': dimmed }" aria-hidden="true" data-hint>
    <p class="the-overlay-hint__item">
      <span class="the-overlay-hint__key" :class="{ 'the-overlay-hint__key--nudge': touchNudge }">Drag</span>Rotate
    </p>
    <p class="the-overlay-hint__item">
      <span class="the-overlay-hint__key">{{ onTouch ? 'Pinch' : 'Scroll' }}</span>Zoom
    </p>
    <p class="the-overlay-hint__item">
      <span class="the-overlay-hint__key">{{ onTouch ? 'Tap' : 'Click' }}</span>Visit
    </p>
  </div>
</template>
