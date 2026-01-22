
import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL is not defined in environment variables.");
    process.exit(1);
}

async function runMigration() {
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase/some cloud DBs
    });

    try {
        await client.connect();
        console.log("Connected to database...");

        const query = `
      ALTER TABLE messages 
      ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;
    `;

        console.log("Running migration: " + query);
        await client.query(query);
        console.log("Migration successful: 'is_archived' column added.");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

runMigration();
