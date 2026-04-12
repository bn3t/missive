import { RPCHandler } from "@orpc/server/fetch";
import { ZodSmartCoercionPlugin } from "@orpc/zod";
import { appRouter } from "@/lib/rpc/router";
import { headers } from "next/headers";

const handler = new RPCHandler(appRouter, {
  plugins: [new ZodSmartCoercionPlugin()],
});

export async function POST(request: Request) {
  const headersList = await headers();

  const { matched, response } = await handler.handle(request, {
    context: { headers: headersList } as any,
  });

  if (matched) {
    return response;
  }

  return new Response("Not Found", { status: 404 });
}
