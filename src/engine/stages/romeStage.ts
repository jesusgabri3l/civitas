import { createDummyStage, shapes } from './createDummyStage';

export const createStage = () =>
  createDummyStage({ id: 'rome', skyColor: 0xaab8c8, color: 0xb86a4d, shape: shapes.cone });
