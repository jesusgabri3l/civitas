import { atom } from 'nanostores';

export type StageState = 'globe' | 'atenas' | 'roma' | 'paris';

export const $stageState = atom<StageState>('globe');
