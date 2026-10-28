import { createDummyStage, shapes } from './createDummyStage';

export const createStage = () =>
  createDummyStage({ id: 'athens', skyColor: 0xf2c27a, color: 0xe8dcc0, shape: shapes.box });
