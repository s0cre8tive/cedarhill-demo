import * as migration_20261029_000713_initial from './20261029_000713_initial';

export const migrations = [
  {
    up: migration_20261029_000713_initial.up,
    down: migration_20261029_000713_initial.down,
    name: '20261029_000713_initial'
  },
];
