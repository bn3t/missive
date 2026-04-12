import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey, admin } from "better-auth/plugins";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  advanced: {
    database: {
      generateId: "uuid",
    },
  },

  emailAndPassword: {
    enabled: true,
  },

  plugins: [
    admin(),
    apiKey({
      defaultPrefix: "mk_",
      defaultKeyLength: 64,
      enableSessionForAPIKeys: true,
      apiKeyHeaders: ["x-api-key", "authorization"],
      enableMetadata: true,
      rateLimit: {
        enabled: false,
      },
      keyExpiration: {
        defaultExpiresIn: null,
      },
      requireName: true,
    }),
  ],
});
