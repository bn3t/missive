import { auth } from "./src/lib/auth/server";
import { db } from "./src/lib/db";
import { user } from "./src/lib/db/schema";
import { eq } from "drizzle-orm";

async function seed() {
  const email = process.env.SEED_EMAIL ?? "admin@missive.dev";
  const password = process.env.SEED_PASSWORD;
  if (!password) {
    throw new Error("SEED_PASSWORD environment variable is required");
  }
  const name = process.env.SEED_NAME ?? "Admin";

  let userId: string;

  try {
    const result = await auth.api.signUpEmail({
      body: { email, password, name },
    });
    userId = result.user.id;
    console.log("✅ Admin user created:", email);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("already") || msg.includes("ALREADY_EXISTS") || msg.includes("CONFLICT")) {
      // User exists — look up their id
      const [existing] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email))
        .limit(1);
      if (!existing) throw new Error("User not found after conflict");
      userId = existing.id;
      console.log("ℹ️  Admin user already exists, ensuring admin role...");
    } else {
      console.error("❌ Failed to create admin user:", error);
      throw error;
    }
  }

  // Set admin role directly in DB (setRole API requires an active session)
  await db.update(user).set({ role: "admin" }).where(eq(user.id, userId));
  console.log("✅ Admin role set for:", email);
  console.log("\n💡 Next step: Create an API key in the dashboard for testing");

  process.exit(0);
}

seed();
