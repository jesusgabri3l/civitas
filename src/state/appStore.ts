import { atom, computed } from 'nanostores';
import type { DestinationId } from '../cities';

export type StageId = 'globe' | DestinationId;

/** Single source of truth for what the user is looking at. */
export type AppState =
  | { kind: 'globe' }
  | { kind: 'transitioning'; to: StageId; info: boolean }
  | { kind: 'monument'; city: DestinationId }
  | { kind: 'info'; city: DestinationId };

export const $appState = atom<AppState>({ kind: 'globe' });

let initialized = false;

export function stateFor(stage: StageId, info: boolean): AppState {
  if (stage === 'globe') return { kind: 'globe' };
  return info ? { kind: 'info', city: stage } : { kind: 'monument', city: stage };
}

/** Stage that must be on screen for a given state. */
export function stageOf(state: AppState): StageId {
  if (state.kind === 'globe') return 'globe';
  if (state.kind === 'transitioning') return state.to;
  return state.city;
}

export const $targetStage = computed($appState, stageOf);

/** Used by SSR/hydration: only applies if the router has not taken over yet. */
export function seedAppState(state: AppState) {
  if (initialized) return;
  $appState.set(state);
}

/** Used by the router: authoritative and instant (no transition). */
export function initAppState(state: AppState) {
  initialized = true;
  $appState.set(state);
}

export function setSettledState(stage: StageId, info: boolean) {
  $appState.set(stateFor(stage, info));
}

export function beginTransition(to: StageId, info: boolean) {
  $appState.set({ kind: 'transitioning', to, info });
}

/** Called when the stage swap finished; ignored if the user already asked for something else. */
export function settleTransition(to: StageId) {
  const state = $appState.get();
  if (state.kind !== 'transitioning' || state.to !== to) return;
  $appState.set(stateFor(to, state.info));
}

export function resetAppStateForTests() {
  initialized = false;
  $appState.set({ kind: 'globe' });
}
