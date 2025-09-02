import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';

const ContentBlockSchema = z.object({
  type: z.enum(['text', 'image', 'video', 'code', 'quote', 'gallery', 'embed', 'table', 'divider']),
  content: z.any(),
  metadata: z.record(z.any()).optional(),
});

const ArticleSchema = z.object({
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().optional(),
  content: z.array(ContentBlockSchema),
  featuredImage: z.string().optional(),
  author: z.string(),
  categories: z.array(z.string()),
  tags: z.array(z.string()),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']),
  publishedAt: z.date().optional(),
  scheduledAt: z.date().optional(),
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    ogImage: z.string().optional(),
  }).optional(),
  settings: z.object({
    allowComments: z.boolean().default(true),
    featured: z.boolean().default(false),
    sticky: z.boolean().default(false),
  }).optional(),
});

export const cmsRouter = router({
  // Articles/Blog Posts
  createArticle: protectedProcedure
    .input(ArticleSchema)
    .mutation(async ({ input, ctx }) => {
      return { id: 'article-id', ...input };
    }),

  updateArticle: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: ArticleSchema.partial(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),

  deleteArticle: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),

  getArticle: publicProcedure
    .input(z.object({
      id: z.string().optional(),
      slug: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return { /* article data */ };
    }),

  listArticles: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      author: z.string().optional(),
      status: z.enum(['draft', 'published', 'scheduled', 'archived']).optional(),
      search: z.string().optional(),
      sortBy: z.enum(['date', 'title', 'views', 'likes']).default('date'),
      order: z.enum(['asc', 'desc']).default('desc'),
      page: z.number().default(1),
      limit: z.number().default(10),
    }))
    .query(async ({ input }) => {
      return { articles: [], total: 0, pages: 0 };
    }),

  // Pages
  createPage: protectedProcedure
    .input(z.object({
      title: z.string(),
      slug: z.string(),
      content: z.array(ContentBlockSchema),
      template: z.string().optional(),
      parent: z.string().optional(),
      order: z.number().optional(),
      status: z.enum(['draft', 'published']),
      seo: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        keywords: z.array(z.string()).optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { id: 'page-id', ...input };
    }),

  getPage: publicProcedure
    .input(z.object({
      id: z.string().optional(),
      slug: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return { /* page data */ };
    }),

  listPages: publicProcedure
    .query(async () => {
      return { pages: [] };
    }),

  // Categories
  createCategory: protectedProcedure
    .input(z.object({
      name: z.string(),
      slug: z.string(),
      description: z.string().optional(),
      parent: z.string().optional(),
      image: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { id: 'category-id', ...input };
    }),

  updateCategory: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: z.object({
        name: z.string().optional(),
        slug: z.string().optional(),
        description: z.string().optional(),
        parent: z.string().optional(),
        image: z.string().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),

  getCategories: publicProcedure
    .query(async () => {
      return { categories: [] };
    }),

  // Tags
  createTag: protectedProcedure
    .input(z.object({
      name: z.string(),
      slug: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { id: 'tag-id', ...input };
    }),

  getTags: publicProcedure
    .query(async () => {
      return { tags: [] };
    }),

  // Comments
  createComment: publicProcedure
    .input(z.object({
      articleId: z.string(),
      parentId: z.string().optional(),
      author: z.string(),
      email: z.string().email(),
      content: z.string(),
      website: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return { id: 'comment-id', ...input, status: 'pending' };
    }),

  getComments: publicProcedure
    .input(z.object({
      articleId: z.string(),
      status: z.enum(['pending', 'approved', 'spam']).optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      return { comments: [], total: 0 };
    }),

  moderateComment: protectedProcedure
    .input(z.object({
      commentId: z.string(),
      action: z.enum(['approve', 'spam', 'delete']),
    }))
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),

  // Media Library
  uploadMedia: protectedProcedure
    .input(z.object({
      filename: z.string(),
      mimeType: z.string(),
      size: z.number(),
      alt: z.string().optional(),
      caption: z.string().optional(),
      folder: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return {
        id: 'media-id',
        url: 'https://cdn.katalyst.io/media/file.jpg',
        thumbnailUrl: 'https://cdn.katalyst.io/media/file-thumb.jpg',
      };
    }),

  getMediaLibrary: protectedProcedure
    .input(z.object({
      folder: z.string().optional(),
      type: z.enum(['image', 'video', 'document', 'audio']).optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(50),
    }))
    .query(async ({ input, ctx }) => {
      return { media: [], folders: [], total: 0 };
    }),

  deleteMedia: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),

  // Content Blocks/Components
  createContentBlock: protectedProcedure
    .input(z.object({
      name: z.string(),
      type: z.string(),
      content: z.any(),
      global: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      return { id: 'block-id', ...input };
    }),

  getContentBlocks: protectedProcedure
    .input(z.object({
      type: z.string().optional(),
      global: z.boolean().optional(),
    }))
    .query(async ({ input, ctx }) => {
      return { blocks: [] };
    }),

  // Revisions/Version Control
  createRevision: protectedProcedure
    .input(z.object({
      contentType: z.enum(['article', 'page']),
      contentId: z.string(),
      data: z.any(),
      message: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { id: 'revision-id', version: 1 };
    }),

  getRevisions: protectedProcedure
    .input(z.object({
      contentType: z.enum(['article', 'page']),
      contentId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      return { revisions: [] };
    }),

  restoreRevision: protectedProcedure
    .input(z.object({
      revisionId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),

  // Search
  searchContent: publicProcedure
    .input(z.object({
      query: z.string(),
      types: z.array(z.enum(['article', 'page', 'product'])).optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      return { results: [] };
    }),

  // Sitemap
  getSitemap: publicProcedure
    .query(async () => {
      return {
        pages: [],
        articles: [],
        products: [],
        lastModified: new Date(),
      };
    }),

  // RSS Feed
  getRssFeed: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      return {
        title: 'Blog RSS Feed',
        description: 'Latest articles',
        items: [],
      };
    }),
});