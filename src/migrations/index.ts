import * as migration_20261029_000713_initial from './20261029_000713_initial';
import * as migration_20261105_143347_crm from './20261105_143347_crm';

export const migrations = [
  {
    up: migration_20261029_000713_initial.up,
    down: migration_20261029_000713_initial.down,
    name: '20261029_000713_initial',
  },
  {
    up: migration_20261105_143347_crm.up,
    down: migration_20261105_143347_crm.down,
    name: '20261105_143347_crm'
  },
];
