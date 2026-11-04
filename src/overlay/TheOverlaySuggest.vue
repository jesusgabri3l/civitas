<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { track } from '../state/track';

/**
 * "Suggest a monument", inside the index panel. POST /api/suggest (JSON) → the server checks Turnstile and appends a row to a Google Sheet.
 * `website` is the honeypot: hidden from people, bots tend to fill it.
 */
defineEmits<{ back: []; close: [] }>();

type Status = 'idle' | 'sending' | 'sent' | 'error';

const SITE_KEY = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string | undefined;
const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const LIMITS = { short: 200, long: 1000 };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}
const turnstile = () => (window as unknown as { turnstile?: TurnstileApi }).turnstile;

const form = reactive({ monument: '', place: '', why: '', email: '', website: '' });
const status = ref<Status>('idle');
const message = ref('');
const token = ref('');
const widget = ref<HTMLElement | null>(null);
let widgetId: string | undefined;

function problemWith(): string | null {
  const monument = form.monument.trim();
  const place = form.place.trim();
  const email = form.email.trim();
  if (!monument || !place) return 'Add the monument and its city and country.';
  if (monument.length > LIMITS.short || place.length > LIMITS.short) return `Keep the name and the place under ${LIMITS.short} characters.`;
  if (form.why.trim().length > LIMITS.long) return `Keep the story under ${LIMITS.long} characters.`;
  if (email && (!EMAIL.test(email) || email.length > LIMITS.short)) return 'That email does not look right.';
  if (SITE_KEY && !token.value) return 'Confirm you are human first. The check is just above the button.';
  return null;
}

function loadTurnstile(): Promise<void> {
  if (turnstile()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = TURNSTILE_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile did not load'));
    document.head.appendChild(script);
  });
}

async function mountWidget() {
  if (!SITE_KEY || !widget.value) return;
  try {
    await loadTurnstile();
    widgetId = turnstile()?.render(widget.value, {
      sitekey: SITE_KEY,
      theme: 'dark',
      callback: (value: string) => (token.value = value),
      'expired-callback': () => (token.value = ''),
      'error-callback': () => (token.value = ''),
    });
  } catch {
    // The send button will say what is missing.
  }
}

async function send() {
  if (status.value === 'sending') return;
  const problem = problemWith();
  if (problem) {
    status.value = 'error';
    message.value = problem;
    return;
  }
  status.value = 'sending';
  message.value = '';
  try {
    const response = await fetch('/api/suggest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...form, token: token.value }),
    });
    if (!response.ok) throw new Error(String(response.status));
    status.value = 'sent';
    track('suggest_sent');
  } catch {
    status.value = 'error';
    message.value = 'Something went wrong and nothing was sent. Please try again in a moment.';
    token.value = '';
    turnstile()?.reset(widgetId);
  }
}

onMounted(mountWidget);
onBeforeUnmount(() => widgetId && turnstile()?.remove(widgetId));
</script>

<template>
  <div v-if="status === 'sent'" class="the-overlay-suggest">
    <header class="the-overlay-index__head">
      <button type="button" class="the-overlay-index__close" aria-label="Back to the index" @click="$emit('back')">←</button>
      <h2 id="the-overlay-index-title" class="the-overlay-index__title">Suggest a monument</h2>
      <button type="button" class="the-overlay-index__close" aria-label="Close" @click="$emit('close')">×</button>
    </header>
    <p class="the-overlay-suggest__intro" role="status">Thank you. Your suggestion is in: we read every one.</p>
  </div>

  <form v-else class="the-overlay-suggest" novalidate @submit.prevent="send">
    <header class="the-overlay-index__head">
      <button type="button" class="the-overlay-index__close" aria-label="Back to the index" @click="$emit('back')">←</button>
      <h2 id="the-overlay-index-title" class="the-overlay-index__title">Suggest a monument</h2>
      <button type="button" class="the-overlay-index__close" aria-label="Close" @click="$emit('close')">×</button>
    </header>

    <p class="the-overlay-suggest__intro">Which landmark should Civitas rebuild next? Tell us what it is and why its story is worth telling.</p>

    <label class="the-overlay-index__label">
      Monument
      <input v-model="form.monument" class="the-overlay-index__search" type="text" placeholder="e.g. Angkor Wat" required :maxlength="LIMITS.short" autocomplete="off" />
    </label>
    <label class="the-overlay-index__label">
      City and country
      <input v-model="form.place" class="the-overlay-index__search" type="text" placeholder="e.g. Siem Reap, Cambodia" required :maxlength="LIMITS.short" autocomplete="off" />
    </label>
    <label class="the-overlay-index__label">
      Why this one
      <textarea v-model="form.why" class="the-overlay-index__search the-overlay-suggest__area" rows="4" placeholder="A moment of its history you would like to see" :maxlength="LIMITS.long"></textarea>
    </label>
    <label class="the-overlay-index__label">
      Email (optional)
      <input v-model="form.email" class="the-overlay-index__search" type="email" placeholder="We’ll tell you when it’s live" :maxlength="LIMITS.short" autocomplete="email" />
    </label>

    <!-- Honeypot: out of sight and out of the tab order. -->
    <div class="the-overlay-suggest__trap" aria-hidden="true">
      <label>Website <input v-model="form.website" type="text" name="website" tabindex="-1" autocomplete="off" /></label>
    </div>

    <div v-if="SITE_KEY" ref="widget" class="the-overlay-suggest__check"></div>

    <p v-if="status === 'error'" class="the-overlay-suggest__error" role="alert">{{ message }}</p>

    <button type="submit" class="the-overlay-suggest__send" :disabled="status === 'sending'" :aria-busy="status === 'sending'">
      {{ status === 'sending' ? 'Sending…' : 'Send suggestion' }}
    </button>
  </form>
</template>
