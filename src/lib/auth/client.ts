import { createAuthClient } from "better-auth/react";
import { apiKeyClient, adminClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [apiKeyClient(), adminClient()],
});

export const {
  signIn,
  signOut,
  useSession,
  apiKey,
} = authClient;
