<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { track } from '../state/track';
import { useUi } from './useUi';

/**
 * "Suggest a monument", inside the index panel. POST /api/suggest (JSON) → the server checks Turnstile and appends a row to a Google Sheet.
 * `website` is the honeypot: hidden from people, bots tend to fill it.
 */
defineEmits<{ back: []; close: [] }>();
const { text } = useUi();
const t = text.suggest;

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
  if (!monument || !place) return t.missingFields;
  if (monument.length > LIMITS.short || place.length > LIMITS.short) return t.shortTooLong(LIMITS.short);
  if (form.why.trim().length > LIMITS.long) return t.longTooLong(LIMITS.long);
  if (email && (!EMAIL.test(email) || email.length > LIMITS.short)) return t.badEmail;
  if (SITE_KEY && !token.value) return t.confirmHuman;
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
      // Invisible unless Cloudflare needs the visitor to click: the checkbox box no longer sits behind Send on phones.
      appearance: 'interaction-only',
      size: 'flexible',
      // When it does show up, bring it into view: on phones the pinned Send button could cover it.
      'before-interactive-callback': () => requestAnimationFrame(() => widget.value?.scrollIntoView({ block: 'center', behavior: 'smooth' })),
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
    message.value = t.failed;
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
      <button type="button" class="the-overlay-index__close" :aria-label="t.back" @click="$emit('back')">←</button>
      <h2 id="the-overlay-index-title" class="the-overlay-index__title">{{ t.title }}</h2>
      <button type="button" class="the-overlay-index__close" :aria-label="t.close" @click="$emit('close')">×</button>
    </header>
    <p class="the-overlay-suggest__intro" role="status">{{ t.thanks }}</p>
  </div>

  <form v-else class="the-overlay-suggest" novalidate @submit.prevent="send">
    <header class="the-overlay-index__head">
      <button type="button" class="the-overlay-index__close" :aria-label="t.back" @click="$emit('back')">←</button>
      <h2 id="the-overlay-index-title" class="the-overlay-index__title">{{ t.title }}</h2>
      <button type="button" class="the-overlay-index__close" :aria-label="t.close" @click="$emit('close')">×</button>
    </header>

    <p class="the-overlay-suggest__intro">{{ t.intro }}</p>

    <label class="the-overlay-index__label">
      {{ t.monument }}
      <input v-model="form.monument" class="the-overlay-index__search" type="text" :placeholder="t.monumentPlaceholder" required :maxlength="LIMITS.short" autocomplete="off" />
    </label>
    <label class="the-overlay-index__label">
      {{ t.place }}
      <input v-model="form.place" class="the-overlay-index__search" type="text" :placeholder="t.placePlaceholder" required :maxlength="LIMITS.short" autocomplete="off" />
    </label>
    <label class="the-overlay-index__label">
      {{ t.why }}
      <textarea v-model="form.why" class="the-overlay-index__search the-overlay-suggest__area" rows="4" :placeholder="t.whyPlaceholder" :maxlength="LIMITS.long"></textarea>
    </label>
    <label class="the-overlay-index__label">
      {{ t.email }}
      <input v-model="form.email" class="the-overlay-index__search" type="email" :placeholder="t.emailPlaceholder" :maxlength="LIMITS.short" autocomplete="email" />
    </label>

    <!-- Honeypot: out of sight and out of the tab order. -->
    <div class="the-overlay-suggest__trap" aria-hidden="true">
      <label>{{ t.website }} <input v-model="form.website" type="text" name="website" tabindex="-1" autocomplete="off" /></label>
    </div>

    <div v-if="SITE_KEY" ref="widget" class="the-overlay-suggest__check"></div>

    <p v-if="status === 'error'" class="the-overlay-suggest__error" role="alert">{{ message }}</p>

    <button type="submit" class="the-overlay-suggest__send" :disabled="status === 'sending'" :aria-busy="status === 'sending'">
      {{ status === 'sending' ? t.sending : t.send }}
    </button>
  </form>
</template>
