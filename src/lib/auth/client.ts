import { createAuthClient } from "better-auth/react";
import { apiKeyClient, adminClient, organizationClient } from "better-auth/client/plugins";

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
