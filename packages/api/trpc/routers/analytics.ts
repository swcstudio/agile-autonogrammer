import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';

const dateRangeSchema = z.object({
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
});

export const analyticsRouter = router({
  // Get page views
  pageViews: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
        groupBy: z.enum(['day', 'week', 'month']).default('day'),
      })
    )
    .query(async ({ ctx, input }) => {
      // Fetch analytics data
      const mockData = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
        views: Math.floor(Math.random() * 1000) + 100,
        uniqueVisitors: Math.floor(Math.random() * 500) + 50,
      }));

      return {
        data: mockData,
        total: mockData.reduce((sum, d) => sum + d.views, 0),
        uniqueTotal: mockData.reduce((sum, d) => sum + d.uniqueVisitors, 0),
      };
    }),

  // Get user engagement metrics
  engagement: protectedProcedure
    .input(dateRangeSchema)
    .query(async ({ ctx, input }) => {
      return {
        averageSessionDuration: 245, // seconds
        bounceRate: 0.42,
        pagePerSession: 3.2,
        newUsers: 156,
        returningUsers: 89,
      };
    }),

  // Get conversion metrics
  conversions: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
        conversionType: z.enum(['signup', 'purchase', 'download', 'contact']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const types = input.conversionType 
        ? [input.conversionType] 
        : ['signup', 'purchase', 'download', 'contact'];

      const data = types.map(type => ({
        type,
        count: Math.floor(Math.random() * 100) + 10,
        rate: Math.random() * 0.1 + 0.01, // 1% to 11%
        value: type === 'purchase' ? Math.floor(Math.random() * 10000) + 1000 : null,
      }));

      return {
        conversions: data,
        totalConversions: data.reduce((sum, d) => sum + d.count, 0),
        totalValue: data.reduce((sum, d) => sum + (d.value || 0), 0),
      };
    }),

  // Get real-time active users
  activeUsers: publicProcedure.query(async () => {
    return {
      current: Math.floor(Math.random() * 50) + 10,
      lastHour: Math.floor(Math.random() * 200) + 50,
      last24Hours: Math.floor(Math.random() * 1000) + 200,
      byPage: [
        { page: '/', users: Math.floor(Math.random() * 20) + 5 },
        { page: '/blog', users: Math.floor(Math.random() * 15) + 3 },
        { page: '/products', users: Math.floor(Math.random() * 10) + 2 },
      ],
    };
  }),

  // Track custom event
  trackEvent: publicProcedure
    .input(
      z.object({
        eventName: z.string(),
        eventData: z.record(z.any()).optional(),
        userId: z.string().optional(),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Log event to analytics service
      console.log('Tracking event:', input);
      
      return {
        success: true,
        eventId: `event-${Date.now()}`,
        timestamp: new Date(),
      };
    }),

  // Get top content
  topContent: protectedProcedure
    .input(
      z.object({
        dateRange: dateRangeSchema,
        limit: z.number().min(1).max(50).default(10),
        contentType: z.enum(['posts', 'products', 'pages']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const mockContent = Array.from({ length: input.limit }, (_, i) => ({
        id: `content-${i}`,
        title: `Popular Content ${i + 1}`,
        type: input.contentType || 'posts',
        views: Math.floor(Math.random() * 5000) + 100,
        engagement: Math.random() * 0.5 + 0.1,
        conversionRate: Math.random() * 0.1,
      }));

      return {
        content: mockContent.sort((a, b) => b.views - a.views),
      };
    }),
});