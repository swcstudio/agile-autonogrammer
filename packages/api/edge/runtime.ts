/**
 * Vercel Edge Runtime Configuration
 * Optimized for global performance with Vercel Pro features
 */

import { geolocation, ipAddress } from '@vercel/edge';
import type { RequestContext } from '@vercel/edge';

export const config = {
  runtime: 'edge',
  regions: ['iad1', 'sfo1', 'cdg1', 'hnd1'], // Multi-region deployment
};

// Edge middleware for performance optimization
export async function middleware(request: Request, context: RequestContext) {
  // Get user location and IP
  const geo = geolocation(request);
  const ip = ipAddress(request);

  // Performance headers
  const headers = new Headers({
    'x-user-country': geo?.country || 'unknown',
    'x-user-city': geo?.city || 'unknown',
    'x-user-ip': ip || 'unknown',
    'x-edge-region': process.env.VERCEL_REGION || 'unknown',
    'x-request-id': crypto.randomUUID(),
  });

  // A/B testing with Edge Config
  const testGroup = await getABTestGroup(request);
  headers.set('x-test-group', testGroup);

  // Rate limiting
  const rateLimitResult = await checkRateLimit(ip || 'anonymous');
  if (!rateLimitResult.allowed) {
    return new Response('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': rateLimitResult.retryAfter.toString(),
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
      },
    });
  }

  return headers;
}

// A/B testing logic
async function getABTestGroup(request: Request): Promise<string> {
  const cookie = request.headers.get('cookie');
  const existingGroup = cookie?.match(/ab-group=([^;]+)/)?.[1];

  if (existingGroup) {
    return existingGroup;
  }

  // Assign new group
  const group = Math.random() < 0.5 ? 'control' : 'variant';
  return group;
}

// Rate limiting with Edge KV
async function checkRateLimit(identifier: string): Promise<{
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter: number;
}> {
  const limit = 100; // 100 requests per minute
  const window = 60 * 1000; // 1 minute

  const key = `rate-limit:${identifier}`;
  const now = Date.now();

  // In production, use Vercel KV or Redis
  // This is a simplified example
  return {
    allowed: true,
    limit,
    remaining: limit,
    reset: now + window,
    retryAfter: 0,
  };
}
