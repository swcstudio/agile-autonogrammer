import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

export const aiRouter = router({
  // Chat completion
  chat: protectedProcedure
    .input(
      z.object({
        messages: z.array(chatMessageSchema),
        model: z.enum(['gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo']).default('gpt-4-turbo-preview'),
        temperature: z.number().min(0).max(2).default(0.7),
        maxTokens: z.number().min(1).max(4000).default(2000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Call OpenAI API
      if (!process.env.OPENAI_API_KEY) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'OpenAI API key not configured',
        });
      }

      // Mock response for now
      return {
        id: `chat-${Date.now()}`,
        object: 'chat.completion',
        created: Date.now(),
        model: input.model,
        choices: [{
          index: 0,
          message: {
            role: 'assistant' as const,
            content: 'This is a mock response. Integrate with OpenAI API for real responses.',
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150,
        },
      };
    }),

  // Generate text
  generateText: protectedProcedure
    .input(
      z.object({
        prompt: z.string().min(1),
        type: z.enum(['marketing', 'blog', 'email', 'product-description']),
        tone: z.enum(['professional', 'casual', 'friendly', 'formal']).default('professional'),
        length: z.enum(['short', 'medium', 'long']).default('medium'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate text based on type and parameters
      const lengthMap = {
        short: 50,
        medium: 150,
        long: 300,
      };

      return {
        text: `Generated ${input.type} content with ${input.tone} tone. Based on: "${input.prompt}". This would be approximately ${lengthMap[input.length]} words.`,
        metadata: {
          type: input.type,
          tone: input.tone,
          length: input.length,
          generatedAt: new Date(),
        },
      };
    }),

  // Analyze sentiment
  analyzeSentiment: publicProcedure
    .input(
      z.object({
        text: z.string().min(1).max(5000),
      })
    )
    .query(async ({ input }) => {
      // Mock sentiment analysis
      const sentiments = ['positive', 'negative', 'neutral', 'mixed'];
      const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
      
      return {
        sentiment,
        score: Math.random(),
        confidence: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
        emotions: {
          joy: Math.random(),
          sadness: Math.random(),
          anger: Math.random(),
          fear: Math.random(),
          surprise: Math.random(),
        },
      };
    }),

  // Generate image prompt
  generateImagePrompt: protectedProcedure
    .input(
      z.object({
        description: z.string().min(1),
        style: z.enum(['realistic', 'artistic', 'cartoon', 'abstract']).default('realistic'),
        mood: z.enum(['bright', 'dark', 'colorful', 'monochrome']).default('bright'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate optimized prompt for image generation
      const prompt = `${input.description}, ${input.style} style, ${input.mood} mood, high quality, detailed`;
      
      return {
        prompt,
        negativePrompt: 'low quality, blurry, distorted, ugly',
        parameters: {
          steps: 30,
          cfg_scale: 7.5,
          width: 512,
          height: 512,
        },
      };
    }),
});