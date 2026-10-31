<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { monumentIndex, REGIONS } from '../data/monumentIndex';
import type { DestinationId } from '../cities';
import { diveIntoCity, hideTooltip } from '../state/globeStore';
import { navigate } from '../state/router';
import TheOverlaySuggest from './TheOverlaySuggest.vue';

/**
 * The monument index: a way into every monument without spinning the globe. Button top right (also ⌘K / Ctrl+K), side panel with
 * search, region filter and the list, oldest first.
 * UI ONLY FOR NOW: the search box and the region chips are not wired yet (TODO: filter `monumentIndex` by text and region, keep the
 * list order, show an empty state). Opening an open monument works.
 */
const open = ref(false);
const suggesting = ref(false);
const query = ref('');
const search = ref<HTMLInputElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const pad = (n: number) => String(n).padStart(2, '0');
const openCount = monumentIndex.filter((entry) => entry.destination).length;

async function show() {
  hideTooltip();
  open.value = true;
  await nextTick();
  search.value?.focus();
}

function close() {
  open.value = false;
  suggesting.value = false;
  trigger.value?.focus();
}

async function visit(city: DestinationId) {
  open.value = false;
  await diveIntoCity(city);
  navigate(city);
}

function onKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    if (open.value) close();
    else show();
  } else if (event.key === 'Escape' && open.value) {
    if (suggesting.value) suggesting.value = false;
    else close();
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown));
</script>

<template>
  <button ref="trigger" type="button" class="the-overlay-index__trigger" aria-haspopup="dialog" :aria-expanded="open" @click="show">
    <svg viewBox="0 0 14 14" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="4.5" /><path d="M9.4 9.4 13 13" /></svg>
    <span>Index · {{ monumentIndex.length }} monuments</span>
    <kbd class="the-overlay-index__kbd">⌘K</kbd>
  </button>

  <Transition name="the-overlay-index">
    <div v-if="open" class="the-overlay-index" @click.self="close">
      <aside class="the-overlay-index__panel" role="dialog" aria-modal="true" aria-labelledby="the-overlay-index-title">
        <template v-if="!suggesting">
          <header class="the-overlay-index__head">
            <h2 id="the-overlay-index-title" class="the-overlay-index__title">Index</h2>
            <button type="button" class="the-overlay-index__close" aria-label="Close the index" @click="close">×</button>
          </header>

          <label class="the-overlay-index__label">
            Search monuments
            <input ref="search" v-model="query" class="the-overlay-index__search" type="search" placeholder="Name, city or century" />
          </label>

          <div class="the-overlay-index__regions" role="group" aria-label="Region">
            <button type="button" class="the-overlay-index__chip" aria-pressed="true">All</button>
            <button v-for="region in REGIONS" :key="region" type="button" class="the-overlay-index__chip" aria-pressed="false">{{ region }}</button>
          </div>

          <p class="the-overlay-index__meta">
            <span>{{ openCount }} open · {{ monumentIndex.length - openCount }} soon</span>
            <span>Oldest first ↓</span>
          </p>

          <ol class="the-overlay-index__list">
            <li v-for="(entry, i) in monumentIndex" :key="entry.monument">
              <button
                type="button"
                class="the-overlay-index__row"
                :class="{ 'the-overlay-index__row--open': entry.destination }"
                :aria-disabled="!entry.destination"
                @click="entry.destination && visit(entry.destination)"
              >
                <span class="the-overlay-index__number">{{ pad(i + 1) }}</span>
                <span class="the-overlay-index__names">
                  <span class="the-overlay-index__monument">{{ entry.monument }}</span>
                  <span class="the-overlay-index__place">{{ entry.place }} · {{ entry.date }}</span>
                </span>
                <span class="the-overlay-index__status">{{ entry.destination ? 'Open' : 'Soon' }}</span>
              </button>
            </li>
          </ol>

          <button type="button" class="the-overlay-index__suggest" @click="suggesting = true">Suggest a monument →</button>
        </template>

        <TheOverlaySuggest v-else @back="suggesting = false" @close="close" />
      </aside>
    </div>
  </Transition>
</template>
