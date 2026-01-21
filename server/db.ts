import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "",
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

if (!process.env.DATABASE_URL && process.env.NODE_ENV === "production") {
    console.error("CRITICAL: DATABASE_URL is not set in production!");
}

export const db = drizzle(pool, { schema });
