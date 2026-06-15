import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { apiKey, admin, organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";
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

  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          if (!session.activeOrganizationId) {
            const [membership] = await db
              .select({ organizationId: schema.member.organizationId })
              .from(schema.member)
              .where(eq(schema.member.userId, session.userId))
              .limit(1);
            if (membership) {
              await db
                .update(schema.session)
                .set({ activeOrganizationId: membership.organizationId })
                .where(eq(schema.session.id, session.id));
            }
          }
        },
      },
    },
  },

  plugins: [
    admin(),
    organization({
      organizationLimit: 1,
      allowUserToCreateOrganization: true,
      schema: {
        organization: {
          additionalFields: {
            deletedAt: {
              type: "date",
              required: false,
            },
          },
        },
      },
      organizationHooks: {
        afterRemoveMember: async (data) => {
          // Revoke all API keys for the removed user
          await db
            .update(schema.apikey)
            .set({ enabled: false })
            .where(eq(schema.apikey.userId, data.member.userId));
        },
        afterDeleteOrganization: async (data) => {
          // Revoke all API keys for all members of the deleted org
          // First get all member userIds, then revoke their keys
          const members = await db
            .select({ userId: schema.member.userId })
            .from(schema.member)
            .where(eq(schema.member.organizationId, data.organization.id));

          for (const m of members) {
            await db
              .update(schema.apikey)
              .set({ enabled: false })
              .where(eq(schema.apikey.userId, m.userId));
          }
        },
      },
    }),
    apiKey({
      defaultPrefix: "mk_",
      defaultKeyLength: 64,
      enableSessionForAPIKeys: true,
      enableMetadata: true,
      customAPIKeyGetter: (ctx) => {
        const xApiKey = ctx.headers?.get("x-api-key");
        if (xApiKey) return xApiKey;
        const auth = ctx.headers?.get("authorization");
        if (!auth) return null;
        return auth.startsWith("Bearer ") ? auth.slice(7) : auth;
      },
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
