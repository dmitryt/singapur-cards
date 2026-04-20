// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import journal from './meta/_journal.json';
import m0000 from './0000_gigantic_sharon_ventura.sql';
import m0001 from './0001_fearless_omega_flight.sql';
import m0002 from './0002_wakeful_the_liberteens.sql';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002,
  },
};
  