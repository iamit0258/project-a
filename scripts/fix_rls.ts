
import pg from 'pg';
const { Client } = pg;

// Load .env via --env-file flag when running script

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("DATABASE_URL is not defined in .env");
    process.exit(1);
}

const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to database...");

        console.log("Applying RLS policy for 'messages' table...");

        await client.query(`
            -- Ensure RLS is enabled
            ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

            -- Drop old policy if exists
            DROP POLICY IF EXISTS "Enable all access for anon" ON messages;
            DROP POLICY IF EXISTS "Allow anonymous access" ON messages;

            -- Create permissive policy
            CREATE POLICY "Enable all access for anon" ON messages
            FOR ALL TO anon
            USING (true)
            WITH CHECK (true);
        `);

        console.log("Success! RLS policy applied. Anonymous users can now read/write messages.");
    } catch (err) {
        console.error("Failed to apply RLS fix:", err);
    } finally {
        await client.end();
    }
}

run();
