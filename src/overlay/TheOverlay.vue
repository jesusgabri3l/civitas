<script setup lang="ts">
import { useStore } from '@nanostores/vue';
import { $stageState } from '../state/stageStore';

const props = defineProps<{ initialState: 'globe' | 'atenas' | 'roma' | 'paris' }>();
$stageState.set(props.initialState);
const stageState = useStore($stageState);
</script>

<template>
  <div class="the-overlay" aria-live="polite">
    <span class="the-overlay__state">{{ stageState }}</span>
  </div>
</template>
