import { createDummyStage, shapes } from './createDummyStage';

export const createStage = () =>
  createDummyStage({ id: 'globe', skyColor: 0x0b1220, color: 0x4d7fb8, shape: shapes.sphere });
