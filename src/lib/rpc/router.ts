import { listEmails, getEmailById } from "./procedures/emails";
import { findUserByEmail } from "./procedures/users";

export const appRouter = {
  emails: {
    list: listEmails,
    getById: getEmailById,
  },
  users: {
    findByEmail: findUserByEmail,
  },
};

export type AppRouter = typeof appRouter;
