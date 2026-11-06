<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { computed } from 'vue';
import { withLang } from '../i18n/lang';
import { $appState, stageOf } from '../state/appStore';
import { useUi } from './useUi';

const appState = useStore($appState);
const { lang, text } = useUi();
// The logo belongs to each page: on the globe it keeps its place, in a city it sits in the top bar. It never travels between them.
// It docks only once the city is on screen, so it never jumps to the top bar while the globe's text fades out.
const docked = computed(() => appState.value.kind === 'monument' || appState.value.kind === 'info');
const travelling = computed(() => appState.value.kind === 'transitioning');
const toGlobe = computed(() => stageOf(appState.value) === 'globe');
// On the way to a city it fades out with the globe and comes back with the chapters; on the way back it comes in with the globe.
const hidden = computed(() => travelling.value && !toGlobe.value);
const arriving = computed(() => travelling.value && toGlobe.value);
</script>

<template>
  <a
    :class="['the-overlay-brand', { 'the-overlay-brand--docked': docked, 'the-overlay-brand--hidden': hidden, 'the-overlay-brand--arriving': arriving }]"
    :href="withLang(lang, '/')"
    :aria-label="docked ? text.brand.label : `Civitas, ${text.brand.tagline}`"
    :inert="hidden || undefined"
  >
    <span class="the-overlay-brand__name">Civitas</span><svg class="the-overlay-brand__globe" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="8" r="6.5" />
      <ellipse cx="8" cy="8" rx="2.6" ry="6.5" />
      <path d="M2 5.6h12M2 10.4h12" />
    </svg>
    <span v-if="!docked" class="the-overlay-brand__tagline">{{ text.brand.tagline }}</span>
  </a>
</template>
