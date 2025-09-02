/**
 * AI Chat Edge Function
 * Leverages Vercel AI SDK with streaming support
 */

import { OpenAIStream, StreamingTextResponse } from 'ai';
import { Configuration, OpenAIApi } from 'openai-edge';

export const config = {
  runtime: 'edge',
  regions: ['iad1'], // Close to OpenAI servers
};

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { messages, model = 'gpt-4-turbo-preview' } = await req.json();

    // Create chat completion with streaming
    const response = await openai.createChatCompletion({
      model,
      messages,
      temperature: 0.7,
      stream: true,
      max_tokens: 2000,
    });

    // Convert to stream
    const stream = OpenAIStream(response, {
      async onCompletion(completion) {
        // Log to analytics
        await logChatCompletion({
          model,
          completion,
          timestamp: new Date().toISOString(),
        });
      },
    });

    // Return streaming response
    return new StreamingTextResponse(stream, {
      headers: {
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('AI Chat Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

async function logChatCompletion(data: any) {
  // Log to Vercel Analytics or your preferred service
  if (process.env.VERCEL_ANALYTICS_ID) {
    // Implementation for analytics logging
  }
}
