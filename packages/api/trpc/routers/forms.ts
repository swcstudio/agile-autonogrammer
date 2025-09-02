import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';

const FieldSchema = z.object({
  id: z.string(),
  type: z.enum([
    'text', 'email', 'number', 'tel', 'url', 'password',
    'textarea', 'select', 'multiselect', 'checkbox', 'radio',
    'date', 'time', 'datetime', 'file', 'image', 'signature',
    'rating', 'slider', 'toggle', 'color', 'location', 'payment'
  ]),
  name: z.string(),
  label: z.string(),
  placeholder: z.string().optional(),
  defaultValue: z.any().optional(),
  required: z.boolean().default(false),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional(),
    custom: z.string().optional(),
    errorMessage: z.string().optional(),
  }).optional(),
  conditional: z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
    value: z.any(),
  }).optional(),
  options: z.array(z.object({
    label: z.string(),
    value: z.string(),
    disabled: z.boolean().optional(),
  })).optional(),
  layout: z.object({
    width: z.enum(['full', 'half', 'third', 'quarter']).default('full'),
    order: z.number(),
  }).optional(),
});

export const formsRouter = router({
  // Form Creation & Management
  createForm: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      fields: z.array(FieldSchema),
      settings: z.object({
        submitButtonText: z.string().default('Submit'),
        successMessage: z.string().default('Thank you for your submission!'),
        redirectUrl: z.string().optional(),
        requireAuth: z.boolean().default(false),
        captcha: z.boolean().default(true),
        saveProgress: z.boolean().default(false),
        multiStep: z.boolean().default(false),
        steps: z.array(z.object({
          title: z.string(),
          fields: z.array(z.string()),
        })).optional(),
      }).optional(),
      notifications: z.object({
        email: z.object({
          enabled: z.boolean(),
          to: z.array(z.string()),
          subject: z.string(),
          replyTo: z.string().optional(),
        }).optional(),
        slack: z.object({
          enabled: z.boolean(),
          webhook: z.string(),
        }).optional(),
        webhook: z.object({
          enabled: z.boolean(),
          url: z.string(),
          headers: z.record(z.string()).optional(),
        }).optional(),
      }).optional(),
      integrations: z.array(z.object({
        type: z.enum(['mailchimp', 'sendgrid', 'hubspot', 'salesforce', 'zapier', 'google_sheets']),
        config: z.record(z.any()),
      })).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { id: 'form-id', ...input };
    }),

  updateForm: protectedProcedure
    .input(z.object({
      id: z.string(),
      data: z.object({
        name: z.string().optional(),
        description: z.string().optional(),
        fields: z.array(FieldSchema).optional(),
        settings: z.any().optional(),
        notifications: z.any().optional(),
        integrations: z.any().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),

  deleteForm: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),

  getForm: publicProcedure
    .input(z.object({
      id: z.string().optional(),
      slug: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return { /* form data */ };
    }),

  listForms: protectedProcedure
    .input(z.object({
      page: z.number().default(1),
      limit: z.number().default(20),
      search: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      return { forms: [], total: 0 };
    }),

  duplicateForm: protectedProcedure
    .input(z.object({
      formId: z.string(),
      name: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { id: 'new-form-id' };
    }),

  // Form Submissions
  submitForm: publicProcedure
    .input(z.object({
      formId: z.string(),
      data: z.record(z.any()),
      recaptchaToken: z.string().optional(),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return {
        success: true,
        submissionId: 'submission-id',
        message: 'Form submitted successfully',
      };
    }),

  getSubmissions: protectedProcedure
    .input(z.object({
      formId: z.string(),
      status: z.enum(['pending', 'processed', 'spam', 'deleted']).optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      search: z.string().optional(),
      page: z.number().default(1),
      limit: z.number().default(50),
    }))
    .query(async ({ input, ctx }) => {
      return {
        submissions: [],
        total: 0,
        stats: {
          total: 0,
          today: 0,
          week: 0,
          month: 0,
        },
      };
    }),

  getSubmission: protectedProcedure
    .input(z.object({
      submissionId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      return { /* submission data */ };
    }),

  updateSubmissionStatus: protectedProcedure
    .input(z.object({
      submissionId: z.string(),
      status: z.enum(['pending', 'processed', 'spam', 'deleted']),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),

  exportSubmissions: protectedProcedure
    .input(z.object({
      formId: z.string(),
      format: z.enum(['csv', 'excel', 'json']),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return {
        downloadUrl: 'https://downloads.katalyst.io/submissions.csv',
        expiresAt: new Date(Date.now() + 3600000),
      };
    }),

  // Form Progress (for multi-step forms)
  saveProgress: publicProcedure
    .input(z.object({
      formId: z.string(),
      sessionId: z.string(),
      step: z.number(),
      data: z.record(z.any()),
    }))
    .mutation(async ({ input }) => {
      return { success: true };
    }),

  getProgress: publicProcedure
    .input(z.object({
      formId: z.string(),
      sessionId: z.string(),
    }))
    .query(async ({ input }) => {
      return {
        step: 1,
        data: {},
        completedSteps: [],
      };
    }),

  // Form Analytics
  getFormAnalytics: protectedProcedure
    .input(z.object({
      formId: z.string(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
    }))
    .query(async ({ input, ctx }) => {
      return {
        views: 0,
        submissions: 0,
        conversionRate: 0,
        avgCompletionTime: 0,
        fieldDropoff: {},
        deviceBreakdown: {
          desktop: 0,
          mobile: 0,
          tablet: 0,
        },
        topReferrers: [],
      };
    }),

  // Field Templates
  createFieldTemplate: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      field: FieldSchema,
      category: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { id: 'template-id', ...input };
    }),

  getFieldTemplates: protectedProcedure
    .input(z.object({
      category: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      return { templates: [] };
    }),

  // Form Templates
  createFormTemplate: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      category: z.string(),
      thumbnail: z.string().optional(),
      form: z.any(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { id: 'template-id', ...input };
    }),

  getFormTemplates: publicProcedure
    .input(z.object({
      category: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      return {
        templates: [
          {
            id: 'contact-form',
            name: 'Contact Form',
            category: 'general',
            description: 'Simple contact form',
            thumbnail: 'url',
            fields: 5,
          }
        ]
      };
    }),

  // Webhooks
  testWebhook: protectedProcedure
    .input(z.object({
      url: z.string(),
      method: z.enum(['GET', 'POST', 'PUT']).default('POST'),
      headers: z.record(z.string()).optional(),
      sampleData: z.record(z.any()),
    }))
    .mutation(async ({ input, ctx }) => {
      return {
        success: true,
        response: {},
        statusCode: 200,
      };
    }),

  // File Uploads
  getUploadUrl: publicProcedure
    .input(z.object({
      formId: z.string(),
      fieldId: z.string(),
      filename: z.string(),
      mimeType: z.string(),
      size: z.number(),
    }))
    .mutation(async ({ input }) => {
      return {
        uploadUrl: 'https://uploads.katalyst.io/presigned-url',
        fileId: 'file-id',
        expiresAt: new Date(Date.now() + 300000),
      };
    }),

  // Spam Protection
  reportSpam: protectedProcedure
    .input(z.object({
      submissionId: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return { success: true };
    }),

  getSpamStats: protectedProcedure
    .input(z.object({
      formId: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      return {
        totalSpam: 0,
        spamRate: 0,
        topSpamIndicators: [],
      };
    }),
});