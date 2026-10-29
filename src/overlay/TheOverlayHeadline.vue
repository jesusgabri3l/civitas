<script lang="ts">
/** In-memory, per page load: the typing plays once; coming back to the hub shows the text already written. */
let headlineAlreadyTyped = false;
</script>

<script setup lang="ts">
import { onMounted } from 'vue';
import { headlineLines, headlineSubtitle } from '../data/headline';

const alreadyTyped = headlineAlreadyTyped;
// Only on the client (onMounted never runs during SSR), so the prerendered HTML always types.
onMounted(() => {
  headlineAlreadyTyped = true;
});

/** Typewriter timing is all CSS: every letter knows its place in the whole headline. */
const letterCount = headlineLines.join('').replace(/\s/g, '').length;
let nextIndex = 0;
const lines = headlineLines.map((line) =>
  line.split(' ').map((word) => Array.from(word, (letter) => ({ letter, index: nextIndex++ }))),
);
/** The subtitle types itself the same way, right after the headline, faster. */
const subtitleLetterCount = headlineSubtitle.replace(/\s/g, '').length;
let nextSubtitleIndex = 0;
const subtitleWords = headlineSubtitle
  .split(' ')
  .map((word) => Array.from(word, (letter) => ({ letter, index: nextSubtitleIndex++ })));
const lastSubtitleIndex = subtitleLetterCount - 1;
</script>

<template>
  <div class="the-overlay-headline" :class="{ 'the-overlay-headline--typed': alreadyTyped }" data-headline :style="{ '--letter-count': letterCount, '--subtitle-letter-count': subtitleLetterCount }">
    <p class="the-overlay-headline__title" :aria-label="headlineLines.join(' ')">
      <span v-for="(words, lineIndex) in lines" :key="lineIndex" class="the-overlay-headline__line" aria-hidden="true">
        <span v-for="(word, wordIndex) in words" :key="wordIndex" class="the-overlay-headline__word">
          <span v-for="{ letter, index } in word" :key="index" class="the-overlay-headline__letter" :style="{ '--letter-index': index }">{{ letter }}</span>
        </span>
      </span>
    </p>
    <p class="the-overlay-headline__subtitle" :aria-label="headlineSubtitle">
      <span v-for="(word, wordIndex) in subtitleWords" :key="wordIndex" class="the-overlay-headline__subtitle-word" aria-hidden="true">
        <span
          v-for="{ letter, index } in word"
          :key="index"
          class="the-overlay-headline__subtitle-letter"
          :class="{ 'the-overlay-headline__subtitle-letter--last': index === lastSubtitleIndex }"
          :style="{ '--letter-index': index }"
        >{{ letter }}</span>
      </span>
    </p>
  </div>
</template>
