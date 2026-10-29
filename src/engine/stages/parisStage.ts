import { createDummyStage, shapes } from './createDummyStage';

export const createStage = () =>
  createDummyStage({ id: 'paris', color: 0xd9a441, shape: shapes.sphere });
