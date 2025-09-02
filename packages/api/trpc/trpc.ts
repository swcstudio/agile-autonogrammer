import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { type Context } from './context';
import { ZodError } from 'zod';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError
            ? error.cause.flatten()
            : null,
      },
    };
  },
});

/**
 * Create a router
 */
export const router = t.router;

/**
 * Public procedure
 */
export const publicProcedure = t.procedure;

/**
 * Reusable middleware that checks if users are authenticated
 */
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      // Infers the `userId` as non-nullable
      userId: ctx.userId,
    },
  });
});

/**
 * Protected procedure
 */
export const protectedProcedure = t.procedure.use(isAuthed);

/**
 * Merge routers
 */
export const mergeRouters = t.mergeRouters;