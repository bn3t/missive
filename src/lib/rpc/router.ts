import { listEmails, getEmailById } from "./procedures/emails";

export const appRouter = {
  emails: {
    list: listEmails,
    getById: getEmailById,
  },
};

export type AppRouter = typeof appRouter;
