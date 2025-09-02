import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';

const ComponentSchema = z.object({
  id: z.string(),
  type: z.string(),
  props: z.record(z.any()),
  children: z.array(z.lazy(() => ComponentSchema)).optional(),
  styles: z.record(z.any()).optional(),
  animations: z.array(z.object({
    trigger: z.enum(['onMount', 'onScroll', 'onHover', 'onClick']),
    animation: z.string(),
    duration: z.number(),
    delay: z.number().optional(),
  })).optional(),
  events: z.array(z.object({
    type: z.string(),
    action: z.string(),
    params: z.record(z.any()).optional(),
  })).optional(),
});

export const builderRouter = router({
  // Projects
  createProject: protectedProcedure
    .input(z.object({
      name: z.string(),
      type: z.enum(['website', 'app', 'landing', 'dashboard', 'form']),
      template: z.string().optional(),
      settings: z.object({
        domain: z.string().optional(),
        subdomain: z.string().optional(),
        favicon: z.string().optional(),
        analytics: z.object({
          google: z.string().optional(),
          facebook: z.string().optional(),
          custom: z.string().optional(),
        }).optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { id: 'project-id', ...input };
    }),

  getProject: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      return { /* project data */ };
    }),

  listProjects: protectedProcedure
    .query(async ({ ctx }) => {
      return { projects: [] };
    }),

  deleteProject: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),

  duplicateProject: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { id: 'new-project-id' };
    }),

  // Pages within projects
  createPage: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string(),
      path: z.string(),
      title: z.string(),
      description: z.string().optional(),
      isHomePage: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      return { id: 'page-id', ...input };
    }),

  updatePage: protectedProcedure
    .input(z.object({
      id: z.string(),
      components: z.array(ComponentSchema),
      globalStyles: z.record(z.any()).optional(),
      pageSettings: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        ogImage: z.string().optional(),
      }).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),

  // Components
  saveComponent: protectedProcedure
    .input(z.object({
      pageId: z.string(),
      component: ComponentSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),

  createCustomComponent: protectedProcedure
    .input(z.object({
      name: z.string(),
      category: z.string(),
      component: ComponentSchema,
      thumbnail: z.string().optional(),
      isGlobal: z.boolean().default(false),
    }))
    .mutation(async ({ input, ctx }) => {
      return { id: 'component-id', ...input };
    }),

  getComponentLibrary: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      return {
        components: [
          {
            id: 'hero-1',
            name: 'Hero Section',
            category: 'sections',
            thumbnail: 'url',
            component: {},
          }
        ]
      };
    }),

  // Templates
  getTemplates: publicProcedure
    .input(z.object({
      type: z.enum(['website', 'app', 'landing', 'dashboard', 'form']).optional(),
      category: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return {
        templates: [
          {
            id: 'template-1',
            name: 'E-commerce Store',
            type: 'website',
            category: 'business',
            thumbnail: 'url',
            preview: 'url',
            pages: 5,
          }
        ]
      };
    }),

  useTemplate: protectedProcedure
    .input(z.object({
      templateId: z.string(),
      projectName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { projectId: 'new-project-id' };
    }),

  // Assets
  uploadAsset: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      filename: z.string(),
      mimeType: z.string(),
      size: z.number(),
      folder: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return {
        id: 'asset-id',
        url: 'https://cdn.katalyst.io/assets/file.jpg',
      };
    }),

  getAssets: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      type: z.enum(['image', 'video', 'font', 'icon']).optional(),
      folder: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      return { assets: [] };
    }),

  // Styles
  saveGlobalStyles: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      styles: z.object({
        colors: z.record(z.string()).optional(),
        fonts: z.record(z.any()).optional(),
        spacing: z.record(z.number()).optional(),
        breakpoints: z.record(z.number()).optional(),
        custom: z.string().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),

  // Data Sources
  createDataSource: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string(),
      type: z.enum(['api', 'database', 'csv', 'json', 'graphql']),
      config: z.record(z.any()),
    }))
    .mutation(async ({ input, ctx }) => {
      return { id: 'datasource-id', ...input };
    }),

  testDataSource: protectedProcedure
    .input(z.object({
      config: z.record(z.any()),
    }))
    .mutation(async ({ input, ctx }) => {
      return { success: true, sample: {} };
    }),

  // Forms
  createForm: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      name: z.string(),
      fields: z.array(z.object({
        name: z.string(),
        type: z.string(),
        label: z.string(),
        required: z.boolean(),
        validation: z.record(z.any()).optional(),
      })),
      actions: z.array(z.object({
        type: z.enum(['email', 'webhook', 'database', 'integration']),
        config: z.record(z.any()),
      })),
    }))
    .mutation(async ({ input, ctx }) => {
      return { id: 'form-id', ...input };
    }),

  // Publishing
  publishProject: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      environment: z.enum(['staging', 'production']),
    }))
    .mutation(async ({ input, ctx }) => {
      return {
        success: true,
        url: 'https://project.katalyst.app',
        deploymentId: 'deployment-id',
      };
    }),

  getDeployments: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      return {
        deployments: [
          {
            id: 'deployment-id',
            environment: 'production',
            url: 'https://project.katalyst.app',
            status: 'active',
            createdAt: new Date(),
          }
        ]
      };
    }),

  // Preview
  getPreviewUrl: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      pageId: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      return {
        url: 'https://preview.katalyst.app/project-id',
        expiresAt: new Date(Date.now() + 3600000),
      };
    }),

  // Code Export
  exportCode: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      framework: z.enum(['react', 'vue', 'angular', 'html', 'next', 'nuxt']),
      includeAssets: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      return {
        downloadUrl: 'https://downloads.katalyst.io/export.zip',
        expiresAt: new Date(Date.now() + 3600000),
      };
    }),

  // Collaboration
  shareProject: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      email: z.string().email(),
      role: z.enum(['viewer', 'editor', 'admin']),
    }))
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),

  getCollaborators: protectedProcedure
    .input(z.object({
      projectId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      return { collaborators: [] };
    }),
});