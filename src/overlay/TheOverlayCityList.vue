<script setup lang="ts">
import type { DestinationId } from '../cities';
import { $openTooltip, hideTooltip, showTooltip } from '../state/globeStore';
import { useUi } from './useUi';

const { text, cities } = useUi();

const reveal = (id: DestinationId) => showTooltip(id, true);
const conceal = (id: DestinationId) => {
  if ($openTooltip.get()?.city === id) hideTooltip();
};
</script>

<template>
  <!-- Hidden from sight, not from keyboards or screen readers. Focusing an item shows its tooltip on the globe. -->
  <section class="the-overlay-cities visually-hidden" aria-labelledby="the-overlay-cities-title">
    <h2 id="the-overlay-cities-title">{{ text.destinations }}</h2>
    <ul class="the-overlay-cities__list">
      <li v-for="destination in cities" :key="destination.id" class="the-overlay-cities__item">
        <a
          class="the-overlay-cities__link"
          :href="destination.path"
          :data-city="destination.id"
          @focus="reveal(destination.id)"
          @blur="conceal(destination.id)"
        >
          {{ destination.name }}, {{ destination.monument }}. {{ destination.glimpse }}
        </a>
      </li>
    </ul>
  </section>
</template>
