import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import path from "path";

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});
const db = drizzle(pool);

async function main() {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log("Migrations applied successfully.");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
