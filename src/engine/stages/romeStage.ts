import { createDummyStage, shapes } from './createDummyStage';

export const createStage = () =>
  createDummyStage({ id: 'rome', color: 0xb86a4d, shape: shapes.cone });
