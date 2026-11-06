<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { $ambientActive, $hasInteracted } from '../state/globeStore';
import { useUi } from './useUi';

const DIM_AFTER_MS = 4000;

const { text } = useUi();
const hasInteracted = useStore($hasInteracted);
const ambientActive = useStore($ambientActive);
const onTouch = ref(false);
const settled = ref(false);
let settleTimer: ReturnType<typeof setTimeout> | undefined;

// Server and first client render agree on the mouse text; touch devices switch right after hydration.
onMounted(() => {
  onTouch.value = window.matchMedia('(pointer: coarse)').matches;
});

// It never leaves: a few seconds after the first gesture it quiets down, and comes back when the user goes idle.
watch(
  hasInteracted,
  (interacted) => {
    if (interacted) settleTimer = setTimeout(() => (settled.value = true), DIM_AFTER_MS);
  },
  { immediate: true },
);
onBeforeUnmount(() => clearTimeout(settleTimer));

const dimmed = computed(() => settled.value && ambientActive.value);
</script>

<template>
  <div class="the-overlay-hint" :class="{ 'the-overlay-hint--dimmed': dimmed }" aria-hidden="true" data-hint>
    <p class="the-overlay-hint__item">
      <span class="the-overlay-hint__key">{{ text.hint.drag }}</span>{{ text.hint.rotate }}
    </p>
    <p class="the-overlay-hint__item">
      <span class="the-overlay-hint__key">{{ onTouch ? text.hint.pinch : text.hint.scroll }}</span>{{ text.hint.zoom }}
    </p>
    <p class="the-overlay-hint__item">
      <span class="the-overlay-hint__key">{{ onTouch ? text.hint.tap : text.hint.click }}</span>{{ text.hint.visit }}
    </p>
  </div>
</template>
