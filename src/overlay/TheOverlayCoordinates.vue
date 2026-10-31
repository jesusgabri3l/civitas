<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { computed } from 'vue';
import { formatCoordinates } from '../engine/stages/globe/coordinates';
import { $viewCenter } from '../state/globeStore';

const center = useStore($viewCenter);
const text = computed(() => formatCoordinates(center.value.lat, center.value.lon));
</script>

<template>
  <!-- A live readout, not content: kept out of the accessibility tree so it never chatters. -->
  <p class="the-overlay-coordinates" aria-hidden="true" data-coordinates>{{ text }}</p>
</template>
