<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { $appState, seedAppState, stateFor, type StageId } from '../state/appStore';

const props = defineProps<{ initialState: StageId }>();
seedAppState(stateFor(props.initialState, false));
const appState = useStore($appState);
</script>

<template>
  <div class="the-overlay" aria-live="polite">
    <span class="the-overlay__state">{{ appState.kind }}</span>
  </div>
</template>
