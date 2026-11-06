<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import TheOverlayLang from './TheOverlayLang.vue';
import { monumentIndexFor, REGIONS, type Region } from '../data/monumentIndex';
import { searchMonuments } from '../data/monumentSearch';
import type { DestinationId } from '../cities';
import { diveIntoCity, hideTooltip, requestPreload } from '../state/globeStore';
import { navigate } from '../state/router';
import { track } from '../state/track';
import TheOverlaySuggest from './TheOverlaySuggest.vue';
import { useUi } from './useUi';

/**
 * The monument index: a way into every monument without spinning the globe. Button top right, side panel with
 * search, region filter and the list, oldest first. The search is `searchMonuments` (accent- and case-insensitive; matches monument,
 * city, country, region, date and the `keywords` of each meta). Keyboard: up/down move the active row, Enter opens it, Esc closes.
 * The focus stays in the search box; the active row is announced with aria-activedescendant.
 */
const { lang, text } = useUi();
const monumentIndex = monumentIndexFor(lang);
const open = ref(false);
const suggesting = ref(false);
const query = ref('');
const region = ref<Region | null>(null);
const activeIndex = ref(0);
const search = ref<HTMLInputElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const pad = (n: number) => String(n).padStart(2, '0');
const openCount = monumentIndex.filter((entry) => entry.destination).length;
const results = computed(() => searchMonuments(query.value, region.value, lang));
const isFiltering = computed(() => query.value.trim() !== '' || region.value !== null);
// The number of a row is its place in the full list, so it does not change while filtering.
const rankOf = (entry: (typeof monumentIndex)[number]) => monumentIndex.indexOf(entry) + 1;
const rowId = (i: number) => `the-overlay-index-row-${i}`;

watch([query, region], () => {
  activeIndex.value = 0;
});

// Warms the city of the row the visitor lingers on (hover or keyboard), so the click finds it ready.
let preloadTimer: ReturnType<typeof setTimeout> | undefined;
function preloadAfterPause(city: DestinationId | undefined) {
  clearTimeout(preloadTimer);
  if (city) preloadTimer = setTimeout(() => requestPreload(city), 200);
}
watch(activeIndex, (i) => preloadAfterPause(results.value[i]?.destination));

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

const panel = ref<HTMLElement | null>(null);

async function show() {
  hideTooltip();
  open.value = true;
  await nextTick();
  // Touch: focusing the search would pop the keyboard over the list; the panel takes the focus instead.
  if (window.matchMedia('(pointer: fine)').matches) search.value?.focus();
  else panel.value?.focus();
}

function close() {
  open.value = false;
  suggesting.value = false;
  trigger.value?.focus();
}

async function visit(city: DestinationId) {
  open.value = false;
  await diveIntoCity(city);
  track('city_open', { city, from: 'index' });
  navigate(city);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    if (suggesting.value) suggesting.value = false;
    else close();
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown));
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  clearTimeout(preloadTimer);
});
</script>

<template>
  <!-- The trigger and the language switch share one column, so the switch takes the trigger's width. -->
  <div class="the-overlay-index__corner">
    <button ref="trigger" type="button" class="the-overlay-index__trigger" aria-haspopup="dialog" :aria-expanded="open" @click="show()">
      <svg viewBox="0 0 14 14" aria-hidden="true" focusable="false"><circle cx="6" cy="6" r="4.5" /><path d="M9.4 9.4 13 13" /></svg>
      <span>{{ text.index.trigger(monumentIndex.length) }}</span>
    </button>
    <TheOverlayLang />
  </div>

  <Transition name="the-overlay-index">
    <!-- wheel.stop: the globe listens to the wheel on the window; inside the index it only scrolls the list. -->
    <div v-if="open" class="the-overlay-index" @click.self="close" @wheel.stop>
      <aside
        ref="panel"
        class="the-overlay-index__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="the-overlay-index-title"
        tabindex="-1"
      >
        <template v-if="!suggesting">
          <header class="the-overlay-index__head">
            <h2 id="the-overlay-index-title" class="the-overlay-index__title">{{ text.index.title }}</h2>
            <button type="button" class="the-overlay-index__close" :aria-label="text.index.close" @click="close">×</button>
          </header>

          <label class="the-overlay-index__label">
            {{ text.index.searchLabel }}
            <input
              ref="search"
              v-model="query"
              class="the-overlay-index__search"
              type="search"
              :placeholder="text.index.placeholder"
              role="combobox"
              aria-expanded="true"
              aria-controls="the-overlay-index-list"
              :aria-activedescendant="results.length ? rowId(activeIndex) : undefined"
              autocomplete="off"
              @keydown="onSearchKeydown"
            />
          </label>

          <div class="the-overlay-index__regions" role="group" :aria-label="text.index.regionLabel">
            <button type="button" class="the-overlay-index__chip" :aria-pressed="region === null" @click="region = null">{{ text.index.all }}</button>
            <button
              v-for="name in REGIONS"
              :key="name"
              type="button"
              class="the-overlay-index__chip"
              :aria-pressed="region === name"
              @click="region = name"
            >
              {{ text.regions[name] }}
            </button>
          </div>

          <p class="the-overlay-index__meta">
            <span v-if="isFiltering">{{ text.index.shown(results.length, monumentIndex.length) }}</span>
            <span v-else>{{ text.index.openSoon(openCount, monumentIndex.length - openCount) }}</span>
          </p>

          <ol v-if="results.length" id="the-overlay-index-list" class="the-overlay-index__list" role="listbox" :aria-label="text.index.listLabel">
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
                @pointerenter="preloadAfterPause(entry.destination)"
              >
                <span class="the-overlay-index__number">{{ pad(rankOf(entry)) }}</span>
                <span class="the-overlay-index__names">
                  <span class="the-overlay-index__monument">{{ entry.monument }}</span>
                  <span class="the-overlay-index__place">{{ entry.place }} · {{ entry.date }}</span>
                </span>
                <span class="the-overlay-index__status">{{ entry.destination ? text.index.open : text.index.soon }}</span>
              </button>
            </li>
          </ol>

          <div v-else class="the-overlay-index__empty" role="status">
            <p class="the-overlay-index__empty-title">{{ text.index.emptyTitle }}</p>
            <p class="the-overlay-index__empty-text">{{ text.index.emptyText }}</p>
            <button type="button" class="the-overlay-index__empty-clear" @click="clearFilters">{{ text.index.clear }}</button>
          </div>

          <button type="button" class="the-overlay-index__suggest" @click="suggesting = true">{{ text.index.suggest }}</button>
        </template>

        <TheOverlaySuggest v-else @back="suggesting = false" @close="close" />
      </aside>
    </div>
  </Transition>
</template>
