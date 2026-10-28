import { createDummyStage, shapes } from './createDummyStage';

export const createStage = () =>
  createDummyStage({ id: 'paris', skyColor: 0x141026, color: 0xd9a441, shape: shapes.sphere });
