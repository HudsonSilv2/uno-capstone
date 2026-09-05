import { Sequelize, type Options } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

/*
  Two ways to point the API at a database:

  - DATABASE_URL: a single connection string. This is what Supabase hands out,
    and it takes precedence when present.
  - DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD: the discrete variables
    used by the local docker-compose database.

  Nothing else in the code changes between the two.
*/
const connectionUrl = process.env.DATABASE_URL?.trim();

/*
  A managed database requires TLS; the local container does not have it. The
  host in the URL decides, and DB_SSL forces the answer when needed.
*/
function shouldUseSsl(url: string | undefined): boolean {
  if (process.env.DB_SSL) {
    return process.env.DB_SSL === 'true';
  }
  if (!url) {
    return false;
  }
  return !/@(localhost|127\.0\.0\.1|host\.docker\.internal)[:/]/.test(url);
}

/*
  Supabase serves its certificate through a chain Node does not carry by
  default, so verification is off unless the team installs the CA and sets
  DB_SSL_REJECT_UNAUTHORIZED=true. The connection is still encrypted either way.
*/
const sslOptions = {
  require: true,
  rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
};

const baseOptions: Options = {
  dialect: 'postgres',
  logging: false,
  /*
    A hosted database charges for idle connections and caps how many are open,
    so the pool stays small and hands connections back quickly.
  */
  pool: {
    max: Number(process.env.DB_POOL_MAX) || 5,
    min: 0,
    idle: 10000,
    acquire: 30000,
  },
  ...(shouldUseSsl(connectionUrl) ? { dialectOptions: { ssl: sslOptions } } : {}),
};

const sequelize = connectionUrl
  ? new Sequelize(connectionUrl, baseOptions)
  : new Sequelize(
      process.env.DB_NAME || 'uno_game',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || 'postgres',
      {
        ...baseOptions,
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
      }
    );

export default sequelize;
