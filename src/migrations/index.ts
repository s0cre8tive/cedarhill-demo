import * as migration_20261029_000713_initial from './20261029_000713_initial';
import * as migration_20261105_143347_crm from './20261105_143347_crm';
import * as migration_20261105_150051_connect_popup from './20261105_150051_connect_popup';

export const migrations = [
  {
    up: migration_20261029_000713_initial.up,
    down: migration_20261029_000713_initial.down,
    name: '20261029_000713_initial',
  },
  {
    up: migration_20261105_143347_crm.up,
    down: migration_20261105_143347_crm.down,
    name: '20261105_143347_crm',
  },
  {
    up: migration_20261105_150051_connect_popup.up,
    down: migration_20261105_150051_connect_popup.down,
    name: '20261105_150051_connect_popup'
  },
];
