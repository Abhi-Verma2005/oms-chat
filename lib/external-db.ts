// lib/external-db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as externalRelations from './drizzle-external/relations';
import * as externalSchema from './drizzle-external/schema';

// External DB connection string
const externalClient = postgres(process.env.EXTERNAL_DB!, {
  max: 5, // optional: keep it light
});

export const external_db = drizzle(externalClient, {
  schema: { ...externalSchema, ...externalRelations },
});
