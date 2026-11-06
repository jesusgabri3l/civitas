<script setup lang="ts">
import { LANGS, LANG_NAMES, withLang } from '../i18n/lang';
import { useUi } from './useUi';

// The language selector of the globe: English | Español, the current one marked (on phones only the other code, EN or ES).
// i18n/switch.ts remembers the choice in a cookie and reloads on the equivalent route (computed at click time: the SPA changes the path).
const { lang, text } = useUi();
</script>

<template>
  <div class="the-overlay-lang lang-switch" role="group" :aria-label="text.language">
    <template v-for="option in LANGS" :key="option">
      <span v-if="option === lang" class="lang-switch__option" :lang="option" aria-current="true">
        <span class="lang-switch__name">{{ LANG_NAMES[option] }}</span><span class="lang-switch__code" aria-hidden="true">{{ option }}</span>
      </span>
      <a v-else class="lang-switch__option" :href="withLang(option, '/')" :hreflang="option" :lang="option" :data-lang-switch="option">
        <span class="lang-switch__name">{{ LANG_NAMES[option] }}</span><span class="lang-switch__code" aria-hidden="true">{{ option }}</span>
      </a>
    </template>
  </div>
</template>
