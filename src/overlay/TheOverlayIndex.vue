<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { monumentIndex, REGIONS, type Region } from '../data/monumentIndex';
import { searchMonuments } from '../data/monumentSearch';
import type { DestinationId } from '../cities';
import { diveIntoCity, hideTooltip } from '../state/globeStore';
import { navigate } from '../state/router';
import TheOverlaySuggest from './TheOverlaySuggest.vue';

/**
 * The monument index: a way into every monument without spinning the globe. Button top right (also ⌘K / Ctrl+K), side panel with
 * search, region filter and the list, oldest first. The search is `searchMonuments` (accent- and case-insensitive; matches monument,
 * city, country, region, date and the `keywords` of each meta). Keyboard: up/down move the active row, Enter opens it, Esc closes.
 * The focus stays in the search box; the active row is announced with aria-activedescendant.
 */
const open = ref(false);
const suggesting = ref(false);
const query = ref('');
const region = ref<Region | null>(null);
const activeIndex = ref(0);
const search = ref<HTMLInputElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const pad = (n: number) => String(n).padStart(2, '0');
const openCount = monumentIndex.filter((entry) => entry.destination).length;
const results = computed(() => searchMonuments(query.value, region.value));
const isFiltering = computed(() => query.value.trim() !== '' || region.value !== null);
// The number of a row is its place in the full list, so it does not change while filtering.
const rankOf = (entry: (typeof monumentIndex)[number]) => monumentIndex.indexOf(entry) + 1;
const rowId = (i: number) => `the-overlay-index-row-${i}`;

watch([query, region], () => {
  activeIndex.value = 0;
});

function clearFilters() {
  query.value = '';
  region.value = null;
  search.value?.focus();
}

async function moveActive(step: number) {
  if (!results.value.length) return;
  activeIndex.value = Math.min(Math.max(activeIndex.value + step, 0), results.value.length - 1);
  await nextTick();
  document.getElementById(rowId(activeIndex.value))?.scrollIntoView({ block: 'nearest' });
}

function onSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault();
    moveActive(1);
    return;
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    moveActive(-1);
    return;
  }
  if (event.key !== 'Enter') return;
  const destination = results.value[activeIndex.value]?.destination;
  if (!destination) return;
  event.preventDefault();
  visit(destination);
}

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
            <input
              ref="search"
              v-model="query"
              class="the-overlay-index__search"
              type="search"
              placeholder="Name, city or century"
              role="combobox"
              aria-expanded="true"
              aria-controls="the-overlay-index-list"
              :aria-activedescendant="results.length ? rowId(activeIndex) : undefined"
              autocomplete="off"
              @keydown="onSearchKeydown"
            />
          </label>

          <div class="the-overlay-index__regions" role="group" aria-label="Region">
            <button type="button" class="the-overlay-index__chip" :aria-pressed="region === null" @click="region = null">All</button>
            <button
              v-for="name in REGIONS"
              :key="name"
              type="button"
              class="the-overlay-index__chip"
              :aria-pressed="region === name"
              @click="region = name"
            >
              {{ name }}
            </button>
          </div>

          <p class="the-overlay-index__meta">
            <span v-if="isFiltering">{{ results.length }} of {{ monumentIndex.length }} shown</span>
            <span v-else>{{ openCount }} open · {{ monumentIndex.length - openCount }} soon</span>
            <span>Oldest first ↓</span>
          </p>

          <ol v-if="results.length" id="the-overlay-index-list" class="the-overlay-index__list" role="listbox" aria-label="Monuments">
            <li v-for="(entry, i) in results" :key="entry.monument" role="presentation">
              <button
                :id="rowId(i)"
                type="button"
                role="option"
                tabindex="-1"
                class="the-overlay-index__row"
                :class="{ 'the-overlay-index__row--open': entry.destination, 'the-overlay-index__row--active': i === activeIndex }"
                :aria-selected="i === activeIndex"
                :aria-disabled="!entry.destination"
                @click="entry.destination && visit(entry.destination)"
              >
                <span class="the-overlay-index__number">{{ pad(rankOf(entry)) }}</span>
                <span class="the-overlay-index__names">
                  <span class="the-overlay-index__monument">{{ entry.monument }}</span>
                  <span class="the-overlay-index__place">{{ entry.place }} · {{ entry.date }}</span>
                </span>
                <span class="the-overlay-index__status">{{ entry.destination ? 'Open' : 'Soon' }}</span>
              </button>
            </li>
          </ol>

          <div v-else class="the-overlay-index__empty" role="status">
            <p class="the-overlay-index__empty-title">No monuments found</p>
            <p class="the-overlay-index__empty-text">Nothing matches that yet. Try a city, a country or a century.</p>
            <button type="button" class="the-overlay-index__empty-clear" @click="clearFilters">Clear search</button>
          </div>

          <button type="button" class="the-overlay-index__suggest" @click="suggesting = true">Suggest a monument →</button>
        </template>

        <TheOverlaySuggest v-else @back="suggesting = false" @close="close" />
      </aside>
    </div>
  </Transition>
</template>
