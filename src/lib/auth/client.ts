import { createAuthClient } from "better-auth/react";
import { adminClient, organizationClient } from "better-auth/client/plugins";
import { apiKeyClient } from "@better-auth/api-key/client";

export const authClient = createAuthClient({
  plugins: [apiKeyClient(), adminClient(), organizationClient()],
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  // fallow-ignore-next-line unused-export
  apiKey,
  organization,
} = authClient;
