import { inferAsyncReturnType } from '@trpc/server';
import { CreateNextContextOptions } from '@trpc/server/adapters/next';
import { NodeHTTPCreateContextFnOptions } from '@trpc/server/adapters/node-http';
import { getAuth } from '@clerk/nextjs/server';

export async function createContextInner() {
  return {
    // Add your context properties here
    // For example: db, session, etc.
  };
}

/**
 * Creates context for Next.js app router
 */
export async function createContext(
  opts: CreateNextContextOptions | NodeHTTPCreateContextFnOptions<Request, Response>
) {
  const contextInner = await createContextInner();

  // Get auth from Clerk if available
  let userId: string | null = null;
  if ('req' in opts && 'cookies' in opts.req) {
    const auth = getAuth(opts.req as any);
    userId = auth.userId;
  }

  return {
    ...contextInner,
    userId,
    req: opts.req,
    res: opts.res,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;