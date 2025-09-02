import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';

export const userRouter = router({
  // Get current user
  me: protectedProcedure.query(async ({ ctx }) => {
    // Fetch user data from your database
    // This is just an example
    return {
      id: ctx.userId,
      email: 'user@example.com',
      name: 'User Name',
    };
  }),

  // Update user profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).optional(),
        bio: z.string().max(500).optional(),
        avatar: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update user in database
      console.log('Updating user:', ctx.userId, input);
      
      return {
        success: true,
        user: {
          id: ctx.userId,
          ...input,
        },
      };
    }),

  // Get user by ID (public)
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      // Fetch user from database
      return {
        id: input.id,
        name: 'Public User',
        avatar: null,
      };
    }),

  // List users with pagination
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { limit, cursor } = input;
      
      // Mock data
      const users = Array.from({ length: limit }, (_, i) => ({
        id: `user-${i + (cursor ? parseInt(cursor) : 0)}`,
        name: `User ${i + (cursor ? parseInt(cursor) : 0)}`,
        createdAt: new Date(),
      }));

      return {
        users,
        nextCursor: users.length === limit ? `${(cursor ? parseInt(cursor) : 0) + limit}` : null,
      };
    }),
});