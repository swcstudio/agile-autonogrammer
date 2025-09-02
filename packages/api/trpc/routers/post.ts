import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';

// Zod schemas for validation
const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  published: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
});

const updatePostSchema = createPostSchema.partial().extend({
  id: z.string(),
});

export const postRouter = router({
  // Create a new post
  create: protectedProcedure
    .input(createPostSchema)
    .mutation(async ({ ctx, input }) => {
      // Create post in database
      const post = {
        id: `post-${Date.now()}`,
        ...input,
        authorId: ctx.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return post;
    }),

  // Update an existing post
  update: protectedProcedure
    .input(updatePostSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      
      // Update post in database
      // Check if user owns the post
      
      return {
        id,
        ...data,
        updatedAt: new Date(),
      };
    }),

  // Delete a post
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Delete post from database
      // Check if user owns the post
      
      return { success: true };
    }),

  // Get a single post
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      // Fetch post from database
      return {
        id: input.id,
        title: 'Sample Post',
        content: 'This is a sample post content.',
        published: true,
        authorId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),

  // List posts with filters
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().optional(),
        filter: z.object({
          published: z.boolean().optional(),
          authorId: z.string().optional(),
          tags: z.array(z.string()).optional(),
        }).optional(),
      })
    )
    .query(async ({ input }) => {
      const { limit, cursor, filter } = input;
      
      // Fetch posts from database with filters
      const posts = Array.from({ length: limit }, (_, i) => ({
        id: `post-${i + (cursor ? parseInt(cursor) : 0)}`,
        title: `Post ${i + (cursor ? parseInt(cursor) : 0)}`,
        content: `Content for post ${i}`,
        published: true,
        authorId: `user-${i % 5}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      return {
        posts,
        nextCursor: posts.length === limit ? `${(cursor ? parseInt(cursor) : 0) + limit}` : null,
      };
    }),

  // Get posts by current user
  myPosts: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Fetch posts by current user
      const posts = Array.from({ length: 5 }, (_, i) => ({
        id: `my-post-${i}`,
        title: `My Post ${i}`,
        content: `My content ${i}`,
        published: i % 2 === 0,
        authorId: ctx.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      return {
        posts,
        nextCursor: null,
      };
    }),
});