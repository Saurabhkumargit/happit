
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "../config/env.js";

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ...(env.NODE_ENV === "production" && {
    ssl: { rejectUnauthorized: true },
  }),
});

export const db = drizzle(pool);
