<script setup lang="ts">
import { reactive } from 'vue';

/**
 * "Suggest a monument", inside the index panel.
 * UI ONLY FOR NOW: nothing is sent. TODO: pick a backend (form service, Cloudflare Worker + KV, or a GitHub issue), validate, show a
 * sent state and an error state, add spam protection (honeypot or Turnstile).
 */
defineEmits<{ back: []; close: [] }>();

const form = reactive({ monument: '', place: '', why: '', email: '' });
</script>

<template>
  <form class="the-overlay-suggest" @submit.prevent>
    <header class="the-overlay-index__head">
      <button type="button" class="the-overlay-index__close" aria-label="Back to the index" @click="$emit('back')">←</button>
      <h2 id="the-overlay-index-title" class="the-overlay-index__title">Suggest a monument</h2>
      <button type="button" class="the-overlay-index__close" aria-label="Close" @click="$emit('close')">×</button>
    </header>

    <p class="the-overlay-suggest__intro">Which landmark should Civitas rebuild next? Tell us what it is and why its story is worth telling.</p>

    <label class="the-overlay-index__label">
      Monument
      <input v-model="form.monument" class="the-overlay-index__search" type="text" placeholder="e.g. Angkor Wat" required />
    </label>
    <label class="the-overlay-index__label">
      City and country
      <input v-model="form.place" class="the-overlay-index__search" type="text" placeholder="e.g. Siem Reap, Cambodia" required />
    </label>
    <label class="the-overlay-index__label">
      Why this one
      <textarea v-model="form.why" class="the-overlay-index__search the-overlay-suggest__area" rows="4" placeholder="A moment of its history you would like to see"></textarea>
    </label>
    <label class="the-overlay-index__label">
      Email (optional)
      <input v-model="form.email" class="the-overlay-index__search" type="email" placeholder="We’ll tell you when it’s live" />
    </label>

    <button type="submit" class="the-overlay-suggest__send" disabled aria-describedby="the-overlay-suggest-soon">Send suggestion</button>
    <p id="the-overlay-suggest-soon" class="the-overlay-index__meta">Coming soon</p>
  </form>
</template>
